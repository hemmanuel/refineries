import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../src/data');
const FACILITIES_FILE = path.join(DATA_DIR, 'facilities.json');
const RATIOS_FILE = path.join(DATA_DIR, 'primary_workforce_ratios.json');

function main() {
  const facilitiesData = JSON.parse(fs.readFileSync(FACILITIES_FILE, 'utf8'));
  const ratiosData = JSON.parse(fs.readFileSync(RATIOS_FILE, 'utf8'));

  const { functionalBreakdown, contractorSplits, rawSources } = ratiosData;

  // Normalize functional breakdown to ensure it sums to 1.0
  const totalFunc = Object.values(functionalBreakdown).reduce((a, b) => a + b, 0);
  const normalizedFunc = {};
  for (const [key, value] of Object.entries(functionalBreakdown)) {
    normalizedFunc[key] = value / totalFunc;
  }

  // Turnaround multiplier based on CSB data (Turnaround Contractors / Routine Employees)
  const turnaroundMultiplier = rawSources.csb.turnaroundContractors / rawSources.csb.routineEmployees;

  facilitiesData.forEach(props => {
    if (!props.estimate || !props.estimate.totalHeadcount) return;

    const baseHeadcount = props.estimate.totalHeadcount;

    const matrix = {
      operations: {
        total: Math.round(baseHeadcount * normalizedFunc.operations),
        employee: Math.round(baseHeadcount * normalizedFunc.operations * contractorSplits.operations.employee),
        contractor: Math.round(baseHeadcount * normalizedFunc.operations * contractorSplits.operations.contractor)
      },
      maintenance: {
        total: Math.round(baseHeadcount * normalizedFunc.maintenance),
        employee: Math.round(baseHeadcount * normalizedFunc.maintenance * contractorSplits.maintenance.employee),
        contractor: Math.round(baseHeadcount * normalizedFunc.maintenance * contractorSplits.maintenance.contractor)
      },
      technical: {
        total: Math.round(baseHeadcount * normalizedFunc.technical),
        // Assume 90% employee, 10% contractor for technical
        employee: Math.round(baseHeadcount * normalizedFunc.technical * 0.9),
        contractor: Math.round(baseHeadcount * normalizedFunc.technical * 0.1)
      },
      logistics: {
        total: Math.round(baseHeadcount * normalizedFunc.logistics),
        // Assume 80% employee, 20% contractor for logistics
        employee: Math.round(baseHeadcount * normalizedFunc.logistics * 0.8),
        contractor: Math.round(baseHeadcount * normalizedFunc.logistics * 0.2)
      },
      hsse: {
        total: Math.round(baseHeadcount * normalizedFunc.hsse),
        // Assume 85% employee, 15% contractor for HSSE
        employee: Math.round(baseHeadcount * normalizedFunc.hsse * 0.85),
        contractor: Math.round(baseHeadcount * normalizedFunc.hsse * 0.15)
      },
      support: {
        total: Math.round(baseHeadcount * normalizedFunc.support),
        // Assume 70% employee, 30% contractor for support
        employee: Math.round(baseHeadcount * normalizedFunc.support * 0.7),
        contractor: Math.round(baseHeadcount * normalizedFunc.support * 0.3)
      },
      turnaround: {
        total: Math.round(baseHeadcount * turnaroundMultiplier),
        // Turnaround is heavily contractor based (10% employee, 90% contractor)
        employee: Math.round(baseHeadcount * turnaroundMultiplier * 0.1),
        contractor: Math.round(baseHeadcount * turnaroundMultiplier * 0.9)
      }
    };

    props.workforceMatrix = matrix;
  });

  fs.writeFileSync(FACILITIES_FILE, JSON.stringify(facilitiesData, null, 2));
  console.log(`Successfully updated ${FACILITIES_FILE} with workforce matrices.`);
}

main();
