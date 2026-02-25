import fs from 'fs';
import path from 'path';
import axios from 'axios';
import Papa from 'papaparse';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const CSV_URL = 'https://raw.githubusercontent.com/cpreid2/US-Refineries/master/Refineries_US.csv';
const EIA_FILE = path.join(__dirname, '../src/data/parsed_eia_data.json');
const PETRO_FILE = path.join(__dirname, '../src/data/petrochemicals.json');
const OUTPUT_FILE = path.join(__dirname, '../src/data/facilities.json');

const STATE_TO_PADD = {
  'Connecticut': 1, 'Delaware': 1, 'District of Columbia': 1, 'Florida': 1, 'Georgia': 1, 
  'Maine': 1, 'Maryland': 1, 'Massachusetts': 1, 'New Hampshire': 1, 'New Jersey': 1, 
  'New York': 1, 'North Carolina': 1, 'Pennsylvania': 1, 'Rhode Island': 1, 'South Carolina': 1, 
  'Vermont': 1, 'Virginia': 1, 'West Virginia': 1,
  'Illinois': 2, 'Indiana': 2, 'Iowa': 2, 'Kansas': 2, 'Kentucky': 2, 'Michigan': 2, 
  'Minnesota': 2, 'Missouri': 2, 'Nebraska': 2, 'North Dakota': 2, 'Ohio': 2, 'Oklahoma': 2, 
  'South Dakota': 2, 'Tennessee': 2, 'Wisconsin': 2,
  'Alabama': 3, 'Arkansas': 3, 'Louisiana': 3, 'Mississippi': 3, 'New Mexico': 3, 'Texas': 3,
  'Colorado': 4, 'Idaho': 4, 'Montana': 4, 'Utah': 4, 'Wyoming': 4,
  'Alaska': 5, 'Arizona': 5, 'California': 5, 'Hawaii': 5, 'Nevada': 5, 'Oregon': 5, 'Washington': 5
};

// Fallback coordinates for states (approximate centers)
const STATE_COORDS = {
    'Alabama': [32.806671, -86.791130], 'Alaska': [61.370716, -152.404419], 'Arizona': [33.729759, -111.431221],
    'Arkansas': [34.969704, -92.373123], 'California': [36.116203, -119.681564], 'Colorado': [39.059811, -105.311104],
    'Connecticut': [41.597782, -72.755371], 'Delaware': [39.318523, -75.507141], 'Florida': [27.766279, -81.686783],
    'Georgia': [33.040619, -83.643074], 'Hawaii': [21.094318, -157.498337], 'Idaho': [44.240459, -114.478828],
    'Illinois': [40.349457, -88.986137], 'Indiana': [39.849426, -86.258278], 'Iowa': [42.011539, -93.210526],
    'Kansas': [38.526600, -96.726486], 'Kentucky': [37.668140, -84.670067], 'Louisiana': [31.169546, -91.867805],
    'Maine': [44.693947, -69.381927], 'Maryland': [39.063946, -76.802101], 'Massachusetts': [42.230171, -71.530106],
    'Michigan': [43.326618, -84.536095], 'Minnesota': [45.694454, -93.900192], 'Mississippi': [32.741646, -89.678696],
    'Missouri': [38.456085, -92.288368], 'Montana': [46.921925, -110.454353], 'Nebraska': [41.125370, -98.268082],
    'Nevada': [38.313515, -117.055374], 'New Hampshire': [43.452492, -71.563896], 'New Jersey': [40.298904, -74.521011],
    'New Mexico': [34.840515, -106.248482], 'New York': [42.165726, -74.948051], 'North Carolina': [35.630066, -79.806419],
    'North Dakota': [47.528912, -99.784012], 'Ohio': [40.388783, -82.764915], 'Oklahoma': [35.565342, -96.928917],
    'Oregon': [44.572021, -122.070938], 'Pennsylvania': [40.590752, -77.209755], 'Rhode Island': [41.680893, -71.511780],
    'South Carolina': [33.856892, -80.945007], 'South Dakota': [44.299782, -99.438828], 'Tennessee': [35.747845, -86.692345],
    'Texas': [31.054487, -97.563461], 'Utah': [40.150032, -111.862434], 'Vermont': [44.045876, -72.710686],
    'Virginia': [37.769337, -78.169968], 'Washington': [47.400902, -121.490494], 'West Virginia': [38.491226, -80.954456],
    'Wisconsin': [44.268543, -89.616508], 'Wyoming': [42.755966, -107.302490]
};

