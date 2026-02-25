import fs from 'fs';
import path from 'path';
import axios from 'axios';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
const FACILITIES_FILE = path.join(__dirname, '../src/data/facilities.json');

const getOshaData = async (facility) => {
  if (!API_KEY) {
    console.warn("No API key found, skipping OSHA data fetch.");
    return null;
  }

  try {
    const prompt = `
      You are an expert in industrial safety and OSHA compliance for the US oil and gas industry.
      
      For the following facility:
      Name: ${facility.name}
      Company: ${facility.company}
      Location: ${facility.city}, ${facility.state}
      Type: ${facility.type}
      
      Please provide an ESTIMATE of the OSHA Recordable Injuries for the past 10 years (2015-2024).
      If exact public data is not available, provide a REALISTIC ESTIMATE based on:
      1. The facility's capacity and estimated headcount.
      2. Industry average TRIR (Total Recordable Incident Rate) for refineries (typically 0.4 - 0.9).
      3. Any known major incidents at this specific facility.
      
      Return the response in strict JSON format:
      {
        "oshaHistory": [
          { "year": 2024, "recordableInjuries": number, "trir": number, "notes": "brief note or 'Estimated'" },
          { "year": 2023, "recordableInjuries": number, "trir": number, "notes": "brief note or 'Estimated'" },
          ... (for all years back to 2015)
        ],
        "summary": "A brief 1-2 sentence summary of the facility's safety performance trend."
      }
    `;

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
      {
        contents: [{
          parts: [{
            text: "You are a safety data analyst. You always return valid JSON.\n" + prompt
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
        return parsed;
    } catch (e) {
        console.error("Failed to parse JSON from LLM:", content);
        return null;
    }

  } catch (error) {
    console.error(`Error fetching OSHA data for ${facility.name}:`, error.message);
    return null;
  }
};

const main = async () => {
  console.log("Loading Facilities Data...");
  let facilities = [];
  if (fs.existsSync(FACILITIES_FILE)) {
    facilities = JSON.parse(fs.readFileSync(FACILITIES_FILE, 'utf8'));
    console.log(`Loaded ${facilities.length} facilities.`);
  } else {
    console.error(`Facilities file not found at ${FACILITIES_FILE}.`);
    process.exit(1);
  }

  const updatedFacilities = [];
  // Process in batches
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < facilities.length; i += BATCH_SIZE) {
    const batch = facilities.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} of ${Math.ceil(facilities.length / BATCH_SIZE)}...`);
    
    const promises = batch.map(async (facility) => {
      // Skip if already has data (optional, but good for re-runs)
      // if (facility.oshaHistory) return facility; 
      
      const oshaData = await getOshaData(facility);
      if (oshaData) {
        return { 
            ...facility, 
            oshaHistory: oshaData.oshaHistory,
            safetySummary: oshaData.summary
        };
      }
      return facility;
    });

    const results = await Promise.all(promises);
    updatedFacilities.push(...results);
    
    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("Saving updated facilities data...");
  fs.writeFileSync(FACILITIES_FILE, JSON.stringify(updatedFacilities, null, 2));
  console.log(`Successfully updated ${updatedFacilities.length} facilities with OSHA data.`);
};

main().catch(console.error);
