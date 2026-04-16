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

  const { functionalBreakdown, rawSources } = ratiosData;

  // Normalize functional breakdown to ensure it sums to 1.0
  const totalFunc = Object.values(functionalBreakdown).reduce((a, b) => a + b, 0);
  const normalizedFunc = {};
  for (const [key, value] of Object.entries(functionalBreakdown)) {
    normalizedFunc[key] = value / totalFunc;
  }

  // Derive overall routine contractor ratio from CSB BP Texas City report
  const routineEmployeesCSB = rawSources.csb.routineEmployees || 1200;
  const routineContractorsCSB = rawSources.csb.routineContractors || 800;
  const totalRoutineCSB = routineEmployeesCSB + routineContractorsCSB;
  const overallContractorRatio = routineContractorsCSB / totalRoutineCSB; // 0.40
  const overallEmployeeRatio = routineEmployeesCSB / totalRoutineCSB; // 0.60

  // Turnaround multiplier based on CSB data (Turnaround Contractors / Routine Employees)
  const turnaroundMultiplier = rawSources.csb.turnaroundContractors / routineEmployeesCSB;

  // Operations employee percentage from USW
  const opsEmployeePct = rawSources.usw.operationsEmployeePercentage || 0.95;

  facilitiesData.forEach(props => {
    if (!props.estimate || !props.estimate.totalHeadcount) return;

    const baseHeadcount = props.estimate.totalHeadcount;
    
    // 1. Split total headcount into overall employees and contractors
    const totalEmployees = Math.round(baseHeadcount * overallEmployeeRatio);
    const totalContractors = baseHeadcount - totalEmployees; // Ensure exact sum

    // 2. Distribute employees based on BLS occupational data
    const emp = {
      operations: Math.round(totalEmployees * normalizedFunc.operations),
      maintenance: Math.round(totalEmployees * normalizedFunc.maintenance),
      technical: Math.round(totalEmployees * normalizedFunc.technical),
      logistics: Math.round(totalEmployees * normalizedFunc.logistics),
      hsse: Math.round(totalEmployees * normalizedFunc.hsse),
      support: 0 // Will calculate as remainder to ensure exact sum
    };
    emp.support = totalEmployees - (emp.operations + emp.maintenance + emp.technical + emp.logistics + emp.hsse);

    // 3. Calculate contractors based on WWU report for maintenance, USW for operations, and estimates for the rest
    // WWU report: 1027 contractors / (164 employees + 1027 contractors) = ~86.2% contractors in maintenance
    // Using the WWU ratio directly: contractors = employees * (1027 / 164) = employees * 6.262
    const maintContractorRatio = 1027 / 164;

    const cont = {
      operations: Math.round(emp.operations * ((1 - opsEmployeePct) / opsEmployeePct)),
      maintenance: Math.round(emp.maintenance * maintContractorRatio),
      technical: Math.round(emp.technical * (0.10 / 0.90)), // Estimate: 10% contractors
      logistics: Math.round(emp.logistics * (0.20 / 0.80)), // Estimate: 20% contractors
      hsse: Math.round(emp.hsse * (0.15 / 0.85)), // Estimate: 15% contractors
      support: 0 // Will calculate as remainder to ensure totalContractors matches the 40% site-wide average
    };

    // 4. Assign all remaining contractors to support to ensure the site-wide 40% contractor average is maintained
    const nonSupportContractors = cont.operations + cont.maintenance + cont.technical + cont.logistics + cont.hsse;
    cont.support = Math.max(0, totalContractors - nonSupportContractors);

    const matrix = {
      operations: {
        total: emp.operations + cont.operations,
        employee: emp.operations,
        contractor: cont.operations
      },
      maintenance: {
        total: emp.maintenance + cont.maintenance,
        employee: emp.maintenance,
        contractor: cont.maintenance
      },
      technical: {
        total: emp.technical + cont.technical,
        employee: emp.technical,
        contractor: cont.technical
      },
      logistics: {
        total: emp.logistics + cont.logistics,
        employee: emp.logistics,
        contractor: cont.logistics
      },
      hsse: {
        total: emp.hsse + cont.hsse,
        employee: emp.hsse,
        contractor: cont.hsse
      },
      support: {
        total: emp.support + cont.support,
        employee: emp.support,
        contractor: cont.support
      },
      turnaround: {
        // Turnaround is heavily contractor based (10% employee, 90% contractor)
        total: Math.round(baseHeadcount * turnaroundMultiplier),
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
