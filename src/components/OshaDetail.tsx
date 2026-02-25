import React from 'react';
import { X, AlertTriangle, FileText, Clock, Activity, AlertCircle } from 'lucide-react';
import { type ParsedRefinery, type OshaYearData } from '../utils/data';

interface OshaDetailProps {
  refinery: ParsedRefinery;
  year: number;
  data: OshaYearData;
  onClose: () => void;
}

const OshaDetail: React.FC<OshaDetailProps> = ({ refinery, year, data, onClose }) => {
  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-[3002] transition-opacity" 
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[3003] flex items-center justify-center p-4 pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden pointer-events-auto animate-in zoom-in-95 duration-200">
          <div className="p-6 border-b border-gray-100 flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="bg-red-100 p-1.5 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900">OSHA 300A Summary</h2>
              </div>
              <p className="text-sm text-gray-500 ml-9">
                {refinery.name} • {year} Filing
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase">Total Recordable</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.recordableInjuries}</p>
                <p className="text-xs text-gray-400 mt-1">Injuries & Illnesses</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase">DART Rate</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{data.dart}</p>
                <p className="text-xs text-gray-400 mt-1">Days Away / Restricted</p>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-gray-400" />
                Injury Breakdown
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Deaths</span>
                    <span className="font-medium text-gray-900">{data.deaths || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Skin Disorders</span>
                    <span className="font-medium text-gray-900">{data.skinDisorders || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Days Away (DAFW)</span>
                    <span className="font-medium text-gray-900">{data.dafw || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Respiratory</span>
                    <span className="font-medium text-gray-900">{data.respiratory || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Job Transfer (DJTR)</span>
                    <span className="font-medium text-gray-900">{data.djtr || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Poisonings</span>
                    <span className="font-medium text-gray-900">{data.poisonings || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Other Cases</span>
                    <span className="font-medium text-gray-900">{data.other || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hearing Loss</span>
                    <span className="font-medium text-gray-900">{data.hearingLoss || 0}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" />
                Key Metrics
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600">Total Hours Worked</span>
                  <span className="text-sm font-mono font-medium text-gray-900">
                    {data.hoursWorked?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600">TRIR (Incident Rate)</span>
                  <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded ${
                    data.trir > 1.0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {data.trir}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600">Source</span>
                  <span className="text-xs text-gray-400 italic">
                    {data.notes}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-blue-900">About this Data</h4>
                <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                  This data comes directly from the establishment's OSHA 300A Annual Summary. 
                  TRIR is calculated as (Total Recordable Cases × 200,000) / Total Hours Worked.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default OshaDetail;
