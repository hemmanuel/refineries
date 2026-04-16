import facilitiesData from '../data/facilities.json';

export interface WorkforceEstimate {
  totalHeadcount: number;
  turnaroundHeadcount: number;
  safetySensitive: number;
  confidence: number;
  reasoning: string;
  explanations?: {
    totalHeadcount: string;
    turnaroundHeadcount: string;
    safetySensitive: string;
  };
}

export interface Refinery {
  "": string; // The name/location string
  lat: string;
  lng: string;
  QUANTITY: string;
}

export interface OshaYearData {
  year: number;
  recordableInjuries: number;
  trir: number;
  dart?: number;
  hoursWorked?: number;
  deaths?: number;
  dafw?: number;
  djtr?: number;
  other?: number;
  hearingLoss?: number;
  poisonings?: number;
  respiratory?: number;
  skinDisorders?: number;
  otherIllnesses?: number;
  notes: string;
}

export interface WorkforceMatrixCategory {
  total: number;
  employee: number;
  contractor: number;
}

export interface WorkforceMatrix {
  operations: WorkforceMatrixCategory;
  maintenance: WorkforceMatrixCategory;
  technical: WorkforceMatrixCategory;
  logistics: WorkforceMatrixCategory;
  hsse: WorkforceMatrixCategory;
  support: WorkforceMatrixCategory;
  turnaround: WorkforceMatrixCategory;
}

export const WORKFORCE_CATEGORY_LABELS: Record<keyof WorkforceMatrix, string> = {
  operations: "Production Occupations",
  maintenance: "Installation, Maintenance, and Repair Occupations",
  technical: "Architecture and Engineering Occupations",
  logistics: "Transportation and Material Moving Occupations",
  hsse: "Life, Physical, and Social Science Occupations",
  support: "Management and Administrative Support Occupations",
  turnaround: "Turnaround (Major Maintenance)"
};

export interface ParsedRefinery {
  id: string;
  name: string;
  state: string;
  city?: string;
  padd: number;
  company: string;
  capacity: number;
  capacityUnit?: string;
  lat: number;
  lng: number;
  type?: 'Oil Refinery' | 'Petrochemical Plant';
  estimate?: WorkforceEstimate;
  workforceMatrix?: WorkforceMatrix;
  oshaHistory?: OshaYearData[];
  safetySummary?: string;
  hasRealOshaData?: boolean;
  nci?: number;
  edc?: number;
  units?: Record<string, number>;
}

// const CSV_URL = 'https://raw.githubusercontent.com/cpreid2/US-Refineries/master/Refineries_US.csv';

