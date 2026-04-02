const fs = require('fs');
const xlsx = require('xlsx');
const levenshtein = require('fast-levenshtein');
const path = require('path');

// Load NCI Factors
const nciFactorsPath = path.join(__dirname, '../src/data/nci_factors.json');
const nciFactorsData = JSON.parse(fs.readFileSync(nciFactorsPath, 'utf8'));
const COMPLEXITY_FACTORS = nciFactorsData.factors;

// Load EIA Data
console.log('Loading EIA Refinery Capacity Report...');
const workbook = xlsx.readFile(path.join(__dirname, '../src/data/raw_eia/refcap25.xlsx'));
const sheet = workbook.Sheets['refcap25'];
const eiaData = xlsx.utils.sheet_to_json(sheet);

// Group data by refinery
const refineriesData = {};

eiaData.forEach(row => {
    const company = row.COMPANY_NAME?.trim();
    const site = row.SITE?.trim();
    const state = row.STATE_NAME?.trim();
    const product = row.PRODUCT?.trim();
    const supply = row.SUPPLY?.trim();
    const quantity = parseFloat(row.QUANTITY) || 0;

    if (!company || !site || !state || quantity === 0) return;

    const key = `${company} - ${site} (${state})`;
    if (!refineriesData[key]) {
        refineriesData[key] = {
            company,
            site,
            state,
            cdu_capacity: 0,
            units: {}
        };
    }

    // We only care about current year stream day capacity for NCI
    if (supply.includes('Current Year') || supply.includes('Atmospheric Crude Distillation Capacity')) {
        if (supply.includes('calendar day')) return; // Use stream day for consistency if possible, or just pick one.
        
        if (product === 'OPERATING CAPACITY' || product === 'IDLE CAPACITY') {
            refineriesData[key].cdu_capacity += quantity;
        } else if (COMPLEXITY_FACTORS[product]) {
            refineriesData[key].units[product] = (refineriesData[key].units[product] || 0) + quantity;
        }
    }
});

// Calculate NCI
const nciResults = [];
for (const key in refineriesData) {
    const ref = refineriesData[key];
    if (ref.cdu_capacity === 0) continue;

    let nci = 1.0; // Base CDU complexity
    for (const unit in ref.units) {
        const capacity = ref.units[unit];
        const factor = COMPLEXITY_FACTORS[unit];
        nci += (capacity / ref.cdu_capacity) * factor;
    }

    nciResults.push({
        eiaKey: key,
        company: ref.company,
        site: ref.site,
        state: ref.state,
        cdu_capacity: ref.cdu_capacity,
        nci: parseFloat(nci.toFixed(2)),
        units: ref.units
    });
}

console.log(`Calculated NCI for ${nciResults.length} refineries from EIA data.`);

// Save intermediate audit trail
const auditPath = path.join(__dirname, '../src/data/raw_eia/calculated_nci_2025.json');
fs.writeFileSync(auditPath, JSON.stringify(nciResults, null, 2));
console.log(`Saved intermediate NCI calculations to ${auditPath}`);

// Load facilities.json
console.log('Loading facilities.json...');
const facilitiesPath = path.join(__dirname, '../src/data/facilities.json');
const facilities = JSON.parse(fs.readFileSync(facilitiesPath, 'utf8'));

// Clear existing NCI
facilities.forEach(f => delete f.nci);

// Hardcoded overrides for edge cases (acquisitions, naming discrepancies)
const EXPLICIT_MATCHES = {
    "Tesoro Refining & Marketing Co - Anacortes": "TESORO REFINING & MARKETING CO - ANACORTES (Washington)",
    "Pasadena Refining Systems Inc - Pasadena": "PASADENA REFINING SYSTEMS INC - PASADENA (Texas)",
    "Valero Refining New Orleans LLC - Norco": "VALERO REFINING NEW ORLEANS LLC - NORCO (Louisiana)",
    "Paulsboro Refining Co LLC - Paulsboro": "PAULSBORO REFINING CO LLC - PAULSBORO (New Jersey)",
    "HF Sinclair Wyoming Refining Co - Sinclair": "HF SINCLAIR WYOMING REFINING CO - SINCLAIR (Wyoming)"
};

