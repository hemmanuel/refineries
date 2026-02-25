import React, { useState } from 'react';
import { type ParsedRefinery } from '../utils/data';
import { X, Factory, Users, HardHat, Calendar, AlertCircle, ChevronRight } from 'lucide-react';
import MetricExplanation from './MetricExplanation';

interface RefineryDetailProps {
  refinery: ParsedRefinery | null;
  onClose: () => void;
}

const RefineryDetail: React.FC<RefineryDetailProps> = ({ refinery, onClose }) => {
  const [selectedMetric, setSelectedMetric] = useState<'headcount' | 'turnaround' | 'safety' | null>(null);

  if (!refinery) return null;

  const estimate = refinery.estimate;

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-[3000] transition-opacity" 
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-[3001] overflow-y-auto border-l border-gray-200">
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
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm font-medium text-gray-900">
                    {refinery.state} ({refinery.lat.toFixed(4)}, {refinery.lng.toFixed(4)})
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Workforce Estimates
              </h3>
              
              {!estimate ? (
                <div className="text-center py-8 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-800 mb-4">
                    No estimate data available for this refinery.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
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

                  <div className="flex items-center gap-2 text-xs text-gray-400 mt-4 justify-center bg-gray-50 py-2 rounded">
                    <AlertCircle className="w-3 h-3" />
                    <span>Generated by AI based on facility characteristics</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {selectedMetric && estimate && (
        <MetricExplanation
          refinery={refinery}
          metric={selectedMetric}
          value={
            selectedMetric === 'headcount' ? estimate.totalHeadcount :
            selectedMetric === 'turnaround' ? estimate.turnaroundHeadcount :
            estimate.safetySensitive
          }
          explanation={
            (estimate.explanations && (
                selectedMetric === 'headcount' ? estimate.explanations.totalHeadcount :
                selectedMetric === 'turnaround' ? estimate.explanations.turnaroundHeadcount :
                estimate.explanations.safetySensitive
            )) || "No detailed explanation available."
          }
          onClose={() => setSelectedMetric(null)}
        />
      )}
    </>
  );
};

export default RefineryDetail;
