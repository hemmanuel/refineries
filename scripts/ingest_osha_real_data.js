import fs from 'fs';
import path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import Papa from 'papaparse';
import { fileURLToPath } from 'url';
import levenshtein from 'fast-levenshtein';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FACILITIES_FILE = path.join(__dirname, '../src/data/facilities.json');
const TEMP_DIR = path.join(__dirname, '../src/data/raw_osha');

// OSHA ITA Data URLs
const DATA_URLS = [
  { year: 2024, url: 'https://www.osha.gov/sites/default/files/ITA_300A_Summary_Data_2024_through_08-31-2025.zip' },
  { year: 2023, url: 'https://www.osha.gov/sites/default/files/ITA_300A_Summary_Data_2023_through_12-31-2024.zip' },
  { year: 2022, url: 'https://www.osha.gov/sites/default/files/ITA-data-cy2022.zip' },
  { year: 2021, url: 'https://www.osha.gov/sites/default/files/ITA-data-cy2021.zip' },
  { year: 2020, url: 'https://www.osha.gov/sites/default/files/ITA-Data-CY-2020.zip' },
  { year: 2019, url: 'https://www.osha.gov/sites/default/files/ITA%20Data%20CY%202019.zip' },
  { year: 2018, url: 'https://www.osha.gov/sites/default/files/ITA%20Data%20CY%202018.zip' },
  { year: 2017, url: 'https://www.osha.gov/sites/default/files/ITA%20Data%20CY%202017.zip' },
  { year: 2016, url: 'https://www.osha.gov/sites/default/files/ITA%20Data%20CY%202016.zip' }
];

const STATE_TO_ABBR = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
    'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
    'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
    'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
    'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
    'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
    'District of Columbia': 'DC'
};

// Ensure temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const downloadFile = async (url, dest) => {
  const writer = fs.createWriteStream(dest);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

const processYear = async (yearUrl) => {
  const { year, url } = yearUrl;
  const zipPath = path.join(TEMP_DIR, `osha_${year}.zip`);
  
  if (!fs.existsSync(zipPath)) {
      console.log(`Downloading OSHA data for ${year}...`);
      try {
        await downloadFile(url, zipPath);
      } catch (e) {
        console.error(`Failed to download ${year} data:`, e.message);
        return [];
      }
  } else {
      console.log(`Using cached OSHA data for ${year}...`);
  }

  console.log(`Extracting ${year}...`);
  const zip = new AdmZip(zipPath);
  const zipEntries = zip.getEntries();
  
  let records = [];

  for (const entry of zipEntries) {
    if (entry.entryName.endsWith('.csv')) {
      const csvText = zip.readAsText(entry);
      const result = Papa.parse(csvText, { header: true, skipEmptyLines: true });
      
      const yearRecords = result.data.filter(row => {
        const naics = row.naics_code || row.NAICS_CODE;
        return naics && String(naics).startsWith('32411');
      }).map(row => {
        const normalized = {};
        Object.keys(row).forEach(key => {
          normalized[key.toLowerCase()] = row[key];
        });
        return { ...normalized, year };
      });

      records = records.concat(yearRecords);
    }
  }

  return records;
};

const calculateMetrics = (record) => {
  let hours = parseFloat(record.total_hours_worked) || 0;

  // Manual fix for United Refining Co - Warren (2020)
  // Raw data shows 14,177,660 hours which is impossible (~19k hours/employee)
  // Shifting decimal one place gives ~1.4M hours which aligns with other years
  if (record.year === 2020 && 
      record.establishment_name === 'United Refining Company' && 
      record.city === 'Warren' && 
      record.state === 'PA' && 
      hours > 10000000) {
      console.log('  [Fix] Correcting United Refining 2020 hours (14.1M -> 1.4M)');
      hours = hours / 10;
  }

  const deaths = parseFloat(record.total_deaths) || 0;
  const dafw = parseFloat(record.total_dafw_cases) || 0;
  const djtr = parseFloat(record.total_djtr_cases) || 0;
  const other = parseFloat(record.total_other_cases) || 0;
  
  const totalRecordable = deaths + dafw + djtr + other;
  
  const trir = hours > 0 ? (totalRecordable * 200000) / hours : 0;
  const dart = hours > 0 ? ((dafw + djtr) * 200000) / hours : 0;

  return {
    year: record.year,
    recordableInjuries: totalRecordable,
    trir: parseFloat(trir.toFixed(2)),
    dart: parseFloat(dart.toFixed(2)),
    hoursWorked: hours,
    deaths: deaths,
    dafw: dafw, // Days Away From Work
    djtr: djtr, // Days of Job Transfer or Restriction
    other: other, // Other Recordable Cases
    hearingLoss: parseFloat(record.total_hearing_loss) || 0,
    poisonings: parseFloat(record.total_poisonings) || 0,
    respiratory: parseFloat(record.total_respiratory_conditions) || 0,
    skinDisorders: parseFloat(record.total_skin_disorders) || 0,
    otherIllnesses: parseFloat(record.total_other_illnesses) || 0,
    notes: "Official OSHA Data"
  };
};