// Match and merge
let matchCount = 0;
const usedEiaKeys = new Set();

facilities.forEach(facility => {
    // 1. Check explicit matches first
    if (EXPLICIT_MATCHES[facility.name]) {
        const eiaKey = EXPLICIT_MATCHES[facility.name];
        const match = nciResults.find(r => r.eiaKey === eiaKey);
        if (match) {
            facility.nci = match.nci;
            usedEiaKeys.add(match.eiaKey);
            matchCount++;
            console.log(`Explicitly matched: ${facility.name} -> ${match.eiaKey} (NCI: ${match.nci})`);
            return;
        }
    }

    // 2. Basic matching logic: State must match
    const stateMatches = nciResults.filter(r => r.state === facility.state && !usedEiaKeys.has(r.eiaKey));
    
    if (stateMatches.length === 0) {
        // If it's a petrochemical plant or no match found, assign default NCI 1.0
        facility.nci = 1.0;
        return;
    }

    let bestMatch = null;
    let bestScore = Infinity;

    stateMatches.forEach(r => {
        const eiaName = `${r.company} ${r.site}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        const facName = `${facility.company} ${facility.city} ${facility.name}`.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const score = levenshtein.get(eiaName, facName);
        if (score < bestScore) {
            bestScore = score;
            bestMatch = r;
        }
    });

    let foundExact = false;
    stateMatches.forEach(r => {
        const siteClean = r.site.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cityClean = (facility.city || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const nameClean = facility.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        const eiaCompanyClean = r.company.toLowerCase().replace(/[^a-z0-9]/g, '');
        const facCompanyClean = facility.company.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        const companyMatch = eiaCompanyClean.includes(facCompanyClean.substring(0, 5)) || facCompanyClean.includes(eiaCompanyClean.substring(0, 5));
        const siteMatch = siteClean === cityClean || nameClean.includes(siteClean);
        
        if (companyMatch && siteMatch) {
            bestMatch = r;
            bestScore = 0;
            foundExact = true;
        } else if (siteMatch && siteClean.length > 3) {
            // If site matches exactly (and is not too short like "bay"), check capacity
            const capDiff = Math.abs(r.cdu_capacity - facility.capacity);
            if (facility.capacity === 0 || capDiff < 20000 || (r.cdu_capacity > 0 && capDiff / r.cdu_capacity < 0.2)) {
                bestMatch = r;
                bestScore = 0;
                foundExact = true;
            }
        } else if (nameClean.includes(eiaCompanyClean) && nameClean.includes(siteClean)) {
            bestMatch = r;
            bestScore = 0;
            foundExact = true;
        }
    });

    // Also check if capacity is very close
    if (!foundExact && bestScore >= 15) {
        stateMatches.forEach(r => {
            const capDiff = Math.abs(r.cdu_capacity - facility.capacity);
            if (capDiff < 5000 || (r.cdu_capacity > 0 && capDiff / r.cdu_capacity < 0.1)) {
                bestMatch = r;
                bestScore = 5; // Good enough
            }
        });
    }

    if (bestMatch && (bestScore < 15 || foundExact)) { // Threshold for matching
        facility.nci = bestMatch.nci;
        usedEiaKeys.add(bestMatch.eiaKey);
        matchCount++;
    } else {
        // Assign default NCI of 1.0 for unmatched facilities (e.g. petrochemical plants)
        facility.nci = 1.0;
    }
});

console.log(`Successfully matched NCI for ${matchCount} out of ${facilities.length} facilities. Defaulted the rest to 1.0.`);

// Save facilities.json
fs.writeFileSync(facilitiesPath, JSON.stringify(facilities, null, 2));
console.log('Updated facilities.json with NCI data.');
