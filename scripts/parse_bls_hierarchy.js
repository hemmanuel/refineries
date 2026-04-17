import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(DATA_DIR, 'bls_hierarchy.json');
const BLS_FILE = path.join(__dirname, 'oesm23in4/oesm23in4/nat4d_M2023_dl.xlsx');

function main() {
  console.log('Reading BLS data...');
  const workbook = xlsx.readFile(BLS_FILE);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  const refData = data.filter(row => row.NAICS === '324100' || row.NAICS === 324100);

  console.log(`Found ${refData.length} rows for NAICS 324100.`);

  let root = null;
  let currentMajor = null;
  let currentMinor = null;
  let currentBroad = null;

  for (const row of refData) {
    const node = {
      name: row.OCC_TITLE,
      attributes: {
        code: row.OCC_CODE,
        employees: parseFloat(row.TOT_EMP) || 0,
        group: row.O_GROUP
      },
      children: []
    };

    if (row.O_GROUP === 'total') {
      root = node;
    } else if (row.O_GROUP === 'major') {
      currentMajor = node;
      if (root) root.children.push(currentMajor);
    } else if (row.O_GROUP === 'minor') {
      currentMinor = node;
      if (currentMajor) currentMajor.children.push(currentMinor);
    } else if (row.O_GROUP === 'broad') {
      currentBroad = node;
      if (currentMinor) currentMinor.children.push(currentBroad);
    } else if (row.O_GROUP === 'detailed') {
      if (currentBroad) {
        currentBroad.children.push(node);
      } else if (currentMinor) {
        // Sometimes detailed jumps straight from minor
        currentMinor.children.push(node);
      } else if (currentMajor) {
        currentMajor.children.push(node);
      } else if (root) {
        root.children.push(node);
      }
    }
  }

  // Clean up empty children arrays
  function cleanTree(node) {
    if (node.children.length === 0) {
      delete node.children;
    } else {
      node.children.forEach(cleanTree);
    }
  }
  
  if (root) {
    cleanTree(root);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(root, null, 2));
    console.log(`Successfully wrote hierarchy to ${OUTPUT_FILE}`);
  } else {
    console.error('Could not find root node.');
  }
}

main();
