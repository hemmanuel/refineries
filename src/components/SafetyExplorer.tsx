import React, { useMemo, useState } from 'react';
import { X, Map, Factory, TrendingUp, ChevronRight, ChevronLeft } from 'lucide-react';
import { type ParsedRefinery, PADD_NAMES } from '../utils/data';

export type SafetyCategory = 'refineries' | 'regions' | 'operators';

interface SafetyExplorerProps {
  category: SafetyCategory;
  refineries: ParsedRefinery[];
  onClose: () => void;
  onSelectRefinery: (refinery: ParsedRefinery) => void;
}

interface SafetyExplorerItem {
  id: string | number;
  label: string;
  subLabel: string;
  value: number;
  secondaryValue: number;
  refinery: ParsedRefinery | null;
  paddId?: number;
  operatorId?: string;
}

const SafetyExplorer: React.FC<SafetyExplorerProps> = ({ category, refineries, onClose, onSelectRefinery }) => {
  const [selectedRegion, setSelectedRegion] = useState<number | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<string | null>(null);
  const [sortMetric, setSortMetric] = useState<'trir' | 'injuries'>('trir');
  
  const data = useMemo<SafetyExplorerItem[]>(() => {
    const withData = refineries.filter(r => r.hasRealOshaData && r.oshaHistory?.length);

    if (category === 'refineries') {
      return withData
        .map(r => {
            const latest = r.oshaHistory![0];
            return {
                id: r.id,
                label: r.name,
                subLabel: r.company,
                value: latest.recordableInjuries,
                secondaryValue: latest.trir,
                refinery: r
            };
        })
        .sort((a, b) => b.secondaryValue - a.secondaryValue);
    }

    if (category === 'operators') {
      const stats: Record<string, { injuries: number, hours: number, count: number, totalTrir: number }> = {};
      withData.forEach(r => {
        const latest = r.oshaHistory![0];
        if (!stats[r.company]) stats[r.company] = { injuries: 0, hours: 0, count: 0, totalTrir: 0 };
        stats[r.company].injuries += latest.recordableInjuries;
        stats[r.company].hours += (latest.hoursWorked || 0);
        stats[r.company].totalTrir += latest.trir;
        stats[r.company].count++;
      });

      return Object.entries(stats)
        .map(([company, stat]) => ({
            id: company,
            label: company,
            subLabel: `${stat.count} facilities reporting`,
            value: stat.injuries,
            secondaryValue: stat.count > 0 ? Number((stat.totalTrir / stat.count).toFixed(2)) : 0,
            refinery: null,
            operatorId: company
        }))
        .sort((a, b) => b.secondaryValue - a.secondaryValue);
    }

    if (category === 'regions') {
        const stats: Record<number, { injuries: number, hours: number, count: number, totalTrir: number }> = {};
        withData.forEach(r => {
          const latest = r.oshaHistory![0];
          if (!stats[r.padd]) stats[r.padd] = { injuries: 0, hours: 0, count: 0, totalTrir: 0 };
          stats[r.padd].injuries += latest.recordableInjuries;
          stats[r.padd].hours += (latest.hoursWorked || 0);
          stats[r.padd].totalTrir += latest.trir;
          stats[r.padd].count++;
        });
  
        return Object.entries(stats)
          .map(([padd, stat]) => ({
              id: padd,
              label: `PADD ${padd} - ${PADD_NAMES[Number(padd)]}`,
              subLabel: `${stat.count} facilities reporting`,
              value: stat.injuries,
              secondaryValue: stat.count > 0 ? Number((stat.totalTrir / stat.count).toFixed(2)) : 0,
              refinery: null,
              paddId: Number(padd)
          }))
          .sort((a, b) => b.secondaryValue - a.secondaryValue);
      }

    return [];
  }, [refineries, category]);

  const regionDetails = useMemo(() => {
    if (selectedRegion === null) return null;

    const regionRefineries = refineries.filter(r => 
        r.padd === selectedRegion && 
        r.hasRealOshaData && 
        r.oshaHistory?.length
    );

    const stats = regionRefineries.reduce((acc, curr) => {
        const latest = curr.oshaHistory![0];
        return {
            injuries: acc.injuries + latest.recordableInjuries,
            hours: acc.hours + (latest.hoursWorked || 0),
            totalTrir: acc.totalTrir + latest.trir,
            count: acc.count + 1,
            deaths: acc.deaths + (latest.deaths || 0),
            dafw: acc.dafw + (latest.dafw || 0),
            djtr: acc.djtr + (latest.djtr || 0)
        };
    }, { injuries: 0, hours: 0, totalTrir: 0, count: 0, deaths: 0, dafw: 0, djtr: 0 });

    const sortedRefineries = [...regionRefineries].sort((a, b) => {
        const aLatest = a.oshaHistory![0];
        const bLatest = b.oshaHistory![0];
        if (sortMetric === 'trir') {
            return bLatest.trir - aLatest.trir;
        }
        return bLatest.recordableInjuries - aLatest.recordableInjuries;
    });

    return {
        stats: {
            ...stats,
            avgTrir: stats.count > 0 ? stats.totalTrir / stats.count : 0,
            calcTrir: stats.hours > 0 ? (stats.injuries * 200000) / stats.hours : 0
        },
        refineries: sortedRefineries
    };
  }, [refineries, selectedRegion, sortMetric]);

  const operatorDetails = useMemo(() => {
    if (selectedOperator === null) return null;

    const operatorRefineries = refineries.filter(r => 
        r.company === selectedOperator && 
        r.hasRealOshaData && 
        r.oshaHistory?.length
    );

    const stats = operatorRefineries.reduce((acc, curr) => {
        const latest = curr.oshaHistory![0];
        return {
            injuries: acc.injuries + latest.recordableInjuries,
            hours: acc.hours + (latest.hoursWorked || 0),
            totalTrir: acc.totalTrir + latest.trir,
            count: acc.count + 1,
            deaths: acc.deaths + (latest.deaths || 0),
            dafw: acc.dafw + (latest.dafw || 0),
            djtr: acc.djtr + (latest.djtr || 0)
        };
    }, { injuries: 0, hours: 0, totalTrir: 0, count: 0, deaths: 0, dafw: 0, djtr: 0 });

    const sortedRefineries = [...operatorRefineries].sort((a, b) => {
        const aLatest = a.oshaHistory![0];
        const bLatest = b.oshaHistory![0];
        if (sortMetric === 'trir') {
            return bLatest.trir - aLatest.trir;
        }
        return bLatest.recordableInjuries - aLatest.recordableInjuries;
    });

    return {
        stats: {
            ...stats,
            avgTrir: stats.count > 0 ? stats.totalTrir / stats.count : 0,
            calcTrir: stats.hours > 0 ? (stats.injuries * 200000) / stats.hours : 0
        },
        refineries: sortedRefineries
    };
  }, [refineries, selectedOperator, sortMetric]);

  const getTitle = () => {
    if (selectedRegion !== null) {
        return `PADD ${selectedRegion} - ${PADD_NAMES[selectedRegion]}`;
    }
    if (selectedOperator !== null) {
        return `${selectedOperator} - Safety Overview`;
    }
    switch (category) {
        case 'refineries': return 'Refineries by Total Recordable Incident Rate (TRIR)';
        case 'operators': return 'Operators by Average Total Recordable Incident Rate (TRIR)';
        case 'regions': return 'Regions by Average Total Recordable Incident Rate (TRIR)';
    }
  };

  const getIcon = () => {
    switch (category) {
        case 'refineries': return <Factory className="w-6 h-6 text-red-600" />;
        case 'operators': return <TrendingUp className="w-6 h-6 text-red-600" />;
        case 'regions': return <Map className="w-6 h-6 text-red-600" />;
    }
  };

  if ((selectedRegion !== null && regionDetails) || (selectedOperator !== null && operatorDetails)) {
    const details = selectedRegion !== null ? regionDetails! : operatorDetails!;
    const backAction = selectedRegion !== null ? () => setSelectedRegion(null) : () => setSelectedOperator(null);
    const subtitle = selectedRegion !== null ? 'Regional Safety Overview' : 'Operator Safety Overview';
    const listTitle = selectedRegion !== null ? 'Refineries in Region' : 'Operated Refineries';

    return (
        <div className="fixed inset-0 z-[3000] bg-gray-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-3">
                    <button 
                        onClick={backAction}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors mr-2"
                    >
                        <ChevronLeft className="w-6 h-6 text-gray-600" />
                    </button>
                    <div className="bg-red-50 p-2 rounded-lg">
                        {selectedRegion !== null ? <Map className="w-6 h-6 text-red-600" /> : <TrendingUp className="w-6 h-6 text-red-600" />}
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">{getTitle()}</h1>
                        <p className="text-sm text-gray-500">{subtitle}</p>
                    </div>
                </div>
                <button 
                    onClick={onClose}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 text-gray-500" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
                <div className="max-w-6xl mx-auto space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="text-sm text-gray-500 mb-1">Total Injuries</div>
                            <div className="text-2xl font-bold text-gray-900">{details.stats.injuries}</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="text-sm text-gray-500 mb-1">Average TRIR</div>
                            <div className={`text-2xl font-bold ${details.stats.avgTrir > 1 ? 'text-red-600' : 'text-green-600'}`}>
                                {details.stats.avgTrir.toFixed(2)}
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="text-sm text-gray-500 mb-1">Total Hours Worked</div>
                            <div className="text-2xl font-bold text-gray-900">{(details.stats.hours / 1000000).toFixed(1)}M</div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                            <div className="text-sm text-gray-500 mb-1">Facilities Reporting</div>
                            <div className="text-2xl font-bold text-gray-900">{details.stats.count}</div>
                        </div>
                    </div>

                    {/* Refineries List */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="font-semibold text-gray-900">{listTitle}</h2>
                            <div className="flex items-center gap-2 text-sm bg-gray-100 p-1 rounded-lg">
                                <button
                                    onClick={() => setSortMetric('trir')}
                                    className={`px-3 py-1.5 rounded-md transition-all ${sortMetric === 'trir' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Sort by TRIR
                                </button>
                                <button
                                    onClick={() => setSortMetric('injuries')}
                                    className={`px-3 py-1.5 rounded-md transition-all ${sortMetric === 'injuries' ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-600 hover:text-gray-900'}`}
                                >
                                    Sort by Injuries
                                </button>
                            </div>
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Refinery</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Injuries</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Hours</th>
                                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">TRIR</th>
                                    <th className="px-6 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {details.refineries.map((refinery) => {
                                    const latest = refinery.oshaHistory![0];
                                    return (
                                        <tr 
                                            key={refinery.id}
                                            onClick={() => onSelectRefinery(refinery)}
                                            className="hover:bg-gray-50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900 group-hover:text-blue-600">{refinery.name}</div>
                                                <div className="text-xs text-gray-500">{refinery.company}</div>
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-gray-900">
                                                {latest.recordableInjuries}
                                            </td>
                                            <td className="px-6 py-4 text-right font-mono text-gray-500">
                                                {latest.hoursWorked?.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold ${
                                                    latest.trir > 1.0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                }`}>
                                                    {latest.trir}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400 inline-block" />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[3000] bg-gray-50 flex flex-col animate-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-red-50 p-2 rounded-lg">
            {getIcon()}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{getTitle()}</h1>
            <p className="text-sm text-gray-500">Based on latest available OSHA 300A filings</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <X className="w-6 h-6 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-sm font-semibold text-gray-600">
                                {category === 'refineries' ? 'Refinery' : category === 'operators' ? 'Operator' : 'Region'}
                            </th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                                Total Injuries
                            </th>
                            <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">
                                {category === 'refineries' ? 'TRIR' : 'Avg TRIR'}
                            </th>
                            {category === 'refineries' && <th className="px-6 py-4"></th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.map((item, idx) => (
                            <tr 
                                key={item.id} 
                                className={`hover:bg-gray-50 transition-colors ${item.refinery || category === 'regions' || category === 'operators' ? 'cursor-pointer group' : ''}`}
                                onClick={() => {
                                    if (item.refinery) onSelectRefinery(item.refinery);
                                    if (category === 'regions' && item.paddId !== undefined) setSelectedRegion(item.paddId);
                                    if (category === 'operators' && item.operatorId !== undefined) setSelectedOperator(item.operatorId);
                                }}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-gray-100 rounded-full text-xs font-bold text-gray-600">
                                            {idx + 1}
                                        </span>
                                        <div>
                                            <div className={`font-medium text-gray-900 ${item.refinery ? 'group-hover:text-blue-600' : ''}`}>
                                                {item.label}
                                            </div>
                                            <div className="text-xs text-gray-500">{item.subLabel}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right font-mono text-gray-600">
                                    {item.value}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-bold bg-red-100 text-red-800">
                                        {item.secondaryValue}
                                    </span>
                                </td>
                                { (category === 'refineries' || category === 'regions' || category === 'operators') && (
                                    <td className="px-6 py-4 text-right">
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-blue-400 inline-block" />
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyExplorer;
