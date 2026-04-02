import React from 'react';
import { type ParsedRefinery } from '../utils/data';
import { X, Info, CheckCircle2 } from 'lucide-react';

interface MetricExplanationProps {
  refinery: ParsedRefinery;
  metric: 'headcount' | 'turnaround' | 'safety' | 'count' | 'capacity' | 'nci' | 'edc' | 'units';
  value: number | string;
  explanation: string;
  onClose: () => void;
}

const MetricExplanation: React.FC<MetricExplanationProps> = ({ refinery, metric, value, explanation, onClose }) => {
  const metricTitles = {
    headcount: "Total Headcount Analysis",
    turnaround: "Turnaround Peak Analysis",
    safety: "Safety Sensitive Roles Analysis",
    count: "Refinery Count Analysis",
    capacity: "Total Capacity Analysis",
    nci: "Nelson Complexity Index (NCI)",
    edc: "Equivalent Distillation Capacity (EDC)",
    units: "Processing Units Analysis"
  };

  const metricDescriptions = {
    headcount: "Full-time employees (FTE) plus long-term contractors essential for daily operations.",
    turnaround: "Peak additional workforce required during major maintenance events (turnarounds).",
    safety: "Personnel in safety-critical roles (operations, maintenance, emergency response).",
    count: "Total number of operable refineries in the selected region.",
    capacity: "Total crude oil distillation capacity in Barrels Per Stream Day (BPSD).",
    nci: "A measure of the secondary conversion capacity of a petroleum refinery relative to its primary distillation capacity.",
    edc: "A metric that normalizes the scale and complexity of the refinery into a single value (Complexity-Barrels).",
    units: "The specific secondary processing units operating at this facility."
  };

  return (
    <div 
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[3002] flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              {metricTitles[metric]}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {refinery.name} • {refinery.company}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto">
          
          {/* Key Stat */}
          <div className="flex items-center gap-4 mb-8 bg-blue-50 p-4 rounded-lg border border-blue-100">
            <div className="bg-white p-3 rounded-full shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800 uppercase tracking-wide">Estimated Value</p>
              <p className="text-3xl font-bold text-gray-900">
                {typeof value === 'number' && metric !== 'nci' && metric !== 'capacity' && metric !== 'edc' ? `~${value.toLocaleString()}` : ''}
                {metric === 'nci' && typeof value === 'number' ? value.toFixed(2) : ''}
                {metric === 'capacity' && typeof value === 'number' ? `${value.toLocaleString()} bpd` : ''}
                {metric === 'edc' && typeof value === 'number' ? `${value.toLocaleString()} complexity-barrels` : ''}
                {typeof value === 'string' ? value : ''}
              </p>
              <p className="text-xs text-blue-600 mt-1">{metricDescriptions[metric]}</p>
            </div>
          </div>

          {/* AI Explanation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">
              Detailed Justification
            </h3>
            
            <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed text-sm">
              {explanation.split('\n\n').map((paragraph, idx) => (
                paragraph.trim() && <p key={idx} className="mb-4 whitespace-pre-wrap">{paragraph}</p>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-xs text-gray-400 flex justify-end items-center">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium transition-colors shadow-sm"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default MetricExplanation;
