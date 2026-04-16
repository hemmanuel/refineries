import puppeteer from 'puppeteer';

async function fetchBLS() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://www.bls.gov/oes/2023/may/naics4_324100.htm', { waitUntil: 'networkidle2' });
  const html = await page.content();
  console.log(html.substring(0, 1000));
  await browser.close();
}

fetchBLS();