const normalizeCompanyName = (name) => {
  const n = name.toLowerCase();
  
  // Marathon Petroleum
  if (n.includes('marathon') || 
      n.includes('western refining') || 
      n.includes('tesoro') || 
      n.includes('st paul park') || 
      n.includes('galveston bay')) return 'Marathon Petroleum';

  // Valero
  if (n.includes('valero') || 
      n.includes('diamond shamrock') || 
      n.includes('ultramar') || 
      n.includes('premcor')) return 'Valero';

  // PBF Energy
  if (n.includes('pbf') || 
      n.includes('chalmette') || 
      n.includes('paulsboro') || 
      n.includes('delaware city') || 
      n.includes('torrance') || 
      n.includes('martinez') || 
      n.includes('toledo refining')) return 'PBF Energy';

  // Phillips 66
  if (n.includes('phillips 66') || 
      n.includes('wrb refining') || 
      n.includes('excel paralubes')) return 'Phillips 66';

  // Chevron
  if (n.includes('chevron') || 
      n.includes('pasadena refining')) return 'Chevron';

  // ExxonMobil
  if (n.includes('exxon')) return 'ExxonMobil';

  // Shell
  if (n.includes('shell')) return 'Shell';

  // Citgo
  if (n.includes('citgo') || 
      n.includes('pdv midwest')) return 'Citgo';

  // HF Sinclair (Sinclair + HollyFrontier)
  if (n.includes('hf sinclair') || 
      n.includes('sinclair') || 
      n.includes('hollyfrontier')) return 'HF Sinclair';

  // Cenovus Energy
  if (n.includes('cenovus') || 
      n.includes('lima refining') || 
      n.includes('superior refining') || 
      n.includes('ohio refining')) return 'Cenovus Energy';

  // Delek US
  if (n.includes('delek') || 
      n.includes('alon') || 
      n.includes('lion oil')) return 'Delek US';

  // Par Pacific
  if (n.includes('par pacific') || 
      n.includes('par hawaii') || 
      n.includes('par montana') || 
      n.includes('us oil & refining') || 
      n.includes('wyoming refining')) return 'Par Pacific';

  // LyondellBasell
  if (n.includes('lyondell') || 
      n.includes('houston refining') || 
      n.includes('equistar')) return 'LyondellBasell';

  // CHS Inc
  if (n.includes('cenex') || 
      n.includes('chs ')) return 'CHS Inc';

  // BP
  if (n.includes('bp products') || 
      n.includes('bp west')) return 'BP';

  // Motiva
  if (n.includes('motiva')) return 'Motiva Enterprises';

  // TotalEnergies
  if (n.includes('totalenergies')) return 'TotalEnergies';

  // Flint Hills
  if (n.includes('flint hills')) return 'Flint Hills Resources';

  // Delta Air Lines
  if (n.includes('delta') || 
      n.includes('monroe energy')) return 'Delta Air Lines (Monroe)';

  // Calumet
  if (n.includes('calumet')) return 'Calumet Specialty';

  // Hunt
  if (n.includes('hunt')) return 'Hunt Refining';

  // Ergon
  if (n.includes('ergon')) return 'Ergon';

  // CVR Energy
  if (n.includes('cvr refining')) return 'CVR Energy';

  // Pemex
  if (n.includes('deer park')) return 'Pemex';

  // United Refining
  if (n.includes('united refining')) return 'United Refining';

  // American Refining Group
  if (n.includes('american refining')) return 'American Refining Group';

  // Vertex Energy
  if (n.includes('vertex')) return 'Vertex Energy';

  // World Oil Corp
  if (n.includes('lunday thagard')) return 'World Oil Corp';

  // Kern Oil
  if (n.includes('kern oil')) return 'Kern Oil';

  // San Joaquin
  if (n.includes('san joaquin')) return 'San Joaquin Refining';

  // Hilcorp
  if (n.includes('hilcorp')) return 'Hilcorp';

  // ConocoPhillips
  if (n.includes('conocophillips')) return 'ConocoPhillips';

  // Placid
  if (n.includes('placid')) return 'Placid Refining';

  // Calcasieu
  if (n.includes('calcasieu')) return 'Calcasieu Refining';

  // Kinder Morgan
  if (n.includes('kinder morgan')) return 'Kinder Morgan';

  // Buckeye Partners
  if (n.includes('buckeye')) return 'Buckeye Partners';

  // Magellan
  if (n.includes('magellan')) return 'Magellan Midstream';

  // Targa
  if (n.includes('targa')) return 'Targa Resources';

  // Trecora
  if (n.includes('trecora')) return 'Trecora';

  // Petro Star
  if (n.includes('petro star')) return 'ASRC (Petro Star)';

  // Suncor
  if (n.includes('suncor')) return 'Suncor Energy';

  // Hartree
  if (n.includes('hartree')) return 'Hartree Partners';

  // Texas International Terminals
  if (n.includes('texas international')) return 'Texas International Terminals';

  // Petromax
  if (n.includes('petromax')) return 'Petromax';

  // San Antonio
  if (n.includes('san antonio')) return 'Starlight (San Antonio)';

  // Lazarus
  if (n.includes('lazarus')) return 'Lazarus Energy';

  // Foreland
  if (n.includes('foreland')) return 'Foreland Refining';

  // Talley
  if (n.includes('talley')) return 'Talley Asphalt';

  // Goodway
  if (n.includes('goodway')) return 'Goodway Refining';

  // Cross Oil
  if (n.includes('cross oil')) return 'Cross Oil';

  return name;
};

