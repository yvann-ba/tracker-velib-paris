import type { VelibStats } from '../../types/velib';
import './StatsPanel.css';

interface StatsPanelProps {
  stats: VelibStats;
  lastUpdate: Date | null;
  onRefresh: () => void;
  isLoading: boolean;
}

export function StatsPanel({ stats, onRefresh, isLoading }: StatsPanelProps) {
  return (
    <div className="stats-panel">
      {/* Total bikes */}
      <div className="stat-item">
        <span className="stat-value accent">{stats.totalBikes.toLocaleString('fr-FR')}</span>
        <span className="stat-label">Vélos</span>
      </div>

      <div className="stat-divider" />

      {/* Bike breakdown */}
      <div className="stat-item">
        <div className="stat-bikes">
          <div className="stat-bike">
            <span className="stat-bike-dot electric" />
            <span className="stat-bike-value">{stats.electricBikes.toLocaleString('fr-FR')}</span>
          </div>
          <div className="stat-bike">
            <span className="stat-bike-dot mechanical" />
            <span className="stat-bike-value">{stats.mechanicalBikes.toLocaleString('fr-FR')}</span>
          </div>
        </div>
        <span className="stat-label">Élec / Classic</span>
      </div>

      <div className="stat-divider" />

      {/* Stations */}
      <div className="stat-item">
        <span className="stat-value">{stats.activeStations.toLocaleString('fr-FR')}</span>
        <span className="stat-label">Stations</span>
      </div>

      <div className="stat-divider" />

      {/* Refresh */}
      <button
        className={`stats-refresh ${isLoading ? 'loading' : ''}`}
        onClick={onRefresh}
        disabled={isLoading}
        aria-label="Refresh data"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M23 4v6h-6" />
          <path d="M1 20v-6h6" />
          <path d="M3.51 9a9 9 0 0114.85-3.36L23 10" />
          <path d="M20.49 15a9 9 0 01-14.85 3.36L1 14" />
        </svg>
      </button>
    </div>
  );
}

export default StatsPanel;
