import type { LayerVisibility, LayerType } from '../../types/velib';
import './LayerToggle.css';

interface LayerToggleProps {
  visibility: LayerVisibility;
  onToggle: (layer: LayerType) => void;
}

// SVG icons for each layer
const icons: Record<LayerType, JSX.Element> = {
  flow: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  markers: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
  heatmap: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a10 10 0 00-6.88 17.23A6 6 0 0112 22a6 6 0 016.88-2.77A10 10 0 0012 2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  clusters: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <circle cx="19" cy="5" r="2" />
      <circle cx="5" cy="5" r="2" />
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="19" r="2" />
      <line x1="12" y1="9" x2="12" y2="5" />
      <line x1="9.5" y1="13.5" x2="6" y2="17" />
      <line x1="14.5" y1="13.5" x2="18" y2="17" />
    </svg>
  ),
};

const labels: Record<LayerType, string> = {
  flow: 'Flow',
  markers: 'Points',
  heatmap: 'Heat',
  clusters: 'Clusters',
};

const LAYERS: LayerType[] = ['flow', 'clusters', 'heatmap', 'markers'];

export function LayerToggle({ visibility, onToggle }: LayerToggleProps) {
  return (
    <div className="layer-toggle">
      {LAYERS.map((layer) => (
        <button
          key={layer}
          className={`layer-btn ${visibility[layer] ? 'active' : ''}`}
          onClick={() => onToggle(layer)}
          aria-label={labels[layer]}
        >
          {icons[layer]}
          <span className="layer-btn-tooltip">{labels[layer]}</span>
        </button>
      ))}
    </div>
  );
}

export default LayerToggle;
