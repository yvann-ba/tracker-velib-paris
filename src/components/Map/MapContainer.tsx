import { useState, useCallback, useRef, useEffect } from 'react';
import Map, { NavigationControl } from 'react-map-gl/mapbox';
import type { MapRef, ViewStateChangeEvent } from 'react-map-gl/mapbox';
import type { Station, LayerVisibility, StationGeoJSON, BikeTrip } from '../../types/velib';
import { MarkersLayer } from './MarkersLayer';
import { HeatmapLayer } from './HeatmapLayer';
import { ClustersLayer } from './ClustersLayer';
import { FlowLayer } from './FlowLayer';
import { Popup } from '../UI/Popup';
import 'mapbox-gl/dist/mapbox-gl.css';
import './MapContainer.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

// Centre de Paris - vue légèrement inclinée
const INITIAL_VIEW_STATE = {
  latitude: 48.8566,
  longitude: 2.3522,
  zoom: 12.5,
  bearing: 0,
  pitch: 0, // Flat view for cleaner look
};

interface MapContainerProps {
  geoJSON: StationGeoJSON;
  layerVisibility: LayerVisibility;
  isLoading: boolean;
  trips: BikeTrip[];
}

export function MapContainer({ geoJSON, layerVisibility, isLoading, trips }: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);
  const [viewState, setViewState] = useState(INITIAL_VIEW_STATE);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [cursor, setCursor] = useState<string>('grab');
  const [mapLoaded, setMapLoaded] = useState(false);

  const handleMove = useCallback((evt: ViewStateChangeEvent) => {
    setViewState(evt.viewState);
  }, []);

  const handleStationClick = useCallback((station: Station) => {
    setSelectedStation(station);
    
    mapRef.current?.flyTo({
      center: [station.lon, station.lat],
      zoom: Math.max(viewState.zoom, 15),
      duration: 800,
    });
  }, [viewState.zoom]);

  const handleClosePopup = useCallback(() => {
    setSelectedStation(null);
  }, []);

  const handleMouseEnter = useCallback(() => {
    setCursor('pointer');
  }, []);

  const handleMouseLeave = useCallback(() => {
    setCursor('grab');
  }, []);

  const handleMapLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // Close popup on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedStation(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get map bounds for clusters
  const getBounds = useCallback((): [number, number, number, number] => {
    const map = mapRef.current?.getMap();
    if (!map) {
      return [-180, -85, 180, 85];
    }
    const bounds = map.getBounds();
    if (!bounds) {
      return [-180, -85, 180, 85];
    }
    return [
      bounds.getWest(),
      bounds.getSouth(),
      bounds.getEast(),
      bounds.getNorth(),
    ];
  }, []);

  return (
    <div className="map-container">
      {isLoading && !mapLoaded && (
        <div className="map-loading">
          <div className="loading-spinner" />
          <span>Loading...</span>
        </div>
      )}
      
      <Map
        ref={mapRef}
        {...viewState}
        onMove={handleMove}
        onLoad={handleMapLoad}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={MAPBOX_TOKEN}
        cursor={cursor}
        maxZoom={18}
        minZoom={10}
        attributionControl={false}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {mapLoaded && (
          <>
            {/* Heatmap layer (bottom) */}
            {layerVisibility.heatmap && (
              <HeatmapLayer geoJSON={geoJSON} />
            )}

            {/* Clusters layer */}
            {layerVisibility.clusters && (
              <ClustersLayer
                geoJSON={geoJSON}
                zoom={viewState.zoom}
                bounds={getBounds()}
                onStationClick={handleStationClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              />
            )}

            {/* Markers layer */}
            {layerVisibility.markers && !layerVisibility.clusters && (
              <MarkersLayer
                geoJSON={geoJSON}
                onStationClick={handleStationClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              />
            )}

            {/* Flow layer - animated bike trips */}
            {layerVisibility.flow && (
              <FlowLayer trips={trips} />
            )}
          </>
        )}
      </Map>

      {/* Station popup */}
      {selectedStation && (
        <div 
          className="popup-overlay"
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 100,
          }}
        >
          <Popup station={selectedStation} onClose={handleClosePopup} />
        </div>
      )}

      {/* Refresh indicator */}
      {isLoading && mapLoaded && (
        <div className="refresh-indicator">
          <div className="refresh-spinner" />
          <span>Syncing...</span>
        </div>
      )}
    </div>
  );
}

export default MapContainer;
