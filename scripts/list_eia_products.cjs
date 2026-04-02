const xlsx = require('xlsx');

const workbook = xlsx.readFile('src/data/raw_osha/refcap25.xlsx');
const sheet = workbook.Sheets['refcap25'];
const data = xlsx.utils.sheet_to_json(sheet);

const products = new Set();
const supplies = new Set();

data.forEach(row => {
    products.add(row.PRODUCT);
    supplies.add(row.SUPPLY);
});

console.log('--- Products ---');
console.log(Array.from(products).sort());

console.log('\n--- Supplies ---');
console.log(Array.from(supplies).sort());