const getMockEstimate = (facility) => {
  // Heuristic for Oil Refineries
  if (facility.type === 'Oil Refinery') {
    const baseHeadcount = Math.round(Math.pow(facility.capacity, 0.65) * 0.8);
    const turnaround = Math.round(baseHeadcount * (2 + Math.random() * 2));
    const safety = Math.round(baseHeadcount * 0.7);
    return {
      totalHeadcount: baseHeadcount,
      turnaroundHeadcount: turnaround,
      safetySensitive: safety,
      confidence: 0.7,
      reasoning: "Estimated using refinery capacity-based heuristics (Mock Data)",
      explanations: {
        totalHeadcount: "Based on standard industry multiplier for refinery capacity.",
        turnaroundHeadcount: "Typically 2-3x base headcount during peak maintenance.",
        safetySensitive: "Approximately 70% of workforce is in safety-sensitive roles."
      }
    };
  } 
  // Heuristic for Petrochemical Plants (Capacity in mtpa)
  else {
    // 1 mtpa ethylene cracker approx 300-500 FTEs
    const baseHeadcount = Math.round((facility.capacity / 1000000) * 400); 
    const turnaround = Math.round(baseHeadcount * 3); // Crackers have huge turnarounds
    const safety = Math.round(baseHeadcount * 0.6);
    return {
      totalHeadcount: baseHeadcount,
      turnaroundHeadcount: turnaround,
      safetySensitive: safety,
      confidence: 0.6,
      reasoning: "Estimated using petrochemical capacity-based heuristics (Mock Data)",
      explanations: {
        totalHeadcount: "Based on standard industry multiplier for petrochemical capacity.",
        turnaroundHeadcount: "Crackers require significant manpower during turnarounds.",
        safetySensitive: "Approximately 60% of workforce is in safety-sensitive roles."
      }
    };
  }
};