const normalizeCompanyName = (name: string): string => {
  const n = name.toLowerCase();
  
  // Marathon Petroleum
  if (n.includes('marathon') || 
      n.includes('western refining') || 
      n.includes('tesoro') || 
      n.includes('st paul park') || 
      n.includes('galveston bay')) return 'Marathon Petroleum';

  // Valero
  if (n.includes('valero') || 
      n.includes('diamond shamrock') || 
      n.includes('ultramar') || 
      n.includes('premcor')) return 'Valero';

  // PBF Energy
  if (n.includes('pbf') || 
      n.includes('chalmette') || 
      n.includes('paulsboro') || 
      n.includes('delaware city') || 
      n.includes('torrance') || 
      n.includes('martinez') || 
      n.includes('toledo refining')) return 'PBF Energy';

  // Phillips 66
  if (n.includes('phillips 66') || 
      n.includes('wrb refining') || 
      n.includes('excel paralubes')) return 'Phillips 66';

  // Chevron
  if (n.includes('chevron') || 
      n.includes('pasadena refining')) return 'Chevron';

  // ExxonMobil
  if (n.includes('exxon')) return 'ExxonMobil';

  // Shell
  if (n.includes('shell')) return 'Shell';

  // Citgo
  if (n.includes('citgo') || 
      n.includes('pdv midwest')) return 'Citgo';

  // HF Sinclair (Sinclair + HollyFrontier)
  if (n.includes('hf sinclair') || 
      n.includes('sinclair') || 
      n.includes('hollyfrontier')) return 'HF Sinclair';

  // Cenovus Energy
  if (n.includes('cenovus') || 
      n.includes('lima refining') || 
      n.includes('superior refining') || 
      n.includes('ohio refining')) return 'Cenovus Energy';

  // Delek US
  if (n.includes('delek') || 
      n.includes('alon') || 
      n.includes('lion oil')) return 'Delek US';

  // Par Pacific
  if (n.includes('par pacific') || 
      n.includes('par hawaii') || 
      n.includes('par montana') || 
      n.includes('us oil & refining') || 
      n.includes('wyoming refining')) return 'Par Pacific';

  // LyondellBasell
  if (n.includes('lyondell') || 
      n.includes('houston refining') || 
      n.includes('equistar')) return 'LyondellBasell';

  // CHS Inc
  if (n.includes('cenex') || 
      n.includes('chs ')) return 'CHS Inc';

  // BP
  if (n.includes('bp products') || 
      n.includes('bp west')) return 'BP';

  // Motiva
  if (n.includes('motiva')) return 'Motiva Enterprises';

  // TotalEnergies
  if (n.includes('totalenergies')) return 'TotalEnergies';

  // Flint Hills
  if (n.includes('flint hills')) return 'Flint Hills Resources';

  // Delta Air Lines
  if (n.includes('delta') || 
      n.includes('monroe energy')) return 'Delta Air Lines (Monroe)';

  // Calumet
  if (n.includes('calumet')) return 'Calumet Specialty';

  // Hunt
  if (n.includes('hunt')) return 'Hunt Refining';

  // Ergon
  if (n.includes('ergon')) return 'Ergon';

  // CVR Energy
  if (n.includes('cvr refining')) return 'CVR Energy';

  // Pemex
  if (n.includes('deer park')) return 'Pemex';

  // United Refining
  if (n.includes('united refining')) return 'United Refining';

  // American Refining Group
  if (n.includes('american refining')) return 'American Refining Group';

  // Vertex Energy
  if (n.includes('vertex')) return 'Vertex Energy';

  // World Oil Corp
  if (n.includes('lunday thagard')) return 'World Oil Corp';

  // Kern Oil
  if (n.includes('kern oil')) return 'Kern Oil';

  // San Joaquin
  if (n.includes('san joaquin')) return 'San Joaquin Refining';

  // Hilcorp
  if (n.includes('hilcorp')) return 'Hilcorp';

  // ConocoPhillips
  if (n.includes('conocophillips')) return 'ConocoPhillips';

  // Placid
  if (n.includes('placid')) return 'Placid Refining';

  // Calcasieu
  if (n.includes('calcasieu')) return 'Calcasieu Refining';

  // Kinder Morgan
  if (n.includes('kinder morgan')) return 'Kinder Morgan';

  // Buckeye Partners
  if (n.includes('buckeye')) return 'Buckeye Partners';

  // Magellan
  if (n.includes('magellan')) return 'Magellan Midstream';

  // Targa
  if (n.includes('targa')) return 'Targa Resources';

  // Trecora
  if (n.includes('trecora')) return 'Trecora';

  // Petro Star
  if (n.includes('petro star')) return 'ASRC (Petro Star)';

  // Suncor
  if (n.includes('suncor')) return 'Suncor Energy';

  // Hartree
  if (n.includes('hartree')) return 'Hartree Partners';

  // Texas International Terminals
  if (n.includes('texas international')) return 'Texas International Terminals';

  // Petromax
  if (n.includes('petromax')) return 'Petromax';

  // San Antonio
  if (n.includes('san antonio')) return 'Starlight (San Antonio)';

  // Lazarus
  if (n.includes('lazarus')) return 'Lazarus Energy';

  // Foreland
  if (n.includes('foreland')) return 'Foreland Refining';

  // Talley
  if (n.includes('talley')) return 'Talley Asphalt';

  // Goodway
  if (n.includes('goodway')) return 'Goodway Refining';

  // Cross Oil
  if (n.includes('cross oil')) return 'Cross Oil';

  return name;
};

export const fetchRefineries = async (): Promise<ParsedRefinery[]> => {
  // Check cache first if we were still using dynamic fetching, 
  // but now we serve static data. We can still simulate async if needed.
  
  // For now, just return the static data
  // casting to ParsedRefinery[] because JSON import might be inferred loosely
  const allFacilities = facilitiesData as unknown as ParsedRefinery[];
  
  // Filter out petrochemicals for now as requested
  return allFacilities
    .filter(f => f.type === 'Oil Refinery')
    .map(f => ({
      ...f,
      company: normalizeCompanyName(f.company)
    }));
};

export const getPaddColor = (padd: number): string => {
  switch (padd) {
    case 1: return '#ef4444'; // Red
    case 2: return '#3b82f6'; // Blue
    case 3: return '#22c55e'; // Green
    case 4: return '#eab308'; // Yellow
    case 5: return '#a855f7'; // Purple
    default: return '#6b7280'; // Gray
  }
};

export const PADD_STATES: Record<number, string[]> = {
  1: ['Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Maine', 'Maryland', 'Massachusetts', 'New Hampshire', 'New Jersey', 'New York', 'North Carolina', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'Vermont', 'Virginia', 'West Virginia'],
  2: ['Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Michigan', 'Minnesota', 'Missouri', 'Nebraska', 'North Dakota', 'Ohio', 'Oklahoma', 'South Dakota', 'Tennessee', 'Wisconsin'],
  3: ['Alabama', 'Arkansas', 'Louisiana', 'Mississippi', 'New Mexico', 'Texas'],
  4: ['Colorado', 'Idaho', 'Montana', 'Utah', 'Wyoming'],
  5: ['Alaska', 'Arizona', 'California', 'Hawaii', 'Nevada', 'Oregon', 'Washington']
};

export const PADD_CENTERS: Record<number, [number, number]> = {
  1: [37.0, -74.0],  // East Coast
  2: [41.0, -92.0],  // Midwest
  3: [32.0, -98.0],  // Gulf Coast
  4: [44.0, -109.0], // Rockies
  5: [38.0, -119.0]  // West Coast
};

export const PADD_NAMES: Record<number, string> = {
  1: "East Coast",
  2: "Midwest",
  3: "Gulf Coast",
  4: "Rocky Mountain",
  5: "West Coast"
};
