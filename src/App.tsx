import { useState, useCallback } from 'react';
import { MapContainer } from './components/Map/MapContainer';
import { LayerToggle } from './components/Controls/LayerToggle';
import { StatsPanel } from './components/Controls/StatsPanel';
import { useVelibData } from './hooks/useVelibData';
import { useSimulatedTrips } from './hooks/useSimulatedTrips';
import type { LayerVisibility, LayerType } from './types/velib';
import './App.css';

function App() {
  const { stations, geoJSON, stats, isLoading, error, lastUpdate, refresh } = useVelibData({
    refreshInterval: 60000,
    autoRefresh: true,
  });

  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({
    markers: false,
    heatmap: false,
    clusters: false,
    flow: true, // Flow mode enabled by default
  });

  // Simulated trips for flow visualization
  const { trips, electricCount, mechanicalCount } = useSimulatedTrips({
    stations,
    enabled: layerVisibility.flow,
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
              <circle cx="5.5" cy="17.5" r="3.5"/>
              <circle cx="18.5" cy="17.5" r="3.5"/>
              <path d="M15 6a1 1 0 100-2 1 1 0 000 2zm-3 11.5V14l-3-3 4-3 2 3h3"/>
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
          trips={trips}
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

            {/* Flow stats when flow mode is active */}
            {layerVisibility.flow && (electricCount > 0 || mechanicalCount > 0) && (
              <div className="glass-panel flow-stats">
                <div className="flow-stat">
                  <span className="flow-stat-dot electric" />
                  <span className="flow-stat-value">{electricCount}</span>
                  <span className="flow-stat-label">Electric</span>
                </div>
                <div className="flow-stat">
                  <span className="flow-stat-dot mechanical" />
                  <span className="flow-stat-value">{mechanicalCount}</span>
                  <span className="flow-stat-label">Classic</span>
                </div>
              </div>
            )}
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
