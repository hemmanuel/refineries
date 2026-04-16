import React, { useState } from 'react';
import { type ParsedRefinery, WORKFORCE_CATEGORY_LABELS, type WorkforceMatrix } from '../utils/data';
import { X, Factory, Users, HardHat, Calendar, ChevronRight, AlertTriangle, FileText, TrendingUp } from 'lucide-react';
import MetricExplanation from './MetricExplanation';
import OshaDetail from './OshaDetail';
import nciFactorsData from '../data/nci_factors.json';

const NCI_FACTORS = nciFactorsData.factors as Record<string, number>;

interface RefineryDetailProps {
  refinery: ParsedRefinery | null;
  onClose: () => void;
  mode?: 'modal' | 'sidebar';
}

const RefineryDetail: React.FC<RefineryDetailProps> = ({ refinery, onClose, mode = 'modal' }) => {
  const [selectedMetric, setSelectedMetric] = useState<'headcount' | 'turnaround' | 'safety' | 'nci' | 'edc' | null>(null);
  const [selectedOshaYear, setSelectedOshaYear] = useState<number | null>(null);

  if (!refinery) return null;

  const estimate = refinery.estimate;

  const generateNciExplanation = () => {
    if (!refinery.units || Object.keys(refinery.units).length === 0) {
      return `The Nelson Complexity Index (NCI) measures the secondary conversion capacity of a petroleum refinery relative to the primary distillation capacity. Calculated using the 1998 Oil & Gas Journal complexity factors. Base CDU = 1.0.\n\nThis refinery has an NCI of ${(refinery.nci || 1.0).toFixed(2)}. Detailed unit breakdown is not available for this facility.`;
    }

    let explanation = `The Nelson Complexity Index (NCI) measures the secondary conversion capacity of a petroleum refinery relative to the primary distillation capacity (${refinery.capacity.toLocaleString()} BPD). Calculated using the 1998 Oil & Gas Journal complexity factors.\n\nCalculation Breakdown:\n\n`;
    
    explanation += `• Crude Distillation (Base): 1.00\n`;

    let calculatedNci = 1.0;
    
    const unitContributions = Object.entries(refinery.units).map(([unit, capacity]) => {
      const factor = NCI_FACTORS[unit] || 1.0;
      const ratio = capacity / refinery.capacity;
      const contribution = ratio * factor;
      return { unit, capacity, factor, ratio, contribution };
    }).sort((a, b) => b.contribution - a.contribution);

    unitContributions.forEach(({ unit, capacity, factor, contribution }) => {
      explanation += `• ${unit}: ${capacity.toLocaleString()} BPD\n  └─ (${capacity.toLocaleString()} / ${refinery.capacity.toLocaleString()}) × ${factor.toFixed(1)} factor = +${contribution.toFixed(2)}\n`;
      calculatedNci += contribution;
    });

    explanation += `\nTotal NCI: ${calculatedNci.toFixed(2)}`;
    
    return explanation;
  };

  const generateEdcExplanation = () => {
    const nci = refinery.nci || 1.0;
    const capacity = refinery.capacity || 0;
    const edc = refinery.edc || 0;

    return `Equivalent Distillation Capacity (EDC) normalizes the scale and complexity of the refinery into a single metric. \n\nEDC represents the equivalent size of a simple distillation plant that would require the same capital and operational intensity.\n\nCalculation:\n\n• Nameplate Capacity: ${capacity.toLocaleString()} BPD\n• Nelson Complexity Index (NCI): ${nci.toFixed(2)}\n\nEDC = ${capacity.toLocaleString()} × ${nci.toFixed(2)} = ${edc.toLocaleString()} complexity-barrels`;
  };

  const containerClasses = mode === 'modal'
    ? "fixed right-0 top-0 h-full w-full md:w-1/2 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-[3001] overflow-y-auto border-l border-gray-200"
    : "h-full w-full bg-white overflow-y-auto border-l border-gray-200";

  return (
    <>
      {mode === 'modal' && (
        <div 
          className="fixed inset-0 bg-black/50 z-[3000] transition-opacity" 
          onClick={onClose}
        />
      )}
      <div className={containerClasses}>
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{refinery.name}</h2>
              <p className="text-sm text-gray-500 mt-1">{refinery.company}</p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Factory className="w-4 h-4" />
                Operational Data
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Capacity (BPD)</p>
                  <p className="text-lg font-mono font-medium text-gray-900">
                    {refinery.capacity.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">PADD Region</p>
                  <p className="text-lg font-mono font-medium text-gray-900">
                    {refinery.padd}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Complexity (NCI)</p>
                  <p className="text-lg font-mono font-medium text-gray-900">
                    {refinery.nci ? refinery.nci.toFixed(2) : '1.00'}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm font-medium text-gray-900">
                    {refinery.state} ({refinery.lat.toFixed(4)}, {refinery.lng.toFixed(4)})
                  </p>
                </div>
                {refinery.edc && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500">Equivalent Distillation Capacity (EDC)</p>
                    <p className="text-sm font-medium text-gray-900">
                      {refinery.edc.toLocaleString()} complexity-barrels
                    </p>
                  </div>
                )}
                {refinery.units && Object.keys(refinery.units).length > 0 && (
                  <div className="col-span-2">
                    <p className="text-xs text-gray-500 mb-1">Processing Units</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.keys(refinery.units).map(unit => (
                        <span key={unit} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800">
                          {unit}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Complexity & Workforce Estimates
              </h3>
              
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {refinery.nci && refinery.nci > 1.0 && (
                  <button 
                    onClick={() => setSelectedMetric('nci')}
                    className="w-full bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-purple-400 hover:shadow-md transition-all text-left group relative"
                  >
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
                        Nelson Complexity Index (NCI)
                      </span>
                      <span className="text-xl font-bold text-purple-600 group-hover:text-purple-700 transition-colors">
                        {refinery.nci.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 group-hover:text-gray-500">
                      Relative secondary conversion capacity
                    </p>
                  </button>
                )}

                {refinery.edc && refinery.edc > 0 && (
                  <button 
                    onClick={() => setSelectedMetric('edc')}
                    className="w-full bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all text-left group relative"
                  >
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <Factory className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                        Equivalent Distillation Capacity
                      </span>
                      <span className="text-xl font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors">
                        {(refinery.edc / 1000000).toFixed(2)}M
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 group-hover:text-gray-500">
                      Complexity-Barrels (Capacity × NCI)
                    </p>
                  </button>
                )}

                {!estimate ? (
                  <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="text-sm text-blue-800 mb-4">
                      No workforce estimate data available for this facility.
                    </p>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => setSelectedMetric('headcount')}
                    className="w-full bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-blue-400 hover:shadow-md transition-all text-left group relative"
                  >
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5 text-blue-400" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        Total Headcount
                      </span>
                      <span className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                        ~{estimate.totalHeadcount.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 group-hover:text-gray-500">
                      Includes FTEs and long-term contractors
                    </p>
                  </button>

                  <button 
                    onClick={() => setSelectedMetric('turnaround')}
                    className="w-full bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-orange-400 hover:shadow-md transition-all text-left group relative"
                  >
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
                        Turnaround Peak
                      </span>
                      <span className="text-xl font-bold text-orange-600 group-hover:text-orange-700 transition-colors">
                        ~{estimate.turnaroundHeadcount.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: '75%' }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 group-hover:text-gray-500">
                      Additional seasonal workers during major maintenance
                    </p>
                  </button>

                  <button 
                    onClick={() => setSelectedMetric('safety')}
                    className="w-full bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:border-green-400 hover:shadow-md transition-all text-left group relative"
                  >
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-600 flex items-center gap-2">
                        <HardHat className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
                        Safety Sensitive
                      </span>
                      <span className="text-xl font-bold text-green-600 group-hover:text-green-700 transition-colors">
                        ~{estimate.safetySensitive.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-1.5">
                      <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '40%' }}></div>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 group-hover:text-gray-500">
                      Roles with critical safety impact
                    </p>
                  </button>
                  </>
                )}
              </div>
            </div>

            {refinery.workforceMatrix && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-600" />
                  Workforce Breakdown
                </h3>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm mb-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Function</th>
                          <th scope="col" className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Employees</th>
                          <th scope="col" className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Contractors</th>
                          <th scope="col" className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        </tr>
                      </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Object.entries(refinery.workforceMatrix).map(([key, data]) => (
                            <tr key={key} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-2 whitespace-nowrap font-medium text-gray-900">{WORKFORCE_CATEGORY_LABELS[key as keyof WorkforceMatrix]}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-right text-gray-500">{data.employee.toLocaleString()}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-right text-gray-500">{data.contractor.toLocaleString()}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-right font-medium text-gray-900">{data.total.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                          <tr>
                            <td className="px-4 py-3 whitespace-nowrap font-bold text-gray-900">Total (Excl. Turnaround)</td>
                            <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-gray-900">
                              {Object.entries(refinery.workforceMatrix).filter(([k]) => k !== 'turnaround').reduce((sum, [, d]) => sum + d.employee, 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right font-bold text-gray-900">
                              {Object.entries(refinery.workforceMatrix).filter(([k]) => k !== 'turnaround').reduce((sum, [, d]) => sum + d.contractor, 0).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right font-black text-gray-900">
                              {Object.entries(refinery.workforceMatrix).filter(([k]) => k !== 'turnaround').reduce((sum, [, d]) => sum + d.total, 0).toLocaleString()}
                            </td>
                          </tr>
                        </tfoot>
                    </table>
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-indigo-900 mb-2">Methodology & Primary Sources</h4>
                  <p className="text-xs text-indigo-800 space-y-2">
                    <span className="block">Functional headcount distributions are derived directly from <strong>BLS OEWS NAICS 324100</strong> occupational data for direct employees.</span>
                    <span className="block mt-1">Based on the <strong>WWU Washington State Refinery Study</strong>, routine contractor utilization is allocated heavily to the Maintenance function (86% contractors), with Technical, Logistics, HSSE, and Support modeled as direct-hire functions based on BLS OEWS distributions. <strong>USW</strong> labor records inform the near-100% direct employee requirement for core operations.</span>
                    <span className="block mt-1">Turnaround contractor surges are derived from verified federal disaster investigations, specifically the <strong>CSB BP Texas City Report</strong>.</span>
                  </p>
                </div>
              </div>
            )}

            {refinery.oshaHistory && refinery.oshaHistory.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  Safety Performance
                  {refinery.hasRealOshaData && (
                    <span className="ml-2 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                      Official Data
                    </span>
                  )}
                </h3>
                
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recordable Injuries</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TRIR</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {refinery.oshaHistory.map((record) => (
                        <tr 
                          key={record.year} 
                          className="hover:bg-gray-50 cursor-pointer transition-colors group"
                          onClick={() => setSelectedOshaYear(record.year)}
                        >
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center gap-2">
                            <FileText className="w-3 h-3 text-gray-400 group-hover:text-blue-500" />
                            {record.year}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{record.recordableInjuries}</td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{record.trir}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {refinery.safetySummary && (
                  <div className="mt-4 bg-red-50 border border-red-100 rounded-lg p-4">
                    <p className="text-sm text-red-800">
                      <span className="font-semibold">Analysis:</span> {refinery.safetySummary}
                    </p>
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-2 italic">
                  * {refinery.hasRealOshaData 
                      ? "Data sourced from official OSHA Form 300A filings." 
                      : "Data is estimated based on facility size and industry averages. Actual OSHA logs may vary."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedMetric && (
        <MetricExplanation
          refinery={refinery}
          metric={selectedMetric}
          value={
            selectedMetric === 'headcount' ? (estimate?.totalHeadcount || 0) :
            selectedMetric === 'turnaround' ? (estimate?.turnaroundHeadcount || 0) :
            selectedMetric === 'safety' ? (estimate?.safetySensitive || 0) :
            selectedMetric === 'nci' ? (refinery.nci || 1.0) :
            (refinery.edc || 0)
          }
          explanation={
            selectedMetric === 'nci' ? generateNciExplanation() :
            selectedMetric === 'edc' ? generateEdcExplanation() :
            (estimate?.explanations && (
                selectedMetric === 'headcount' ? estimate.explanations.totalHeadcount :
                selectedMetric === 'turnaround' ? estimate.explanations.turnaroundHeadcount :
                estimate.explanations.safetySensitive
            )) || "No detailed explanation available."
          }
          onClose={() => setSelectedMetric(null)}
        />
      )}
      {selectedOshaYear && refinery.oshaHistory && (
        <OshaDetail
          refinery={refinery}
          year={selectedOshaYear}
          data={refinery.oshaHistory.find(r => r.year === selectedOshaYear)!}
          onClose={() => setSelectedOshaYear(null)}
        />
      )}
    </>
  );
};

export default RefineryDetail;
