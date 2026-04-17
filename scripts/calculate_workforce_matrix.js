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

  // Turnaround multiplier based on CSB data (Turnaround Contractors / Total Routine Workforce)
  const turnaroundMultiplier = rawSources.csb.turnaroundContractors / totalRoutineCSB;

  facilitiesData.forEach(props => {
    if (!props.estimate || !props.estimate.totalHeadcount) return;

    const baseHeadcount = props.estimate.totalHeadcount;
    
    // 1. Split total headcount into overall employees and contractors
    const totalEmployees = Math.round(baseHeadcount * overallEmployeeRatio);
    const totalContractors = baseHeadcount - totalEmployees; // Ensure exact sum

    // 2. Distribute employees based on BLS occupational data
    const emp = {
      production: Math.round(totalEmployees * normalizedFunc.production),
      maintenance: Math.round(totalEmployees * normalizedFunc.maintenance),
      construction: Math.round(totalEmployees * normalizedFunc.construction),
      logistics: 0 // Will calculate as remainder to ensure exact sum
    };
    emp.logistics = totalEmployees - (emp.production + emp.maintenance + emp.construction);

    // 3. Calculate contractors based on specified ratios for production (2%) and logistics (5%), 
    // and distribute the rest to Maintenance and Construction to hit the 40% site-wide average.
    const cont = {
      production: Math.round(emp.production * (0.02 / 0.98)),
      logistics: Math.round(emp.logistics * (0.05 / 0.95)),
      maintenance: 0,
      construction: 0
    };

    // 4. Assign all remaining contractors to maintenance and construction proportionally
    const remainingContractors = Math.max(0, totalContractors - (cont.production + cont.logistics));
    const maintConstEmpTotal = emp.maintenance + emp.construction;
    
    if (maintConstEmpTotal > 0) {
      cont.maintenance = Math.round(remainingContractors * (emp.maintenance / maintConstEmpTotal));
      cont.construction = remainingContractors - cont.maintenance;
    } else {
      cont.maintenance = Math.round(remainingContractors / 2);
      cont.construction = remainingContractors - cont.maintenance;
    }

    const matrix = {
      production: {
        total: emp.production + cont.production,
        employee: emp.production,
        contractor: cont.production
      },
      maintenance: {
        total: emp.maintenance + cont.maintenance,
        employee: emp.maintenance,
        contractor: cont.maintenance
      },
      construction: {
        total: emp.construction + cont.construction,
        employee: emp.construction,
        contractor: cont.construction
      },
      logistics: {
        total: emp.logistics + cont.logistics,
        employee: emp.logistics,
        contractor: cont.logistics
      },
      turnaround: {
        // Turnaround is heavily contractor based (10% employee, 90% contractor)
        total: Math.round(totalEmployees * 1.5),
        employee: Math.round(totalEmployees * 1.5 * 0.1),
        contractor: Math.round(totalEmployees * 1.5 * 0.9)
      }
    };

    props.workforceMatrix = matrix;
  });

  // Fix rounding errors to exactly match BLS targets
  const targetBLS = {
    production: 42150,
    maintenance: 8640,
    construction: 8060,
    logistics: 9620
  };

  let currentSum = { production: 0, maintenance: 0, construction: 0, logistics: 0 };
  facilitiesData.forEach(f => {
    if (f.type === 'Oil Refinery' && f.workforceMatrix) {
      currentSum.production += f.workforceMatrix.production.employee;
      currentSum.maintenance += f.workforceMatrix.maintenance.employee;
      currentSum.construction += f.workforceMatrix.construction.employee;
      currentSum.logistics += f.workforceMatrix.logistics.employee;
    }
  });

  const largest = facilitiesData.filter(f => f.type === 'Oil Refinery').sort((a,b) => b.capacity - a.capacity)[0];
  if (largest && largest.workforceMatrix) {
    const diffProd = targetBLS.production - currentSum.production;
    const diffMaint = targetBLS.maintenance - currentSum.maintenance;
    const diffConst = targetBLS.construction - currentSum.construction;
    const diffLog = targetBLS.logistics - currentSum.logistics;

    largest.workforceMatrix.production.employee += diffProd;
    largest.workforceMatrix.production.total += diffProd;
    
    largest.workforceMatrix.maintenance.employee += diffMaint;
    largest.workforceMatrix.maintenance.total += diffMaint;
    
    largest.workforceMatrix.construction.employee += diffConst;
    largest.workforceMatrix.construction.total += diffConst;
    
    largest.workforceMatrix.logistics.employee += diffLog;
    largest.workforceMatrix.logistics.total += diffLog;
  }

  fs.writeFileSync(FACILITIES_FILE, JSON.stringify(facilitiesData, null, 2));
  console.log(`Successfully updated ${FACILITIES_FILE} with workforce matrices.`);
}

main();
