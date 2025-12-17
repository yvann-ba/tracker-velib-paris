import type { Station } from '../../types/velib';
import './Popup.css';

interface PopupProps {
  station: Station;
  onClose: () => void;
}

export function Popup({ station, onClose }: PopupProps) {
  const availabilityPercent = Math.round(station.availabilityRatio * 100);
  
  return (
    <div className="station-popup">
      <button className="popup-close" onClick={onClose} aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
      
      <div className="popup-header">
        <h3 className="popup-title">{station.name}</h3>
        <span className="popup-availability">{availabilityPercent}%</span>
      </div>

      <div className="popup-bikes">
        <div className="popup-bike electric">
          <span className="popup-bike-dot" />
          <span className="popup-bike-count">{station.electricBikes}</span>
          <span className="popup-bike-label">Electric</span>
        </div>
        
        <div className="popup-bike mechanical">
          <span className="popup-bike-dot" />
          <span className="popup-bike-count">{station.mechanicalBikes}</span>
          <span className="popup-bike-label">Classic</span>
        </div>
        
        <div className="popup-bike docks">
          <span className="popup-bike-dot" />
          <span className="popup-bike-count">{station.availableDocks}</span>
          <span className="popup-bike-label">Docks</span>
        </div>
      </div>

      <div className="popup-bar">
        <div 
          className="popup-bar-fill"
          style={{ width: `${availabilityPercent}%` }}
        />
      </div>

      <div className="popup-footer">
        <span className="popup-capacity">{station.totalBikes} / {station.capacity}</span>
        {station.isRenting && station.isReturning ? (
          <span className="popup-status active">Active</span>
        ) : (
          <span className="popup-status inactive">Offline</span>
        )}
      </div>
    </div>
  );
}

export default Popup;
