import { useState, useCallback } from 'react';
import { MapContainer } from './components/Map/MapContainer';
import { LayerToggle } from './components/Controls/LayerToggle';
import { StatsPanel } from './components/Controls/StatsPanel';
import { useVelibData } from './hooks/useVelibData';

import type { LayerVisibility, LayerType } from './types/velib';
import './App.css';

function App() {
  const { geoJSON, stats, isLoading, error, lastUpdate, refresh } = useVelibData({
    refreshInterval: 60000,
    autoRefresh: true,
  });

  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    markers: false,
    heatmap: false,
    clusters: true, // Clusters enabled by default
  });



  const handleLayerToggle = useCallback((layer: LayerType) => {
    setLayerVisibility((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  }, []);

  const formatTime = (date: Date | null): string => {
    if (!date) return '--:--';
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="app">
      {/* Minimal Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="brand-logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="5.5" cy="17.5" r="3.5" />
              <circle cx="18.5" cy="17.5" r="3.5" />
              <path d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 11.5V14l-3-3 4-3 2 3h3" />
            </svg>
          </div>
          <div className="brand-text">
            <span className="brand-title">Vélib' Flow</span>
            <span className="brand-subtitle">Paris Live</span>
          </div>
        </div>

        <div className="header-status">
          <div className="live-indicator">
            <span className="live-dot" />
            <span className="live-text">{formatTime(lastUpdate)}</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="app-main">
        {/* Error message */}
        {error && (
          <div className="error-banner">
            <span>⚠️</span>
            <span>Connection error. Retrying...</span>
          </div>
        )}

        {/* Map */}
        <MapContainer
          geoJSON={geoJSON}
          layerVisibility={layerVisibility}
          isLoading={isLoading}
        />

        {/* Controls overlay */}
        <div className="controls-overlay">
          <div className="controls-left">
            {/* Minimal stats */}
            <StatsPanel
              stats={stats}
              lastUpdate={lastUpdate}
              onRefresh={refresh}
              isLoading={isLoading}
            />

          </div>

          <div className="controls-right">
            {/* Layer toggle */}
            <LayerToggle
              visibility={layerVisibility}
              onToggle={handleLayerToggle}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
