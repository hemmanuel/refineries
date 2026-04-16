import React, { useMemo, useState, useRef, useEffect } from 'react';
import { type ParsedRefinery, PADD_NAMES } from '../utils/data';
import { Users, Factory, Calendar, HardHat, TrendingUp, Filter, Map, ChevronRight, AlertTriangle } from 'lucide-react';
import RefineryDetail from './RefineryDetail';
import CompanyProfile from './CompanyProfile';
import MetricExplanation from './MetricExplanation';
import SafetyExplorer, { type SafetyCategory } from './SafetyExplorer';
import ComplexityExplorer, { type ComplexityCategory } from './ComplexityExplorer';
import Select from './Select';

interface DashboardProps {
  padd: number | 'all';
  refineries: ParsedRefinery[];
  onPaddSelect: (padd: number) => void;
  onViewOperators?: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ padd, refineries, onPaddSelect, onViewOperators }) => {
  const [selectedRefinery, setSelectedRefinery] = useState<ParsedRefinery | null>(null);
  const [selectedCompanyProfile, setSelectedCompanyProfile] = useState<string | null>(null);
  const [selectedAggregateMetric, setSelectedAggregateMetric] = useState<'headcount' | 'turnaround' | 'safety' | 'count' | 'capacity' | 'nci' | 'edc' | null>(null);
  const [selectedSafetyCategory, setSelectedSafetyCategory] = useState<SafetyCategory | null>(null);
  const [selectedComplexityCategory, setSelectedComplexityCategory] = useState<ComplexityCategory | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to top when padd changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [padd]);
  
  // Filters State
  const [minCapacity, setMinCapacity] = useState<number>(0);
  const [selectedCompany, setSelectedCompany] = useState<string>('all');

  const filteredRefineries = useMemo(() => {
    let filtered = refineries;
    
    // Filter by PADD
    if (padd !== 'all') {
      filtered = filtered.filter(r => r.padd === padd);
    }

    // Filter by Capacity
    if (minCapacity > 0) {
      filtered = filtered.filter(r => r.capacity >= minCapacity);
    }

    // Filter by Company
    if (selectedCompany !== 'all') {
      filtered = filtered.filter(r => r.company === selectedCompany);
    }

    return filtered;
  }, [refineries, padd, minCapacity, selectedCompany]);

  const stats = useMemo(() => {
    return filteredRefineries.reduce((acc, curr) => {
      const est = curr.estimate || {
        totalHeadcount: 0,
        turnaroundHeadcount: 0,
        safetySensitive: 0
      };
      
      const wm = curr.workforceMatrix;
      if (wm) {
        Object.keys(wm).forEach(key => {
          const k = key as keyof typeof wm;
          acc.workforceMatrix[k].total += wm[k].total;
          acc.workforceMatrix[k].employee += wm[k].employee;
          acc.workforceMatrix[k].contractor += wm[k].contractor;
        });
      }
      
      return {
        count: acc.count + 1,
        capacity: acc.capacity + curr.capacity,
        headcount: acc.headcount + (est.totalHeadcount || 0),
        turnaround: acc.turnaround + (est.turnaroundHeadcount || 0),
        safety: acc.safety + (est.safetySensitive || 0),
        edc: acc.edc + (curr.edc || 0),
        nciSum: acc.nciSum + (curr.nci || 1.0),
        workforceMatrix: acc.workforceMatrix
      };
    }, {
      count: 0,
      capacity: 0,
      headcount: 0,
      turnaround: 0,
      safety: 0,
      edc: 0,
      nciSum: 0,
      workforceMatrix: {
        operations: { total: 0, employee: 0, contractor: 0 },
        maintenance: { total: 0, employee: 0, contractor: 0 },
        technical: { total: 0, employee: 0, contractor: 0 },
        logistics: { total: 0, employee: 0, contractor: 0 },
        hsse: { total: 0, employee: 0, contractor: 0 },
        support: { total: 0, employee: 0, contractor: 0 },
        turnaround: { total: 0, employee: 0, contractor: 0 }
      }
    });
  }, [filteredRefineries]);

  const avgNci = stats.count > 0 ? stats.nciSum / stats.count : 0;

  const uniqueCompanies = useMemo(() => {
    const companies = new Set(refineries.map(r => r.company));
    return Array.from(companies).sort();
  }, [refineries]);

  const topCompanies = useMemo(() => {
    const companyStats = filteredRefineries.reduce((acc, curr) => {
      if (!acc[curr.company]) {
        acc[curr.company] = { count: 0, capacity: 0 };
      }
      acc[curr.company].count++;
      acc[curr.company].capacity += curr.capacity;
      return acc;
    }, {} as Record<string, { count: number, capacity: number }>);

    return Object.entries(companyStats)
      .sort(([, a], [, b]) => b.capacity - a.capacity)
      .slice(0, 5);
  }, [filteredRefineries]);

  const largestRefineries = useMemo(() => {
    return [...filteredRefineries]
      .sort((a, b) => b.capacity - a.capacity)
      .slice(0, 5);
  }, [filteredRefineries]);

  const topNciRefineries = useMemo(() => {
    return [...filteredRefineries]
      .filter(r => r.nci && r.nci > 1.0)
      .sort((a, b) => (b.nci || 0) - (a.nci || 0))
      .slice(0, 5);
  }, [filteredRefineries]);

  const topEdcRefineries = useMemo(() => {
    return [...filteredRefineries]
      .filter(r => r.edc && r.edc > 0)
      .sort((a, b) => (b.edc || 0) - (a.edc || 0))
      .slice(0, 5);
  }, [filteredRefineries]);

  const safetyIncidents = useMemo(() => {
    // Filter for refineries that have official OSHA data
    const withData = filteredRefineries.filter(r => r.hasRealOshaData && r.oshaHistory && r.oshaHistory.length > 0);
    
    // Sort by latest year's TRIR
    return withData
      .sort((a, b) => {
        const aLatest = a.oshaHistory![0];
        const bLatest = b.oshaHistory![0];
        return bLatest.trir - aLatest.trir;
      })
      .slice(0, 5);
  }, [filteredRefineries]);

  const topOperatorsBySafety = useMemo(() => {
    const companyStats: Record<string, { totalTrir: number, count: number }> = {};
    filteredRefineries.forEach(r => {
        if (r.hasRealOshaData && r.oshaHistory?.length) {
            const latest = r.oshaHistory[0];
            if (!companyStats[r.company]) companyStats[r.company] = { totalTrir: 0, count: 0 };
            companyStats[r.company].totalTrir += latest.trir;
            companyStats[r.company].count++;
        }
    });
    return Object.entries(companyStats)
        .map(([company, stats]) => ({ company, avgTrir: stats.totalTrir / stats.count }))
        .sort((a, b) => b.avgTrir - a.avgTrir)
        .slice(0, 5);
  }, [filteredRefineries]);

  const topRegionsBySafety = useMemo(() => {
    const regionStats: Record<number, { totalTrir: number, count: number }> = {};
    filteredRefineries.forEach(r => {
        if (r.hasRealOshaData && r.oshaHistory?.length) {
            const latest = r.oshaHistory[0];
            if (!regionStats[r.padd]) regionStats[r.padd] = { totalTrir: 0, count: 0 };
            regionStats[r.padd].totalTrir += latest.trir;
            regionStats[r.padd].count++;
        }
    });
    return Object.entries(regionStats)
        .map(([padd, stats]) => ({ padd: Number(padd), avgTrir: stats.totalTrir / stats.count }))
        .sort((a, b) => b.avgTrir - a.avgTrir)
        .slice(0, 5);
  }, [filteredRefineries]);

  const paddStats = useMemo(() => {
    const stats: Record<number, { count: number, capacity: number, headcount: number, turnaround: number, safety: number }> = {
      1: { count: 0, capacity: 0, headcount: 0, turnaround: 0, safety: 0 },
      2: { count: 0, capacity: 0, headcount: 0, turnaround: 0, safety: 0 },
      3: { count: 0, capacity: 0, headcount: 0, turnaround: 0, safety: 0 },
      4: { count: 0, capacity: 0, headcount: 0, turnaround: 0, safety: 0 },
      5: { count: 0, capacity: 0, headcount: 0, turnaround: 0, safety: 0 },
    };

    filteredRefineries.forEach(r => {
      if (stats[r.padd]) {
        const est = r.estimate || { totalHeadcount: 0, turnaroundHeadcount: 0, safetySensitive: 0 };
        stats[r.padd].count++;
        stats[r.padd].capacity += r.capacity;
        stats[r.padd].headcount += (est.totalHeadcount || 0);
        stats[r.padd].turnaround += (est.turnaroundHeadcount || 0);
        stats[r.padd].safety += (est.safetySensitive || 0);
      }
    });

    const totalUSCapacity = filteredRefineries.reduce((acc, curr) => acc + curr.capacity, 0);

    return { stats, totalUSCapacity };
  }, [filteredRefineries]);

  const title = padd === 'all' ? 'All US Refineries' : `PADD ${padd} - ${PADD_NAMES[padd as number]}`;

  const getAggregateExplanation = (metric: 'headcount' | 'turnaround' | 'safety' | 'count' | 'capacity' | 'nci' | 'edc') => {
    const regionName = padd === 'all' ? 'the United States' : `PADD ${padd} (${PADD_NAMES[padd as number]})`;
    const count = stats.count;
    const capacity = stats.capacity;
    
    if (metric === 'count') {
      return `This represents the total number of operable refineries currently tracked in ${regionName}. \n\nThis count includes facilities that are actively processing crude oil or are temporarily idle, but excludes petrochemical plants and fractionators that do not process crude.`;
    }
    if (metric === 'capacity') {
      return `This represents the total crude oil distillation capacity in ${regionName}, measured in Barrels Per Stream Day (BPSD). \n\nStream day capacity represents the maximum number of barrels of input that a distillation facility can process within a 24-hour period when running at full capacity under optimal conditions, with no allowance for downtime. Data is sourced from the EIA-820 Annual Refinery Report.`;
    }
    if (metric === 'nci') {
      return `This is the average Nelson Complexity Index (NCI) across all refineries in ${regionName}. \n\nThe NCI measures the secondary conversion capacity of a petroleum refinery relative to the primary distillation capacity. A higher average indicates a region heavily invested in secondary upgrading units (like FCCUs, Hydrocrackers, and Cokers) to process heavier crudes into high-value products.`;
    }
    if (metric === 'edc') {
      return `This represents the total Equivalent Distillation Capacity (EDC) in ${regionName}. \n\nEDC (also known as Complexity-Barrels) normalizes the scale and complexity of the refineries into a single metric. It is calculated by multiplying each refinery's physical capacity by its Nelson Complexity Index. This represents the true operational and capital footprint of the region.`;
    }
    
    const value = metric === 'headcount' ? stats.headcount : metric === 'turnaround' ? stats.turnaround : stats.safety;
    
    // Calculate aggregate ratio
    const ratio = (value / (capacity / 1000)).toFixed(2);

    if (metric === 'headcount') {
      return `This figure represents the estimated total workforce across all ${count} refineries in ${regionName}. \n\nIt is the sum of full-time employees (FTEs) and long-term contractors. \n\nAggregate Metric: ~${ratio} personnel per 1,000 bpd of capacity. This reflects the overall operational intensity of the region's refining infrastructure.`;
    }
    if (metric === 'turnaround') {
       const multiplier = (stats.turnaround / stats.headcount).toFixed(1);
      return `This figure represents the aggregated peak turnaround workforce opportunity in ${regionName}. \n\nIt is the sum of the estimated peak headcount required for major maintenance events. \n\nAggregate Metric: ~${multiplier}x the steady-state workforce. This represents the total size of the seasonal/contractor workforce pool.`;
    }
    if (metric === 'safety') {
       const percentage = ((stats.safety / stats.headcount) * 100).toFixed(0);
      return `This figure estimates the total number of personnel in safety-sensitive roles across ${regionName}. \n\nAggregate Metric: ~${percentage}% of the total workforce. This segment represents the high-priority target audience for safety-critical cognitive assessments.`;
    }
    return '';
  };

  return (
    <div ref={scrollContainerRef} className="h-full w-full bg-gray-50 overflow-y-auto p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{title}</h1>

        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-8 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500 mr-2">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <Select 
            value={selectedCompany}
            onChange={(val) => setSelectedCompany(val)}
            options={[
              { value: 'all', label: 'All Companies' },
              ...uniqueCompanies.map(c => ({ value: c, label: c }))
            ]}
            className="min-w-[200px]"
          />

          <Select 
            value={minCapacity}
            onChange={(val) => setMinCapacity(Number(val))}
            options={[
              { value: 0, label: 'Any Capacity' },
              { value: 50000, label: '50k+ bpd' },
              { value: 100000, label: '100k+ bpd' },
              { value: 250000, label: '250k+ bpd' },
              { value: 500000, label: '500k+ bpd' },
            ]}
            className="min-w-[140px]"
          />

          <div className="ml-auto text-sm text-gray-500">
            Showing {filteredRefineries.length} of {refineries.length} refineries
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-12">
          <button 
            onClick={() => setSelectedAggregateMetric('count')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all text-left group relative"
          >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-2 mb-2 text-gray-500">
              <Factory className="w-4 h-4" />
              <span className="text-sm font-medium">Refineries</span>
            </div>
            <div className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">{stats.count}</div>
          </button>

          <button 
            onClick={() => setSelectedAggregateMetric('capacity')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-gray-400 hover:shadow-md transition-all text-left group relative"
          >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
            <div className="flex items-center gap-2 mb-2 text-gray-500">
              <div className="w-4 h-4 font-mono font-bold text-[10px] flex items-center justify-center border border-current rounded">BPD</div>
              <span className="text-sm font-medium">Capacity</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-gray-900 group-hover:text-gray-700 transition-colors">{(stats.capacity / 1000000).toFixed(2)}M</span>
                <span className="text-[10px] text-gray-400">Stream Day</span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm font-bold text-gray-600 group-hover:text-gray-800 transition-colors">{((stats.capacity * 0.921382) / 1000000).toFixed(2)}M</span>
                <span className="text-[10px] text-gray-400">Calendar Day</span>
              </div>
            </div>
          </button>

          <button 
            onClick={() => setSelectedAggregateMetric('nci')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all text-left group relative"
          >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-center gap-2 mb-2 text-purple-600">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm font-medium">Avg NCI</span>
            </div>
            <div className="text-xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{avgNci.toFixed(2)}</div>
            <div className="text-[10px] text-gray-400 mt-1">Nelson Complexity</div>
          </button>

          <button 
            onClick={() => setSelectedAggregateMetric('edc')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all text-left group relative"
          >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-center gap-2 mb-2 text-indigo-600">
              <Factory className="w-4 h-4" />
              <span className="text-sm font-medium">Total EDC</span>
            </div>
            <div className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{(stats.edc / 1000000).toFixed(2)}M</div>
            <div className="text-[10px] text-gray-400 mt-1">Complexity-Barrels</div>
          </button>

          <button 
            onClick={() => setSelectedAggregateMetric('headcount')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all text-left group relative"
          >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex items-center gap-2 mb-2 text-blue-600">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">Headcount</span>
            </div>
            <div className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{stats.headcount.toLocaleString()}</div>
            <div className="text-[10px] text-gray-400 mt-1">FTE + Contractors</div>
          </button>

          <button 
            onClick={() => setSelectedAggregateMetric('turnaround')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-orange-400 hover:shadow-md transition-all text-left group relative"
          >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4 text-orange-400" />
            </div>
            <div className="flex items-center gap-2 mb-2 text-orange-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Turnaround</span>
            </div>
            <div className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors">{stats.turnaround.toLocaleString()}</div>
            <div className="text-[10px] text-gray-400 mt-1">Seasonal Workers</div>
          </button>

          <button 
            onClick={() => setSelectedAggregateMetric('safety')}
            className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 hover:border-green-400 hover:shadow-md transition-all text-left group relative"
          >
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <ChevronRight className="w-4 h-4 text-green-400" />
            </div>
            <div className="flex items-center gap-2 mb-2 text-green-600">
              <HardHat className="w-4 h-4" />
              <span className="text-sm font-medium">Safety</span>
            </div>
            <div className="text-xl font-bold text-gray-900 group-hover:text-green-600 transition-colors">{stats.safety.toLocaleString()}</div>
            <div className="text-[10px] text-gray-400 mt-1">Critical Roles</div>
          </button>
        </div>

        {/* Industry Workforce Matrix */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">Industry-Wide Workforce Breakdown</h2>
          </div>
          
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-4 text-left font-semibold text-gray-700 uppercase tracking-wider">Function</th>
                  <th scope="col" className="px-6 py-4 text-right font-semibold text-gray-700 uppercase tracking-wider">Employees</th>
                  <th scope="col" className="px-6 py-4 text-right font-semibold text-gray-700 uppercase tracking-wider">Contractors</th>
                  <th scope="col" className="px-6 py-4 text-right font-semibold text-gray-900 uppercase tracking-wider bg-gray-100">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(stats.workforceMatrix).map(([key, data]) => (
                  <tr key={key} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 capitalize">{key}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">{data.employee.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-gray-600">{data.contractor.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900 bg-gray-50/50">{data.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr>
                  <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900">Total (Excl. Turnaround)</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900">
                    {Object.entries(stats.workforceMatrix).filter(([k]) => k !== 'turnaround').reduce((sum, [, d]) => sum + d.employee, 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-900">
                    {Object.entries(stats.workforceMatrix).filter(([k]) => k !== 'turnaround').reduce((sum, [, d]) => sum + d.contractor, 0).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-black text-gray-900">
                    {Object.entries(stats.workforceMatrix).filter(([k]) => k !== 'turnaround').reduce((sum, [, d]) => sum + d.total, 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-indigo-900 mb-2">Methodology & Primary Sources</h4>
            <p className="text-xs text-indigo-800 space-y-2">
              <span className="block">Functional headcount distributions are derived directly from <strong>BLS OEWS NAICS 324100</strong> occupational data for direct employees.</span>
              <span className="block mt-1">Contractor utilization rates are based on industry-standard practices documented in <strong>USW</strong> labor records (for Operations/Maintenance splits) and <strong>California SB 54</strong> legislative mandates.</span>
              <span className="block mt-1">Turnaround contractor surges are derived from verified federal disaster investigations, specifically the <strong>CSB BP Texas City Report</strong>.</span>
            </p>
          </div>
        </div>

        {/* Market Analysis Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Top Companies */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <button 
                onClick={onViewOperators}
                className={`flex items-center gap-2 ${onViewOperators ? 'cursor-pointer hover:opacity-80' : ''}`}
              >
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold text-gray-900">Major Operators</h2>
              </button>
              {onViewOperators && (
                <button 
                  onClick={onViewOperators}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
                >
                  View All
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {topCompanies.map(([company, data], idx) => (
                <button 
                  key={company} 
                  onClick={() => setSelectedCompanyProfile(company)}
                  className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-white shadow-sm rounded-full text-xs font-bold text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors" title={company}>
                      {company}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {data.count} sites
                  </div>
                  <div className="text-sm font-mono font-medium text-gray-700">
                    {(data.capacity / 1000).toFixed(0)}k bpd
                  </div>
                </button>
              ))}
            </div>
          </div>
          {/* Largest Refineries */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-3">
            <div className="flex items-center gap-2 mb-4">
              <Factory className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">Largest Refineries (Capacity)</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {largestRefineries.map((refinery, idx) => (
                <button 
                  key={refinery.id} 
                  onClick={() => setSelectedRefinery(refinery)}
                  className="flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 flex items-center justify-center bg-white shadow-sm rounded-full text-xs font-bold text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors" title={refinery.name}>
                      {refinery.name}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 truncate" title={refinery.company}>
                    {refinery.company}
                  </div>
                  <div className="text-sm font-mono font-medium text-gray-700">
                    {(refinery.capacity / 1000).toFixed(0)}k bpd
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Most Complex Refineries */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-3">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <h2 className="text-lg font-semibold text-gray-900">Most Complex Refineries</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Top by NCI */}
                <button 
                    onClick={() => setSelectedComplexityCategory('nci')}
                    className="bg-purple-50 rounded-lg border border-purple-100 p-4 hover:bg-purple-100 hover:border-purple-200 transition-all text-left group"
                >
                    <div className="flex items-center justify-between w-full mb-3">
                        <h3 className="font-semibold text-purple-900 group-hover:text-purple-800">Highest NCI</h3>
                        <ChevronRight className="w-4 h-4 text-purple-400 group-hover:text-purple-600" />
                    </div>
                    <div className="space-y-3">
                        {topNciRefineries.slice(0, 3).map(r => (
                            <div key={r.id} className="flex justify-between items-center text-sm w-full">
                                <span className="text-gray-700 truncate max-w-[140px]" title={r.name}>{r.name}</span>
                                <span className="font-bold text-purple-700">{r.nci?.toFixed(2)}</span>
                            </div>
                        ))}
                        {topNciRefineries.length === 0 && <div className="text-xs text-gray-500 italic">No data available</div>}
                    </div>
                </button>

                {/* Top by EDC */}
                <button 
                    onClick={() => setSelectedComplexityCategory('edc')}
                    className="bg-indigo-50 rounded-lg border border-indigo-100 p-4 hover:bg-indigo-100 hover:border-indigo-200 transition-all text-left group"
                >
                    <div className="flex items-center justify-between w-full mb-3">
                        <h3 className="font-semibold text-indigo-900 group-hover:text-indigo-800">Highest EDC</h3>
                        <ChevronRight className="w-4 h-4 text-indigo-400 group-hover:text-indigo-600" />
                    </div>
                    <div className="space-y-3">
                        {topEdcRefineries.slice(0, 3).map(r => (
                            <div key={r.id} className="flex justify-between items-center text-sm w-full">
                                <span className="text-gray-700 truncate max-w-[140px]" title={r.name}>{r.name}</span>
                                <span className="font-bold text-indigo-700">{(r.edc! / 1000000).toFixed(2)}M</span>
                            </div>
                        ))}
                        {topEdcRefineries.length === 0 && <div className="text-xs text-gray-500 italic">No data available</div>}
                    </div>
                </button>

                {/* Highest NCI Processes */}
                <button 
                    onClick={() => setSelectedComplexityCategory('units')}
                    className="bg-gray-50 rounded-lg border border-gray-200 p-4 hover:bg-gray-100 hover:border-gray-300 transition-all text-left group"
                >
                    <div className="flex items-center justify-between w-full mb-3">
                        <h3 className="font-semibold text-gray-900 group-hover:text-gray-800">Highest Complexity Units</h3>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                    </div>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">Lubricants</span>
                            <span className="font-bold text-gray-900">60.0</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">Isomerization</span>
                            <span className="font-bold text-gray-900">15.0</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">Aromatics</span>
                            <span className="font-bold text-gray-900">15.0</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-700">Alkylation</span>
                            <span className="font-bold text-gray-900">10.0</span>
                        </div>
                    </div>
                </button>
            </div>
          </div>

          {/* Safety Performance (High Incidents) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-3">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="text-lg font-semibold text-gray-900">Highest Reported Incident Rates (TRIR)</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Refineries */}
                <button 
                    onClick={() => setSelectedSafetyCategory('refineries')}
                    className="bg-red-50 rounded-lg border border-red-100 p-4 hover:bg-red-100 hover:border-red-200 transition-all text-left group"
                >
                    <div className="flex items-center justify-between w-full mb-3">
                        <h3 className="font-semibold text-red-900 group-hover:text-red-800">Refineries</h3>
                        <ChevronRight className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                    </div>
                    <div className="space-y-3">
                        {safetyIncidents.slice(0, 3).map(r => (
                            <div key={r.id} className="flex justify-between items-center text-sm">
                                <span className="text-gray-700 truncate max-w-[140px]" title={r.name}>{r.name}</span>
                                <span className="font-bold text-red-700">{r.oshaHistory![0].trir}</span>
                            </div>
                        ))}
                        {safetyIncidents.length === 0 && <div className="text-xs text-gray-500 italic">No data available</div>}
                    </div>
                </button>

                {/* Regions */}
                <button 
                    onClick={() => setSelectedSafetyCategory('regions')}
                    className="bg-red-50 rounded-lg border border-red-100 p-4 hover:bg-red-100 hover:border-red-200 transition-all text-left group"
                >
                    <div className="flex items-center justify-between w-full mb-3">
                        <h3 className="font-semibold text-red-900 group-hover:text-red-800">Regions</h3>
                        <ChevronRight className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                    </div>
                    <div className="space-y-3">
                        {topRegionsBySafety.slice(0, 3).map(({ padd, avgTrir }) => (
                            <div key={padd} className="flex justify-between items-center text-sm">
                                <div className="flex flex-col">
                                    <span className="text-gray-900 font-medium">{PADD_NAMES[padd]}</span>
                                    <span className="text-xs text-gray-500">PADD {padd}</span>
                                </div>
                                <span className="font-bold text-red-700">{avgTrir.toFixed(2)}</span>
                            </div>
                        ))}
                        {topRegionsBySafety.length === 0 && <div className="text-xs text-gray-500 italic">No data available</div>}
                    </div>
                </button>

                {/* Operators */}
                <button 
                    onClick={() => setSelectedSafetyCategory('operators')}
                    className="bg-red-50 rounded-lg border border-red-100 p-4 hover:bg-red-100 hover:border-red-200 transition-all text-left group"
                >
                    <div className="flex items-center justify-between w-full mb-3">
                        <h3 className="font-semibold text-red-900 group-hover:text-red-800">Operators</h3>
                        <ChevronRight className="w-4 h-4 text-red-400 group-hover:text-red-600" />
                    </div>
                    <div className="space-y-3">
                        {topOperatorsBySafety.slice(0, 3).map(({ company, avgTrir }) => (
                            <div key={company} className="flex justify-between items-center text-sm">
                                <span className="text-gray-700 truncate max-w-[140px]" title={company}>{company}</span>
                                <span className="font-bold text-red-700">{avgTrir.toFixed(2)}</span>
                            </div>
                        ))}
                        {topOperatorsBySafety.length === 0 && <div className="text-xs text-gray-500 italic">No data available</div>}
                    </div>
                </button>
            </div>
          </div>

          {/* PADD Breakdown */}
          {padd === 'all' && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-3">
              <div className="flex items-center gap-2 mb-4">
                <Map className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-semibold text-gray-900">Regional Breakdown (PADD)</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5].map((paddNum) => {
                  const data = paddStats.stats[paddNum];
                  const percentOfUS = paddStats.totalUSCapacity > 0 
                    ? (data.capacity / paddStats.totalUSCapacity) * 100 
                    : 0;
                  
                  return (
                    <button 
                      key={paddNum} 
                      onClick={() => onPaddSelect(paddNum)}
                      className="flex flex-col p-4 bg-gray-50 rounded-lg border border-gray-100 hover:shadow-md hover:border-blue-300 transition-all text-left group"
                    >
                      <div className="flex flex-col mb-3 pb-3 border-b border-gray-200 w-full">
                        <span className="text-lg font-bold text-gray-900 uppercase group-hover:text-blue-600 transition-colors">{PADD_NAMES[paddNum]}</span>
                        <span className="text-xs font-medium text-gray-500 tracking-wide">PADD {paddNum}</span>
                      </div>
                      
                      <div className="space-y-2 w-full">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Refineries</span>
                          <span className="font-medium text-gray-900">{data.count}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Capacity</span>
                          <div className="text-right">
                            <span className="font-mono font-medium text-gray-900 block">
                              {data.capacity >= 1000000 
                                ? `${(data.capacity / 1000000).toFixed(2)}M` 
                                : `${(data.capacity / 1000).toFixed(0)}k`}
                            </span>
                            <span className="text-xs text-gray-400 block">{percentOfUS.toFixed(1)}% of Total</span>
                          </div>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Headcount</span>
                          <span className="font-medium text-blue-600">{data.headcount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Turnaround</span>
                          <span className="font-medium text-orange-600">{data.turnaround.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-gray-500">Safety</span>
                          <span className="font-medium text-green-600">{data.safety.toLocaleString()}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Refinery List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Refineries in Region</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Company</th>
                  <th className="px-6 py-4">State</th>
                  <th className="px-6 py-4 text-right">Capacity (bpd)</th>
                  <th className="px-6 py-4 text-right">Est. Headcount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRefineries.map((refinery) => (
                  <tr 
                    key={refinery.id} 
                    onClick={() => setSelectedRefinery(refinery)}
                    className="hover:bg-gray-50 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4 font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{refinery.name}</td>
                    <td className="px-6 py-4 text-gray-600">{refinery.company}</td>
                    <td className="px-6 py-4 text-gray-600">{refinery.state}</td>
                    <td className="px-6 py-4 text-right font-mono">{refinery.capacity.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right font-mono">
                      {refinery.estimate?.totalHeadcount ? refinery.estimate.totalHeadcount.toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedCompanyProfile && (
        <CompanyProfile
          companyName={selectedCompanyProfile}
          refineries={filteredRefineries} // Pass filtered refineries to respect current view (PADD/All)
          onClose={() => setSelectedCompanyProfile(null)}
          onSelectRefinery={(refinery) => {
            setSelectedRefinery(refinery);
          }}
        />
      )}

      {selectedRefinery && (
        <RefineryDetail 
          refinery={selectedRefinery} 
          onClose={() => setSelectedRefinery(null)} 
        />
      )}

      {selectedAggregateMetric && (
        <MetricExplanation
          refinery={{
            name: padd === 'all' ? 'All US Refineries' : `PADD ${padd} Region`,
            company: 'Aggregate Industry Data',
            state: 'United States',
            padd: typeof padd === 'number' ? padd : 0,
            capacity: stats.capacity,
            lat: 0,
            lng: 0,
            id: 'aggregate',
            type: 'Oil Refinery'
          }}
          metric={selectedAggregateMetric}
          value={
            selectedAggregateMetric === 'headcount' ? stats.headcount :
            selectedAggregateMetric === 'turnaround' ? stats.turnaround :
            selectedAggregateMetric === 'safety' ? stats.safety :
            selectedAggregateMetric === 'count' ? stats.count :
            selectedAggregateMetric === 'capacity' ? stats.capacity :
            selectedAggregateMetric === 'nci' ? avgNci :
            stats.edc
          }
          explanation={getAggregateExplanation(selectedAggregateMetric)}
          onClose={() => setSelectedAggregateMetric(null)}
        />
      )}
      {selectedSafetyCategory && (
        <SafetyExplorer
          category={selectedSafetyCategory}
          refineries={filteredRefineries}
          onClose={() => setSelectedSafetyCategory(null)}
          onSelectRefinery={(refinery) => {
            setSelectedSafetyCategory(null);
            setSelectedRefinery(refinery);
          }}
        />
      )}
      {selectedComplexityCategory && (
        <ComplexityExplorer
          category={selectedComplexityCategory}
          refineries={filteredRefineries}
          onClose={() => setSelectedComplexityCategory(null)}
          onSelectRefinery={(refinery) => {
            setSelectedComplexityCategory(null);
            setSelectedRefinery(refinery);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;