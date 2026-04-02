const xlsx = require('xlsx');

const workbook = xlsx.readFile('src/data/raw_osha/refcap25.xlsx');
console.log('Sheet Names:');
console.log(workbook.SheetNames);

for (const sheetName of workbook.SheetNames) {
    console.log(`\n--- Sheet: ${sheetName} ---`);
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    // Print first 10 rows
    for (let i = 0; i < Math.min(10, data.length); i++) {
        console.log(data[i]);
    }
}
