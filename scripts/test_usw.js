import axios from 'axios';
import * as cheerio from 'cheerio';

async function testUSW() {
  const url = 'https://en.wikipedia.org/wiki/2015_United_Steel_Workers_Oil_Refinery_strike';
  try {
    const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(response.data);
    const text = $('body').text().replace(/\s+/g, ' ');
    console.log(text.substring(0, 1000));
  } catch (e) {
    console.error(e.message);
  }
}

testUSW();