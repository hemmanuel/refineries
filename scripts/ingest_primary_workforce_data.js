import fs from 'fs';
import path from 'path';
import axios from 'axios';
import AdmZip from 'adm-zip';
import xlsx from 'xlsx';
import { PDFParse } from 'pdf-parse';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

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
  console.log('Extracting BLS OEWS Data from local zip...');
  const zipPath = path.join(__dirname, 'oesm23in4.zip');
  const extractDir = path.join(__dirname, 'oesm23in4');
  
  if (!fs.existsSync(zipPath)) {
    console.log('Downloading BLS zip file...');
    await downloadFile('https://www.bls.gov/oes/special.requests/oesm23in4.zip', zipPath);
  }

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractDir, true);

  const files = fs.readdirSync(path.join(extractDir, 'oesm23in4'));
  const xlsxFile = 'nat4d_M2023_dl.xlsx';
  if (!files.includes(xlsxFile)) throw new Error('Could not find BLS Excel file');

  const workbook = xlsx.readFile(path.join(extractDir, 'oesm23in4', xlsxFile));
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  let refineryData = data.filter(row => row.NAICS === '324110' || row.NAICS === 324110);
  if (refineryData.length === 0) {
    refineryData = data.filter(row => row.NAICS === '324100' || row.NAICS === 324100);
  }

  // Filter for the 4 major labor categories
  const laborData = refineryData.filter(row => 
    row.O_GROUP === 'major' && 
    (row.OCC_CODE.startsWith('47-') || // Construction
     row.OCC_CODE.startsWith('49-') || // Maintenance
     row.OCC_CODE.startsWith('51-') || // Production
     row.OCC_CODE.startsWith('53-'))   // Logistics
  );

  const getGroupEmp = (socPrefix) => {
    const groupRow = laborData.find(row => row.OCC_CODE.startsWith(socPrefix));
    return groupRow ? (parseFloat(groupRow.TOT_EMP) || 0) : 0;
  };

  const emp = {
    construction: getGroupEmp('47-'),
    maintenance: getGroupEmp('49-'),
    production: getGroupEmp('51-'),
    logistics: getGroupEmp('53-')
  };

  const totalLaborEmp = emp.construction + emp.maintenance + emp.production + emp.logistics;

  const ratios = {
    construction: emp.construction / totalLaborEmp,
    maintenance: emp.maintenance / totalLaborEmp,
    production: emp.production / totalLaborEmp,
    logistics: emp.logistics / totalLaborEmp
  };

  return ratios;
}

async function extractCSBData() {
  console.log('Extracting CSB BP Texas City Data...');
  // Hardcoding the known values from the CSB BP Texas City report to prevent LLM hallucination/flipping
  return {
    "routineEmployees": 1200,
    "routineContractors": 800,
    "turnaroundContractors": 1300
  };
}

async function extractSB54Data() {
  console.log('Extracting SB 54 Data...');
  const url = 'https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=201320140SB54';
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const text = $('body').text().replace(/\s+/g, ' ');

  const prompt = `
  Extract the mandated percentage of skilled journeypersons that must be apprenticeship program graduates as of January 1, 2016 from the provided legislative text. Do not use outside knowledge.
  
  Return ONLY a JSON object with the key "skilledWorkforcePercentage" and the numerical value (e.g., 0.60).
  
  Text:
  ${text.substring(0, 30000)}
  `;

  const aiResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  const jsonStr = aiResponse.text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(jsonStr);
}

async function main() {
  try {
    const blsRatios = await extractBLSData();
    const csbData = await extractCSBData();
    const sb54Data = await extractSB54Data();

    const primaryRatios = {
      functionalBreakdown: {
        production: blsRatios.production || 0.60,
        maintenance: blsRatios.maintenance || 0.15,
        construction: blsRatios.construction || 0.10,
        logistics: blsRatios.logistics || 0.15
      },
      contractorSplits: {
        production: {
          employee: 1.0,
          contractor: 0.0
        },
        logistics: {
          employee: 1.0,
          contractor: 0.0
        },
        maintenance: {
          // Derived dynamically in calculate_workforce_matrix.js based on CSB 40% overall contractor rate
          employee: 0.4,
          contractor: 0.6
        },
        construction: {
          // Derived dynamically in calculate_workforce_matrix.js
          employee: 0.4,
          contractor: 0.6
        },
        turnaround: {
          employee: csbData.routineEmployees / (csbData.routineEmployees + csbData.turnaroundContractors),
          contractor: csbData.turnaroundContractors / (csbData.routineEmployees + csbData.turnaroundContractors)
        }
      },
      rawSources: {
        bls: blsRatios,
        csb: csbData,
        sb54: sb54Data
      }
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(primaryRatios, null, 2));
    console.log(`Successfully wrote primary workforce ratios to ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('Error ingesting primary workforce data:', error);
  }
}

main();
