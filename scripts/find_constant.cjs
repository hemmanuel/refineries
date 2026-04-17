const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/data/raw_eia/calculated_nci_2025.json'));

let totalFactor = 0;
data.forEach(r => {
    totalFactor += Math.pow(r.cdu_capacity, 0.7) * r.nci;
});

// Assuming 60% employee / 40% contractor ratio based on CSB
const totalUSDirectEmployees = 68470;
const totalUSRoutineWorkforce = Math.round(totalUSDirectEmployees / 0.60);

const constant = totalUSRoutineWorkforce / totalFactor;
console.log('Estimated Total US Routine Workforce:', totalUSRoutineWorkforce);
console.log('Exact constant:', constant);
