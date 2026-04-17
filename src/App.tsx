import { useState, useEffect } from 'react';
import { fetchRefineries, type ParsedRefinery, PADD_NAMES } from './utils/data';
import Map from './components/Map';
import Dashboard from './components/Dashboard';
import PricingStrategy from './components/PricingStrategy';
import OperatorsExplorer from './components/OperatorsExplorer';
import AIAnalyst from './components/AIAnalyst';
import WorkforceExplorer from './components/WorkforceExplorer';
import { Loader2 } from 'lucide-react';

type View = 'map' | 'dashboard' | 'pricing' | 'operators' | 'analyst' | 'workforce';

function App() {
  const [refineries, setRefineries] = useState<ParsedRefinery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>('dashboard');
  const [selectedPadd, setSelectedPadd] = useState<number | 'all' | null>('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchRefineries();
        setRefineries(data);
      } catch (err) {
        console.error("Failed to load refinery data:", err);
        setError("Failed to load refinery data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading US Refinery Data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-lg border border-red-100">
          <div className="text-red-500 text-xl font-bold mb-2">Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-gray-100 relative flex flex-col">
      {/* Top Navigation Bar */}
      <div className="bg-black text-white px-4 py-3 flex items-center justify-between md:justify-evenly shadow-md z-[2000] flex-shrink-0 w-full overflow-x-auto gap-4">
        <button 
          onClick={() => setView('map')}
          className={`text-sm font-medium hover:text-blue-400 transition-colors whitespace-nowrap flex flex-col items-center ${view === 'map' ? 'text-blue-400' : 'text-gray-300'}`}
        >
          <span>Map</span>
          <span className="text-[10px] opacity-70">View</span>
        </button>
        <button 
          onClick={() => setView('pricing')}
          className={`text-sm font-medium hover:text-blue-400 transition-colors whitespace-nowrap flex flex-col items-center ${view === 'pricing' ? 'text-blue-400' : 'text-gray-300'}`}
        >
          <span>Pricing Strategy</span>
          <span className="text-[10px] opacity-70">Modeler</span>
        </button>
        <button 
          onClick={() => setView('analyst')}
          className={`text-sm font-medium hover:text-blue-400 transition-colors whitespace-nowrap flex flex-col items-center ${view === 'analyst' ? 'text-blue-400' : 'text-gray-300'}`}
        >
          <span>AI Analyst</span>
          <span className="text-[10px] opacity-70">Research</span>
        </button>
        <button 
          onClick={() => setView('workforce')}
          className={`text-sm font-medium hover:text-blue-400 transition-colors whitespace-nowrap flex flex-col items-center ${view === 'workforce' ? 'text-blue-400' : 'text-gray-300'}`}
        >
          <span>Workforce Explorer</span>
          <span className="text-[10px] opacity-70">BLS Data</span>
        </button>
        <button 
          onClick={() => { setSelectedPadd('all'); setView('dashboard'); }}
          className={`text-sm font-medium hover:text-blue-400 transition-colors whitespace-nowrap flex flex-col items-center ${view === 'dashboard' && selectedPadd === 'all' ? 'text-blue-400' : 'text-gray-300'}`}
        >
          <span>All Refineries</span>
          <span className="text-[10px] opacity-70">Nationwide</span>
        </button>
        {[1, 2, 3, 4, 5].map(padd => (
          <button
            key={padd}
            onClick={() => { setSelectedPadd(padd); setView('dashboard'); }}
            className={`text-sm font-medium hover:text-blue-400 transition-colors whitespace-nowrap flex flex-col items-center ${view === 'dashboard' && selectedPadd === padd ? 'text-blue-400' : 'text-gray-300'}`}
          >
            <span>PADD {padd}</span>
            <span className="text-[10px] opacity-70">{PADD_NAMES[padd]}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 relative overflow-hidden">
        {view === 'map' ? (
          <Map 
            refineries={refineries} 
            onSelectPadd={(padd) => { setSelectedPadd(padd); setView('dashboard'); }}
          />
        ) : view === 'pricing' ? (
          <PricingStrategy refineries={refineries} />
        ) : view === 'operators' ? (
          <OperatorsExplorer 
            refineries={refineries} 
            onBack={() => setView('dashboard')} 
          />
        ) : view === 'analyst' ? (
          <AIAnalyst refineries={refineries} />
        ) : view === 'workforce' ? (
          <WorkforceExplorer />
        ) : (
          <Dashboard 
            padd={selectedPadd!} 
            refineries={refineries} 
            onPaddSelect={(padd) => { setSelectedPadd(padd); setView('dashboard'); }}
            onViewOperators={() => setView('operators')}
          />
        )}
      </div>
    </div>
  );
}

export default App;
