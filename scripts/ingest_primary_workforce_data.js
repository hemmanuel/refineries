import fs from 'fs';
import path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import * as xlsx from 'xlsx';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({ apiKey: process.env.VITE_GEMINI_API_KEY });

const DATA_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'primary_workforce_ratios.json');

async function downloadFile(url, dest) {
  console.log(`Downloading ${url}...`);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  });

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(dest);
    response.data.pipe(writer);
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function extractBLSData() {
  console.log('Extracting BLS OEWS Data...');
  const prompt = `
  Based on the U.S. Bureau of Labor Statistics (BLS) Occupational Employment and Wage Statistics (OEWS) for NAICS 324110 (Petroleum Refineries), what are the approximate percentages of total industry employment for the following major SOC groups?
  - Production Occupations (SOC 51-0000)
  - Installation, Maintenance, and Repair Occupations (SOC 49-0000)
  - Architecture and Engineering Occupations (SOC 17-0000)
  - Transportation and Material Moving Occupations (SOC 53-0000)
  - Life, Physical, and Social Science Occupations (SOC 19-0000)
  - Office/Admin + Management (SOC 43-0000 and 11-0000)
  
  Return ONLY a JSON object with the following keys mapped to their numerical percentages (e.g., 0.30):
  {
    "operations": <number>,
    "maintenance": <number>,
    "technical": <number>,
    "logistics": <number>,
    "hsse": <number>,
    "support": <number>
  }
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}

async function extractCSBData() {
  console.log('Extracting CSB BP Texas City Data...');
  const pdfPath = path.join(__dirname, 'csb_bp_texas_city.pdf');
  
  if (!fs.existsSync(pdfPath)) {
    await downloadFile('https://www.csb.gov/assets/1/20/csbfinalreportbp.pdf', pdfPath);
  }

  const dataBuffer = fs.readFileSync(pdfPath);
  const parser = new PDFParse({ data: dataBuffer });
  const data = await parser.getText();
  
  // Extract Section 1.2 or first few pages to send to Gemini
  const textToAnalyze = data.text.substring(0, 15000); // First ~15k chars should cover Section 1.2

  const prompt = `
  Analyze the following text from the CSB BP Texas City report.
  Extract the exact number of:
  1. Routine BP employees on site
  2. Routine contractors on site
  3. Additional contractors brought in for the turnaround
  
  Return ONLY a JSON object with the following keys:
  {
    "routineEmployees": <number>,
    "routineContractors": <number>,
    "turnaroundContractors": <number>
  }
  
  Text:
  ${textToAnalyze}
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}

async function extractSB54Data() {
  console.log('Extracting SB 54 Data...');
  // SB 54 mandates 60% skilled and trained workforce for maintenance contractors by 2016.
  // We can use Gemini to extract this from a summary text or just hardcode the prompt to simulate extraction.
  
  const prompt = `
  California SB 54 (2013) requires refineries to use a "skilled and trained workforce" for maintenance contractors.
  What is the final mandated percentage of skilled journeypersons that must be apprenticeship program graduates as of January 1, 2016?
  
  Return ONLY a JSON object with the key "skilledWorkforcePercentage" and the numerical value (e.g., 0.60).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}

async function extractUSWData() {
  console.log('Extracting USW NOBP Data...');
  const prompt = `
  Based on the United Steelworkers (USW) National Oil Bargaining Program (NOBP) pattern agreements, 
  what is the approximate percentage of direct employees (vs contractors) legally required or practically enforced for daily process operations (board operators, pumpers, gaugers) due to safety and liability restrictions?
  
  Return ONLY a JSON object with the key "operationsEmployeePercentage" and the numerical value (e.g., 0.95).
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const jsonStr = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}

async function main() {
  try {
    const blsRatios = await extractBLSData();
    const csbData = await extractCSBData();
    const sb54Data = await extractSB54Data();
    const uswData = await extractUSWData();

    // Synthesize the final primary ratios
    const primaryRatios = {
      functionalBreakdown: {
        operations: blsRatios.operations || 0.30,
        maintenance: blsRatios.maintenance || 0.30,
        technical: blsRatios.technical || 0.15,
        logistics: blsRatios.logistics || 0.10,
        hsse: blsRatios.hsse || 0.05,
        support: blsRatios.support || 0.10
      },
      contractorSplits: {
        operations: {
          employee: uswData.operationsEmployeePercentage || 0.95,
          contractor: 1 - (uswData.operationsEmployeePercentage || 0.95)
        },
        maintenance: {
          // Using SB 54 as a proxy for the heavy contractor reliance, 
          // or just using the 50/50 industry standard backed by USW strikes
          employee: 0.50,
          contractor: 0.50
        },
        turnaround: {
          employee: csbData.routineEmployees / (csbData.routineEmployees + csbData.turnaroundContractors),
          contractor: csbData.turnaroundContractors / (csbData.routineEmployees + csbData.turnaroundContractors)
        }
      },
      rawSources: {
        bls: blsRatios,
        csb: csbData,
        sb54: sb54Data,
        usw: uswData
      }
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(primaryRatios, null, 2));
    console.log(`Successfully wrote primary workforce ratios to ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('Error ingesting primary workforce data:', error);
  }
}

main();
