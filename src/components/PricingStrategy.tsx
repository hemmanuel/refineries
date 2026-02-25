import React, { useMemo, useState, useRef, useEffect } from 'react';
import { type ParsedRefinery, PADD_NAMES } from '../utils/data';
import { Calculator, DollarSign, TrendingUp } from 'lucide-react';
import Select from './Select';

interface PricingStrategyProps {
  refineries: ParsedRefinery[];
}

const PricingStrategy: React.FC<PricingStrategyProps> = ({ refineries }) => {
  const [selectedPadd, setSelectedPadd] = useState<number | 'all'>('all');
  
  // Market Calculator State
  const [pricingModel, setPricingModel] = useState<'subscription' | 'usage'>('subscription');
  const [unitPrice, setUnitPrice] = useState<number>(120); // $120/user/year
  const [adoptionRate, setAdoptionRate] = useState<number>(20); // 20% penetration
  const [testFrequency, setTestFrequency] = useState<number>(12); // 12 times/year (monthly) for usage model

  // ROI Calculator State
  const [incidentCost, setIncidentCost] = useState<number>(50000); // $50k avg cost
  const [reductionRate, setReductionRate] = useState<number>(15); // 15% reduction

  const filteredRefineries = useMemo(() => {
    if (selectedPadd === 'all') {
      return refineries;
    }
    return refineries.filter(r => r.padd === selectedPadd);
  }, [refineries, selectedPadd]);

  const stats = useMemo(() => {
    return filteredRefineries.reduce((acc, curr) => {
      const est = curr.estimate || {
        totalHeadcount: 0,
        turnaroundHeadcount: 0,
        safetySensitive: 0
      };
      
      return {
        headcount: acc.headcount + (est.totalHeadcount || 0),
        turnaround: acc.turnaround + (est.turnaroundHeadcount || 0),
        safety: acc.safety + (est.safetySensitive || 0)
      };
    }, {
      headcount: 0,
      turnaround: 0,
      safety: 0
    });
  }, [filteredRefineries]);

  const handleSetSubscription = () => {
    setPricingModel('subscription');
    setUnitPrice(120);
    setReductionRate(40);
  };

  const handleSetUsage = () => {
    setPricingModel('usage');
    setUnitPrice(2);
    setTestFrequency(200);
    setReductionRate(40);
  };

  const marketAnalysis = useMemo(() => {
    // Base Metrics
    const safetyWorkers = stats.safety;
    const turnaroundWorkers = stats.turnaround;

    // Revenue Calculations
    let arrFTE = 0;
    let seasonalRevenue = 0;

    if (pricingModel === 'subscription') {
      // Subscription: Price per User per Year
      arrFTE = safetyWorkers * (adoptionRate / 100) * unitPrice;
      // Turnaround: Assume 2 month duration avg for subscription access
      seasonalRevenue = turnaroundWorkers * (adoptionRate / 100) * (unitPrice / 12) * 2;
    } else {
      // Usage: Price per Test * Frequency
      arrFTE = safetyWorkers * (adoptionRate / 100) * testFrequency * unitPrice;
      // Turnaround: High frequency testing during intense periods (e.g. daily for 30 days)
      seasonalRevenue = turnaroundWorkers * (adoptionRate / 100) * 20 * unitPrice; 
    }

    const totalOpportunity = arrFTE + seasonalRevenue;

    // ROI Calculations
    // Assume 1 incident per 100 workers per year (industry heuristic for minor+ incidents)
    const estimatedIncidents = Math.round(safetyWorkers / 100);
    const preventedIncidents = Math.round(estimatedIncidents * (reductionRate / 100));
    const potentialSavings = preventedIncidents * incidentCost;
    const roi = totalOpportunity > 0 ? ((potentialSavings - totalOpportunity) / totalOpportunity) * 100 : 0;

    return { 
      arrFTE, 
      seasonalRevenue, 
      totalOpportunity,
      estimatedIncidents,
      preventedIncidents,
      potentialSavings,
      roi
    };
  }, [stats, pricingModel, unitPrice, adoptionRate, testFrequency, incidentCost, reductionRate]);

  return (
    <div className="h-full w-full bg-gray-50 overflow-y-auto p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pricing Strategy Modeler</h1>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-500">Region:</span>
            <Select 
              value={selectedPadd}
              onChange={(val) => setSelectedPadd(val === 'all' ? 'all' : Number(val))}
              options={[
                { value: 'all', label: 'All Refineries (Nationwide)' },
                { value: 1, label: 'PADD 1 - East Coast' },
                { value: 2, label: 'PADD 2 - Midwest' },
                { value: 3, label: 'PADD 3 - Gulf Coast' },
                { value: 4, label: 'PADD 4 - Rocky Mountain' },
                { value: 5, label: 'PADD 5 - West Coast' },
              ]}
              className="min-w-[240px]"
            />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900">GTM Strategy Modeler</h2>
            </div>
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button
                onClick={handleSetSubscription}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${pricingModel === 'subscription' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Subscription
              </button>
              <button
                onClick={handleSetUsage}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${pricingModel === 'usage' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Per Test
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pricing & Adoption</h3>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  {pricingModel === 'subscription' ? 'Price per User/Year ($)' : 'Price per Test ($)'}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="number" 
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(Number(e.target.value))}
                    className="w-full pl-8 p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Adoption Rate (% of Safety Workers)
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="1" max="100" 
                    value={adoptionRate}
                    onChange={(e) => setAdoptionRate(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-sm font-bold text-gray-700 w-12 text-right">{adoptionRate}%</span>
                </div>
              </div>

              {pricingModel === 'usage' && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Tests per User/Year</label>
                  <input 
                    type="number" 
                    value={testFrequency}
                    onChange={(e) => setTestFrequency(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Value Selling (ROI)</h3>
              
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Avg. Cost per Incident ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="number" 
                    value={incidentCost}
                    onChange={(e) => setIncidentCost(Number(e.target.value))}
                    className="w-full pl-8 p-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Projected Incident Reduction (%)
                </label>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="1" max="50" 
                    value={reductionRate}
                    onChange={(e) => setReductionRate(Number(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
                  />
                  <span className="text-sm font-bold text-gray-700 w-12 text-right">{reductionRate}%</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div>
              <div className="text-xs text-gray-500 mb-1">Projected ARR (FTEs)</div>
              <div className="text-xl font-bold text-gray-900">
                ${(marketAnalysis.arrFTE / 1000000).toFixed(2)}M
              </div>
              <div className="text-[10px] text-gray-400">Recurring Revenue</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Turnaround Opportunity</div>
              <div className="text-xl font-bold text-orange-600">
                ${(marketAnalysis.seasonalRevenue / 1000000).toFixed(2)}M
              </div>
              <div className="text-[10px] text-gray-400">Seasonal Revenue</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Client ROI</div>
              <div className={`text-xl font-bold ${marketAnalysis.roi > 0 ? 'text-green-600' : 'text-red-500'}`}>
                {marketAnalysis.roi.toFixed(0)}%
              </div>
              <div className="text-[10px] text-gray-400">
                ${(marketAnalysis.potentialSavings / 1000000).toFixed(1)}M Savings
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingStrategy;
