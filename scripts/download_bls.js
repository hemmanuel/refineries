import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function downloadBLS() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  const downloadPath = path.resolve(__dirname);
  
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath,
  });

  await page.goto('https://www.bls.gov/oes/special.requests/oesm23in4.zip', { waitUntil: 'networkidle2' });
  
  console.log('Waiting for download...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  await browser.close();
  console.log('Done');
}

downloadBLS();