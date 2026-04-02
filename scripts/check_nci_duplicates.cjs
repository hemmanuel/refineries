const fs = require('fs');

const facilities = JSON.parse(fs.readFileSync('src/data/facilities.json', 'utf8'));
const nciCounts = {};

facilities.forEach(f => {
    if (f.nci) {
        nciCounts[f.nci] = (nciCounts[f.nci] || 0) + 1;
    }
});

let duplicates = 0;
for (const nci in nciCounts) {
    if (nciCounts[nci] > 1) {
        duplicates += nciCounts[nci] - 1;
    }
}

console.log(`There are ${duplicates} potential duplicate matches based on NCI values.`);