const findMatch = (facility, oshaRecords) => {
  const facilityStateAbbr = STATE_TO_ABBR[facility.state];
  if (!facilityStateAbbr) return [];

  // Filter by State (using abbreviation)
  const stateMatches = oshaRecords.filter(r => 
    r.state && r.state.toUpperCase() === facilityStateAbbr
  );

  if (stateMatches.length === 0) return [];

  // Try to match by City
  let cityMatches = stateMatches.filter(r => 
    r.city && facility.city && (
        r.city.toLowerCase().trim() === facility.city.toLowerCase().trim() ||
        r.city.toLowerCase().includes(facility.city.toLowerCase().trim()) ||
        facility.city.toLowerCase().includes(r.city.toLowerCase().trim())
    )
  );

  const candidates = cityMatches.length > 0 ? cityMatches : stateMatches;

  const facilityNameLower = facility.name.toLowerCase();
  const companyNameLower = facility.company.toLowerCase();

  const bestMatches = [];

  candidates.forEach(record => {
    const recordName = (record.establishment_name || '').toLowerCase();
    const recordCompany = (record.company_name || '').toLowerCase();
    
    let score = 0;

    // Direct company match
    if (recordCompany.includes(companyNameLower) || recordName.includes(companyNameLower)) {
      score += 50;
    }
    
    // Facility Name match (e.g. "Benicia")
    if (facility.city && recordName.includes(facility.city.toLowerCase())) {
      score += 30;
    }

    // Levenshtein
    const distance = levenshtein.get(facilityNameLower, recordName);
    const maxLength = Math.max(facilityNameLower.length, recordName.length);
    const similarity = 1 - (distance / maxLength);
    
    if (similarity > 0.4) {
      score += (similarity * 40);
    }

    // Lower threshold slightly to catch more
    if (score > 50) { 
      bestMatches.push(record);
    }
  });

  return bestMatches;
};

const main = async () => {
  console.log("Starting OSHA Data Ingestion...");
  
  const facilities = JSON.parse(fs.readFileSync(FACILITIES_FILE, 'utf8'));
  console.log(`Loaded ${facilities.length} facilities.`);

  let allOshaRecords = [];
  for (const yearUrl of DATA_URLS) {
    const records = await processYear(yearUrl);
    console.log(`  Found ${records.length} refinery records for ${yearUrl.year}.`);
    allOshaRecords = allOshaRecords.concat(records);
  }
  console.log(`Total OSHA refinery records found: ${allOshaRecords.length}`);

  let matchedCount = 0;
  const updatedFacilities = facilities.map(facility => {
    const matches = findMatch(facility, allOshaRecords);
    
    if (matches.length > 0) {
      matchedCount++;
      
      const history = matches.map(calculateMetrics)
        .sort((a, b) => b.year - a.year);

      const uniqueHistory = [];
      const seenYears = new Set();
      for (const rec of history) {
        if (!seenYears.has(rec.year)) {
          uniqueHistory.push(rec);
          seenYears.add(rec.year);
        } else {
            const existing = uniqueHistory.find(h => h.year === rec.year);
            if (rec.hoursWorked > existing.hoursWorked) {
                Object.assign(existing, rec);
            }
        }
      }

      const latest = uniqueHistory[0];
      const avgTrir = uniqueHistory.reduce((sum, r) => sum + r.trir, 0) / uniqueHistory.length;
      let summary = `Official OSHA data available for ${uniqueHistory.length} years. `;
      summary += `Latest TRIR (${latest.year}): ${latest.trir} (Industry Avg: ~0.6). `;
      summary += `Average TRIR: ${avgTrir.toFixed(2)}. `;
      if (latest.trir === 0 && latest.hoursWorked > 0) summary += "Zero recordable incidents in latest reporting year.";

      return {
        ...facility,
        oshaHistory: uniqueHistory,
        safetySummary: summary,
        hasRealOshaData: true
      };
    }
    
    return facility;
  });

  console.log(`Matched real OSHA data for ${matchedCount} out of ${facilities.length} facilities.`);

  fs.writeFileSync(FACILITIES_FILE, JSON.stringify(updatedFacilities, null, 2));
  console.log("Facilities data updated successfully.");

  // Cleanup temp dir - DISABLED to preserve raw data
  // fs.rmSync(TEMP_DIR, { recursive: true, force: true });
};

main().catch(console.error);
