import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, GeoJSON } from 'react-leaflet';
import { type ParsedRefinery, getPaddColor, PADD_STATES, PADD_CENTERS } from '../utils/data';
import L from 'leaflet';

interface MapProps {
  refineries: ParsedRefinery[];
  onSelectPadd: (padd: number) => void;
}

const Map: React.FC<MapProps> = ({ refineries, onSelectPadd }) => {
  const center: [number, number] = [39.8283, -98.5795]; // Center of US
  const zoom = 4;
  const [geoJsonData, setGeoJsonData] = useState<any>(null);

  // Calculate refinery counts per PADD
  const paddCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    refineries.forEach(r => {
      if (counts[r.padd] !== undefined) {
        counts[r.padd]++;
      }
    });
    return counts;
  }, [refineries]);

  useEffect(() => {
    // Fetch US states GeoJSON
    fetch('https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json')
      .then(response => response.json())
      .then(data => {
        // Add PADD property to each feature
        const enrichedFeatures = data.features.map((feature: any) => {
          const stateName = feature.properties.name;
          let padd = 0;
          
          // Find which PADD this state belongs to
          for (const [paddNum, states] of Object.entries(PADD_STATES)) {
            if (states.includes(stateName)) {
              padd = parseInt(paddNum);
              break;
            }
          }
          
          return {
            ...feature,
            properties: {
              ...feature.properties,
              padd
            }
          };
        });
        
        setGeoJsonData({ ...data, features: enrichedFeatures });
      })
      .catch(err => console.error("Failed to load GeoJSON:", err));
  }, []);

  const style = (feature: any) => {
    const padd = feature.properties.padd;
    return {
      fillColor: getPaddColor(padd),
      weight: 1,
      opacity: 1,
      color: 'white',
      dashArray: '3',
      fillOpacity: 0.4 // Increased opacity
    };
  };

  const onEachFeature = (feature: any, layer: L.Layer) => {
    if (feature.properties && feature.properties.padd) {
      layer.on({
        click: () => {
          onSelectPadd(feature.properties.padd);
        },
        mouseover: (e) => {
          const layer = e.target;
          layer.setStyle({
            fillOpacity: 0.7,
            weight: 2
          });
        },
        mouseout: (e) => {
          const layer = e.target;
          layer.setStyle({
            fillOpacity: 0.4,
            weight: 1
          });
        }
      });
    }
  };

  const createPaddLabelIcon = (padd: number, count: number) => {
    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-lg border-2 border-gray-100 transform -translate-x-1/2 -translate-y-1/2 hover:scale-110 transition-transform cursor-pointer pointer-events-auto">
          <div class="text-lg font-bold text-gray-900">PADD ${padd}</div>
          <div class="text-sm font-medium text-blue-600 whitespace-nowrap">${count} Refineries</div>
        </div>
      `,
      iconSize: [120, 60],
      iconAnchor: [60, 30]
    });
  };

  return (
    <div className="h-full w-full bg-slate-900">
      <MapContainer center={center} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        {geoJsonData && (
          <GeoJSON 
            data={geoJsonData} 
            style={style} 
            onEachFeature={onEachFeature}
          />
        )}

        {/* PADD Labels */}
        {Object.entries(PADD_CENTERS).map(([paddStr, center]) => {
          const padd = parseInt(paddStr);
          return (
            <Marker
              key={padd}
              position={center}
              icon={createPaddLabelIcon(padd, paddCounts[padd] || 0)}
              eventHandlers={{
                click: () => {
                  console.log(`Clicked PADD ${padd} label`);
                  onSelectPadd(padd);
                }
              }}
            />
          );
        })}
      </MapContainer>
    </div>
  );
};

export default Map;
