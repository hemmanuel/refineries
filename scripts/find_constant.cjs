const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/data/raw_eia/calculated_nci_2025.json'));

let totalFactor = 0;
data.forEach(r => {
    totalFactor += Math.pow(r.cdu_capacity, 0.7) * r.nci;
});

const constant = 64500 / totalFactor;
console.log('Exact constant:', constant);
