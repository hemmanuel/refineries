import axios from 'axios';
import * as cheerio from 'cheerio';

async function testSB54() {
  const url = 'https://leginfo.legislature.ca.gov/faces/billTextClient.xhtml?bill_id=201320140SB54';
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const text = $('#bill_all').text().replace(/\s+/g, ' ');
  console.log(text.substring(0, 1000));
}

testSB54();