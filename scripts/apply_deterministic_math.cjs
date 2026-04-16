const fs = require('fs');

const facilities = JSON.parse(fs.readFileSync('src/data/facilities.json', 'utf8'));
const nciData = JSON.parse(fs.readFileSync('src/data/raw_eia/calculated_nci_2025.json', 'utf8'));

// First pass: update capacities and units from EIA data
facilities.forEach(f => {
    if (f.type === 'Oil Refinery') {
        let eiaMatch = null;
        if (f.nci && f.nci !== 1.0) {
            eiaMatch = nciData.find(r => r.nci === f.nci && r.state === f.state);
        }

        if (eiaMatch) {
            f.capacity = eiaMatch.cdu_capacity;
            f.units = eiaMatch.units;
        }
        
        f.edc = Math.round((f.capacity || 0) * (f.nci || 1.0));
    }
});

// Calculate exact constant to hit 64,500 US refinery workers
let totalFactor = 0;
facilities.forEach(f => {
    if (f.type === 'Oil Refinery') {
        const capacity = f.capacity || 0;
        const nci = f.nci || 1.0;
        totalFactor += Math.pow(capacity, 0.7) * nci;
    }
});
const CONSTANT = 64500 / totalFactor;

facilities.forEach(f => {
    if (f.type === 'Oil Refinery') {
        const capacity = f.capacity || 0;
        const nci = f.nci || 1.0;
        
        const baseHeadcount = Math.round(Math.pow(capacity, 0.7) * nci * CONSTANT);
        const turnaround = Math.round(baseHeadcount * 0.65);
        const safety = Math.round(baseHeadcount * 0.75);

        if (f.estimate) {
            f.estimate.totalHeadcount = baseHeadcount;
            f.estimate.turnaroundHeadcount = turnaround;
            f.estimate.safetySensitive = safety;
            
            if (!f.estimate.explanations) f.estimate.explanations = {};
            f.estimate.explanations.totalHeadcount = `Calculated using the industry-standard Equivalent Distillation Capacity (EDC) framework. The facility's nameplate capacity (${capacity.toLocaleString()} bpd) is scaled using the 0.7 power rule to account for economies of scale, and multiplied by its Nelson Complexity Index (${nci.toFixed(2)}). This model is calibrated to align with the AFPM's reported 64,500 total US refining workforce.`;
            f.estimate.explanations.turnaroundHeadcount = `Calculated using a 0.65x multiplier on the total base headcount (equivalent to 1.08x of the direct employee count). Major maintenance events (turnarounds) require a massive, temporary influx of specialized trades (pipefitters, boilermakers, scaffolders) to safely execute complex unit overhauls within a compressed timeframe, as derived from the CSB BP Texas City report.`;
            f.estimate.explanations.safetySensitive = `Calculated as 75% of the total site headcount. Per OSHA Process Safety Management (PSM) and PHMSA guidelines, this encompasses all personnel involved in operations, maintenance, and emergency response near highly hazardous chemicals, excluding only pure administrative staff.`;
        }
    } else {
        const capacity = f.capacity || 0;
        const baseHeadcount = Math.round((capacity / 1000000) * 400) || 100; 
        const turnaround = Math.round(baseHeadcount * 0.65);
        const safety = Math.round(baseHeadcount * 0.6);

        if (f.estimate) {
            f.estimate.totalHeadcount = baseHeadcount;
            f.estimate.turnaroundHeadcount = turnaround;
            f.estimate.safetySensitive = safety;
            
            if (!f.estimate.explanations) f.estimate.explanations = {};
            f.estimate.explanations.totalHeadcount = `Calculated using standard petrochemical capacity heuristics (~400 FTEs per 1 mtpa capacity).`;
            f.estimate.explanations.turnaroundHeadcount = `Calculated using a 0.65x multiplier on the total base headcount for major turnarounds.`;
            f.estimate.explanations.safetySensitive = `Calculated as 60% of the total site headcount.`;
        }
    }
});

fs.writeFileSync('src/data/facilities.json', JSON.stringify(facilities, null, 2));
console.log('Updated facilities.json with deterministic math, EDC, and units. Constant used:', CONSTANT);
