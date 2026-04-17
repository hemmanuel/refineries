import React, { useMemo, useState } from 'react';
import { type ParsedRefinery } from '../utils/data';
import { Users, Factory, ChevronLeft, Search, Droplet, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import RefineryDetail from './RefineryDetail';

interface OperatorsExplorerProps {
  refineries: ParsedRefinery[];
  onBack: () => void;
}

const OperatorsExplorer: React.FC<OperatorsExplorerProps> = ({ refineries, onBack }) => {
  const [expandedOperator, setExpandedOperator] = useState<string | null>(null);
  const [selectedRefinery, setSelectedRefinery] = useState<ParsedRefinery | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const operatorStats = useMemo(() => {
    const stats: Record<string, { 
      name: string;
      count: number; 
      capacity: number; 
      headcount: number;
      refineries: ParsedRefinery[];
    }> = {};

    refineries.forEach(r => {
      if (!stats[r.company]) {
        stats[r.company] = { 
          name: r.company,
          count: 0, 
          capacity: 0, 
          headcount: 0,
          refineries: []
        };
      }
      stats[r.company].count++;
      stats[r.company].capacity += r.capacity;
      stats[r.company].headcount += (r.estimate?.totalHeadcount || 0);
      stats[r.company].refineries.push(r);
    });

    return Object.values(stats).sort((a, b) => b.capacity - a.capacity);
  }, [refineries]);

  const filteredOperators = useMemo(() => {
    if (!searchTerm) return operatorStats;
    const lowerTerm = searchTerm.toLowerCase();
    return operatorStats.filter(op => 
      op.name.toLowerCase().includes(lowerTerm) || 
      op.refineries.some(r => r.name.toLowerCase().includes(lowerTerm) || r.state.toLowerCase().includes(lowerTerm))
    );
  }, [operatorStats, searchTerm]);

  const toggleOperator = (operatorName: string) => {
    if (expandedOperator === operatorName) {
      setExpandedOperator(null);
    } else {
      setExpandedOperator(operatorName);
    }
  };

  return (
    <div className="h-full w-full bg-gray-50 overflow-y-auto p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Operators Explorer</h1>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search operators or refineries..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-64"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {filteredOperators.map((op, idx) => (
            <div key={op.name} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all hover:shadow-md">
              <button 
                onClick={() => toggleOperator(op.name)}
                className="w-full px-6 py-5 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 font-bold text-lg">
                    {idx + 1}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-bold text-gray-900">{op.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <Factory className="w-4 h-4" /> {op.count} Refineries
                      </span>
                      <span className="flex items-center gap-1">
                        <Droplet className="w-4 h-4" /> {(op.capacity / 1000).toFixed(0)}k bpd
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" /> ~{op.headcount.toLocaleString()} Routine Workforce
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-gray-400">
                  {expandedOperator === op.name ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                </div>
              </button>

              {expandedOperator === op.name && (
                <div className="border-t border-gray-100 bg-gray-50 p-6 animate-in slide-in-from-top-2 duration-200">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Refinery Portfolio</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {op.refineries.map(refinery => (
                      <button 
                        key={refinery.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRefinery(refinery);
                        }}
                        className="flex flex-col p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-sm transition-all text-left group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1" title={refinery.name}>
                            {refinery.name}
                          </span>
                          <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-600 whitespace-nowrap">
                            {(refinery.capacity / 1000).toFixed(0)}k bpd
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-auto">
                          <MapPin className="w-3 h-3" />
                          {refinery.city}, {refinery.state} (PADD {refinery.padd})
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedRefinery && (
        <RefineryDetail 
          refinery={selectedRefinery} 
          onClose={() => setSelectedRefinery(null)} 
        />
      )}
    </div>
  );
};

export default OperatorsExplorer;
