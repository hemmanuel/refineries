import React, { useMemo, useState } from 'react';
import { type ParsedRefinery } from '../utils/data';
import { X, Factory, MapPin, ChevronRight } from 'lucide-react';
import MetricExplanation from './MetricExplanation';

interface CompanyProfileProps {
  companyName: string;
  refineries: ParsedRefinery[];
  onClose: () => void;
  onSelectRefinery: (refinery: ParsedRefinery) => void;
}

const CompanyProfile: React.FC<CompanyProfileProps> = ({ companyName, refineries, onClose, onSelectRefinery }) => {
  const [selectedMetric, setSelectedMetric] = useState<'headcount' | 'safety' | null>(null);

  const companyRefineries = useMemo(() => {
    return refineries.filter(r => r.company === companyName);
  }, [refineries, companyName]);

  const totalCapacity = useMemo(() => {
    return companyRefineries.reduce((acc, curr) => acc + curr.capacity, 0);
  }, [companyRefineries]);

  const totalHeadcount = useMemo(() => {
    return companyRefineries.reduce((acc, curr) => acc + (curr.estimate?.totalHeadcount || 0), 0);
  }, [companyRefineries]);

  const totalSafety = useMemo(() => {
    return companyRefineries.reduce((acc, curr) => acc + (curr.estimate?.safetySensitive || 0), 0);
  }, [companyRefineries]);

  const getCompanyExplanation = (metric: 'headcount' | 'safety') => {
    const ratio = (totalHeadcount / (totalCapacity / 1000)).toFixed(2);
    const safetyPct = ((totalSafety / totalHeadcount) * 100).toFixed(0);

    if (metric === 'headcount') {
      return `This represents the estimated total workforce across all ${companyRefineries.length} ${companyName} refineries. \n\nAggregate Metric: ~${ratio} personnel per 1,000 bpd. This reflects ${companyName}'s overall operational scale and efficiency across its portfolio.`;
    }
    if (metric === 'safety') {
      return `This estimates the total number of safety-sensitive personnel across ${companyName}'s portfolio. \n\nAggregate Metric: ~${safetyPct}% of the total workforce. This represents the core operational staff critical for process safety management.`;
    }
    return '';
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[3000] flex justify-end">
        <div className="h-full w-full max-w-md bg-white shadow-2xl transform transition-transform duration-300 ease-in-out overflow-y-auto border-l border-gray-200">
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{companyName}</h2>
                <p className="text-sm text-gray-500 mt-1">Company Profile</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600 font-medium mb-1">Total Capacity</p>
                <p className="text-lg font-bold text-blue-900">{(totalCapacity / 1000).toFixed(0)}k <span className="text-sm font-normal">bpd</span></p>
              </div>
              
              <button 
                onClick={() => setSelectedMetric('headcount')}
                className="bg-green-50 p-3 rounded-lg border border-green-100 hover:bg-green-100 transition-colors text-left relative group"
              >
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-3 h-3 text-green-600" />
                </div>
                <p className="text-xs text-green-600 font-medium mb-1">Total Headcount</p>
                <p className="text-lg font-bold text-green-900">~{totalHeadcount.toLocaleString()}</p>
              </button>

              <button 
                onClick={() => setSelectedMetric('safety')}
                className="bg-orange-50 p-3 rounded-lg border border-orange-100 hover:bg-orange-100 transition-colors text-left col-span-2 relative group"
              >
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-orange-600 font-medium mb-1">Safety Sensitive</p>
                    <p className="text-lg font-bold text-orange-900">~{totalSafety.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-orange-500">Est. Critical Roles</p>
                  </div>
                </div>
              </button>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Factory className="w-5 h-5 text-gray-500" />
              Facilities ({companyRefineries.length})
            </h3>

            <div className="space-y-3">
              {companyRefineries.map((refinery) => (
                <button
                  key={refinery.id}
                  onClick={() => onSelectRefinery(refinery)}
                  className="w-full text-left p-4 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {refinery.name}
                    </h4>
                    <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600">
                      {refinery.capacity.toLocaleString()} bpd
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    {refinery.city ? `${refinery.city}, ` : ''}{refinery.state} (PADD {refinery.padd})
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {selectedMetric && (
        <MetricExplanation
          refinery={{
            name: `${companyName} Portfolio`,
            company: companyName,
            state: 'Multiple Locations',
            padd: 0,
            capacity: totalCapacity,
            lat: 0,
            lng: 0,
            id: 'company-aggregate',
            type: 'Oil Refinery'
          }}
          metric={selectedMetric === 'safety' ? 'safety' : 'headcount'}
          value={selectedMetric === 'safety' ? totalSafety : totalHeadcount}
          explanation={getCompanyExplanation(selectedMetric)}
          onClose={() => setSelectedMetric(null)}
        />
      )}
    </>
  );
};

export default CompanyProfile;