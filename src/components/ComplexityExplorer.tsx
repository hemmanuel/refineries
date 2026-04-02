import React, { useMemo, useState } from 'react';
import { type ParsedRefinery, PADD_NAMES } from '../utils/data';
import { X, TrendingUp, Factory, Settings, ChevronDown, ChevronUp } from 'lucide-react';

export type ComplexityCategory = 'nci' | 'edc' | 'units';

interface ComplexityExplorerProps {
  category: ComplexityCategory;
  refineries: ParsedRefinery[];
  onClose: () => void;
  onSelectRefinery: (refinery: ParsedRefinery) => void;
}

const ComplexityExplorer: React.FC<ComplexityExplorerProps> = ({ category, refineries, onClose, onSelectRefinery }) => {
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const data = useMemo(() => {
    let filtered = [...refineries].filter(r => r.type === 'Oil Refinery');
    
    if (category === 'nci') {
      filtered = filtered.filter(r => r.nci && r.nci > 1.0);
      filtered.sort((a, b) => sortOrder === 'desc' ? (b.nci || 0) - (a.nci || 0) : (a.nci || 0) - (b.nci || 0));
    } else if (category === 'edc') {
      filtered = filtered.filter(r => r.edc && r.edc > 0);
      filtered.sort((a, b) => sortOrder === 'desc' ? (b.edc || 0) - (a.edc || 0) : (a.edc || 0) - (b.edc || 0));
    } else if (category === 'units') {
      // Sort by the number of secondary processing units
      filtered = filtered.filter(r => r.units && Object.keys(r.units).length > 0);
      filtered.sort((a, b) => {
        const aCount = Object.keys(a.units || {}).length;
        const bCount = Object.keys(b.units || {}).length;
        return sortOrder === 'desc' ? bCount - aCount : aCount - bCount;
      });
    }

    return filtered;
  }, [refineries, category, sortOrder]);

  const getTitle = () => {
    switch (category) {
      case 'nci': return 'Refineries by Nelson Complexity Index (NCI)';
      case 'edc': return 'Refineries by Equivalent Distillation Capacity (EDC)';
      case 'units': return 'Refineries by Number of Processing Units';
    }
  };

  const getIcon = () => {
    switch (category) {
      case 'nci': return <TrendingUp className="w-6 h-6 text-purple-600" />;
      case 'edc': return <Factory className="w-6 h-6 text-indigo-600" />;
      case 'units': return <Settings className="w-6 h-6 text-gray-600" />;
    }
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/50 z-[4000] transition-opacity" 
        onClick={onClose}
      />
      <div className="fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-[4001] flex flex-col">
        <div className="flex-none p-6 border-b border-gray-200 bg-white sticky top-0 z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              {getIcon()}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{getTitle()}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {data.length} facilities found
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Refinery
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Region
                  </th>
                  <th 
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                  >
                    <div className="flex items-center justify-end gap-1">
                      {category === 'nci' ? 'NCI' : category === 'edc' ? 'EDC' : 'Units'}
                      {sortOrder === 'desc' ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item) => (
                  <tr 
                    key={item.id}
                    onClick={() => onSelectRefinery(item)}
                    className="hover:bg-blue-50 cursor-pointer transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                        {item.name}
                      </div>
                      <div className="text-xs text-gray-500">{item.company}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{item.state}</div>
                      <div className="text-xs text-gray-500">PADD {item.padd}</div>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {category === 'nci' && (
                        <span className="text-sm font-bold text-purple-700">{item.nci?.toFixed(2)}</span>
                      )}
                      {category === 'edc' && (
                        <span className="text-sm font-bold text-indigo-700">{(item.edc! / 1000000).toFixed(2)}M</span>
                      )}
                      {category === 'units' && (
                        <span className="text-sm font-bold text-gray-700">{Object.keys(item.units || {}).length}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
};

export default ComplexityExplorer;