const getLLMEstimate = async (facility) => {
  if (!API_KEY) {
    console.warn("No API key found, using mock data.");
    return getMockEstimate(facility);
  }

  try {
    const prompt = `
      Estimate the workforce metrics for the following ${facility.type}:
      Name: ${facility.name}
      Company: ${facility.company}
      Location: ${facility.city}, ${facility.state}
      Capacity: ${facility.capacity.toLocaleString()} ${facility.capacityUnit || 'bpd'}
      PADD Region: ${facility.padd}
      
      Please provide the following estimates based on industry standards and the facility's size/complexity:
      1. Total Headcount (Full-time employees + long-term contractors)
      2. Turnaround Headcount (Peak number of additional workers during major maintenance/turnarounds)
      3. Safety Sensitive Headcount (Number of workers in safety-critical roles)
      4. Confidence Score (0.0 to 1.0)
      
      For the explanations, you MUST include concrete derived metrics to justify the numbers, AND provide context.
      
      For "totalHeadcount":
      - Explicitly state the "Personnel per 1,000 bpd" ratio you are using (e.g., "Using a ratio of ~3.5 personnel per 1,000 bpd...").
      - Explain why this specific ratio applies to this refinery (e.g., complexity, location, age).
      - Provide context on the operational model (e.g., lean vs full-service).
      
      For "turnaroundHeadcount":
      - State the multiplier relative to total headcount or capacity (e.g., "Approximately 1.5x the steady-state workforce...").
      - Mention specific trades or tasks driving this number.
      - Explain the typical turnaround cycle or scope for this type of facility.
      
      For "safetySensitive":
      - State the percentage of the total workforce (e.g., "Estimated at 60% of total headcount...").
      - List the key roles included.
      - Explain why this percentage is appropriate given the refinery's risk profile.

      Return the response in strict JSON format:
      {
        "totalHeadcount": number,
        "turnaroundHeadcount": number,
        "safetySensitive": number,
        "confidence": number,
        "reasoning": "brief overall summary",
        "explanations": {
            "totalHeadcount": "explanation with concrete ratio and context",
            "turnaroundHeadcount": "explanation with concrete multiplier and context",
            "safetySensitive": "explanation with concrete percentage and context"
        }
      }
    `;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        contents: [{
          parts: [{
            text: "You are an expert in the oil and gas and petrochemical industry, specifically in operations and workforce planning. You always return valid JSON.\n" + prompt
          }]
        }],
        generationConfig: {
            responseMimeType: "application/json"
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.candidates[0].content.parts[0].text;
      try {
        const parsed = JSON.parse(content);
        // Ensure explanations object exists even if LLM forgets it
        if (!parsed.explanations) {
            parsed.explanations = {
                totalHeadcount: parsed.reasoning || "Estimate based on capacity.",
                turnaroundHeadcount: parsed.reasoning || "Estimate based on capacity.",
                safetySensitive: parsed.reasoning || "Estimate based on capacity."
            };
        }
        return parsed;
    } catch (e) {
        console.error("Failed to parse JSON from LLM:", content);
        return getMockEstimate(facility);
    }

  } catch (error) {
    console.error(`Error fetching estimate for ${facility.name}:`, error.message);
    if (error.response) {
        console.error("Response data:", error.response.data);
    }
    return getMockEstimate(facility);
  }
};


const main = async () => {
  console.log("Loading EIA 2025 Refinery Data...");
  let eiaRefineries = [];
  if (fs.existsSync(EIA_FILE)) {
    eiaRefineries = JSON.parse(fs.readFileSync(EIA_FILE, 'utf8'));
    console.log(`Loaded ${eiaRefineries.length} refineries from EIA data.`);
  } else {
    console.error(`EIA data file not found at ${EIA_FILE}. Please run the parser script first.`);
    process.exit(1);
  }

  console.log("Fetching CSV data for coordinates...");
  const response = await axios.get(CSV_URL);
  const csvData = response.data;
  const parsedCsv = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  const csvRows = parsedCsv.data.filter(row => row.lat && row.lng);
  console.log(`Loaded ${csvRows.length} rows from CSV.`);

  console.log("Merging data...");
  const mergedRefineries = eiaRefineries.map((eia, index) => {
    // Find best match in CSV
    let match = null;
    
    // 1. Filter by State
    const stateRows = csvRows.filter(row => row[""].endsWith(eia.state));
    
    // 2. Try to match City (if available in CSV row name or we can infer it)
    // The CSV name is like "Chevron El Segundo California".
    // EIA city is "El Segundo".
    // Check if CSV name contains EIA city.
    match = stateRows.find(row => row[""].toLowerCase().includes(eia.city.toLowerCase()));
    
    // 3. If no match by city, try Company
    if (!match) {
        const companyKeyword = eia.company.split(' ')[0].toLowerCase(); // e.g. "Chevron"
        match = stateRows.find(row => row[""].toLowerCase().includes(companyKeyword));
    }

    let lat = 0;
    let lng = 0;

    if (match) {
        lat = parseFloat(match.lat);
        lng = parseFloat(match.lng);
    } else {
        // Use State Center
        if (STATE_COORDS[eia.state]) {
            lat = STATE_COORDS[eia.state][0];
            lng = STATE_COORDS[eia.state][1];
            // Add a small random jitter to avoid exact overlap if multiple unlocated refineries in same state
            lat += (Math.random() - 0.5) * 0.1;
            lng += (Math.random() - 0.5) * 0.1;
        } else {
            console.warn(`No coordinates found for ${eia.name} in ${eia.state}`);
        }
    }

    return {
        id: `refinery-eia-${index}`,
        name: eia.name, // Use company name as facility name
        state: eia.state,
        city: eia.city,
        padd: STATE_TO_PADD[eia.state] || 0,
        company: normalizeCompanyName(eia.company),
        capacity: eia.capacity,
        capacityUnit: 'bpd',
        lat: lat,
        lng: lng,
        type: 'Oil Refinery'
    };
  });

  console.log(`Merged ${mergedRefineries.length} oil refineries.`);

  console.log("Reading Petrochemical data...");
  let petrochemicals = [];
  if (fs.existsSync(PETRO_FILE)) {
    const petroData = fs.readFileSync(PETRO_FILE, 'utf8');
    petrochemicals = JSON.parse(petroData).map((p, i) => ({
      ...p,
      id: `petro-${i}`,
      type: 'Petrochemical Plant'
    }));
    console.log(`Found ${petrochemicals.length} petrochemical plants.`);
  } else {
    console.warn("Petrochemical data file not found.");
  }

  const allFacilities = [...mergedRefineries, ...petrochemicals];
  console.log(`Total facilities to hydrate: ${allFacilities.length}`);

  const hydratedFacilities = [];
  // Process in batches to avoid rate limits
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < allFacilities.length; i += BATCH_SIZE) {
    const batch = allFacilities.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${i / BATCH_SIZE + 1} of ${Math.ceil(allFacilities.length / BATCH_SIZE)}...`);
    
    const promises = batch.map(async (facility) => {
      const estimate = await getLLMEstimate(facility);
      return { ...facility, estimate };
    });

    const results = await Promise.all(promises);
    hydratedFacilities.push(...results);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Ensure output directory exists
  const outputDir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(hydratedFacilities, null, 2));
  console.log(`Successfully hydrated ${hydratedFacilities.length} facilities and saved to ${OUTPUT_FILE}`);
};

main().catch(console.error);
