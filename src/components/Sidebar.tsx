import React, { useState, useMemo } from 'react';
import { type ParsedRefinery, getPaddColor } from '../utils/data';
import { Search, Filter, MapPin, Building2, Droplets } from 'lucide-react';

interface SidebarProps {
  refineries: ParsedRefinery[];
  onSelectRefinery: (refinery: ParsedRefinery) => void;
  selectedRefineryId: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({ refineries, onSelectRefinery, selectedRefineryId }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [paddFilter, setPaddFilter] = useState<number | 'all'>('all');

  const filteredRefineries = useMemo(() => {
    return refineries.filter((refinery) => {
      const matchesSearch = 
        refinery.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refinery.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        refinery.state.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPadd = paddFilter === 'all' || refinery.padd === paddFilter;

      return matchesSearch && matchesPadd;
    });
  }, [refineries, searchTerm, paddFilter]);

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 shadow-lg w-full max-w-md">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <Droplets className="w-6 h-6 text-blue-600" />
          US Refinery Explorer
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {refineries.length} refineries loaded
        </p>
      </div>

      <div className="p-4 space-y-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search refineries, companies..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <button
            className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors ${
              paddFilter === 'all' 
                ? 'bg-gray-800 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            onClick={() => setPaddFilter('all')}
          >
            All PADDs
          </button>
          {[1, 2, 3, 4, 5].map((padd) => (
            <button
              key={padd}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap transition-colors flex items-center gap-1 ${
                paddFilter === padd 
                  ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              onClick={() => setPaddFilter(padd)}
            >
              <span 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: getPaddColor(padd) }}
              />
              PADD {padd}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredRefineries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No refineries found matching your criteria.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredRefineries.map((refinery) => (
              <button
                key={refinery.id}
                onClick={() => onSelectRefinery(refinery)}
                className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-start gap-3 group ${
                  selectedRefineryId === refinery.id ? 'bg-blue-50 border-l-4 border-blue-500' : 'border-l-4 border-transparent'
                }`}
              >
                <div 
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-xs"
                  style={{ backgroundColor: getPaddColor(refinery.padd) }}
                >
                  P{refinery.padd}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {refinery.name}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Building2 className="w-3 h-3" />
                    <span className="truncate">{refinery.company}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{refinery.state}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-medium text-gray-900">
                    {(refinery.capacity / 1000).toFixed(1)}k
                  </div>
                  <div className="text-[10px] text-gray-400 uppercase">bpd</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
