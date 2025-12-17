import { useMemo, useCallback } from 'react';
import { Marker } from 'react-map-gl/mapbox';
import type { Station, StationGeoJSON, ClusterProperties } from '../../types/velib';
import { createSupercluster, getClusters, getClusterRadius, getClusterColor, formatNumber } from '../../utils/dataTransform';
import './ClustersLayer.css';

interface ClustersLayerProps {
  geoJSON: StationGeoJSON;
  zoom: number;
  bounds: [number, number, number, number];
  onStationClick: (station: Station) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

export function ClustersLayer({
  geoJSON,
  zoom,
  bounds,
  onStationClick,
  onMouseEnter,
  onMouseLeave,
}: ClustersLayerProps) {
  // Créer l'instance Supercluster
  const supercluster = useMemo(() => {
    if (geoJSON.features.length === 0) return null;
    return createSupercluster(geoJSON);
  }, [geoJSON]);

  // Obtenir les clusters pour la vue actuelle
  const clusters = useMemo(() => {
    if (!supercluster) return [];
    return getClusters(supercluster, bounds, zoom);
  }, [supercluster, bounds, zoom]);

  const handleClusterClick = useCallback((clusterId: number) => {
    if (!supercluster) return;

    // Obtenir le zoom pour expanser le cluster
    const expansionZoom = Math.min(
      supercluster.getClusterExpansionZoom(clusterId),
      18
    );

    // Note: L'expansion du zoom est gérée par le composant parent
    console.log(`Cluster ${clusterId} clicked, expansion zoom: ${expansionZoom}`);
  }, [supercluster]);

  const handleStationMarkerClick = useCallback((properties: ClusterProperties) => (e: React.MouseEvent) => {
    e.stopPropagation();

    // Trouver la station correspondante dans geoJSON
    const stationFeature = geoJSON.features.find(f => f.properties.id === properties.id);
    if (stationFeature) {
      onStationClick(stationFeature.properties);
    }
  }, [geoJSON.features, onStationClick]);

  return (
    <>
      {clusters.map((cluster) => {
        const [longitude, latitude] = cluster.geometry.coordinates;
        const properties = cluster.properties as ClusterProperties;

        // C'est un cluster
        if (properties.cluster) {
          const pointCount = properties.point_count || 0;
          const totalBikes = properties.totalBikes || 0;
          const capacity = properties.capacity || 0;
          const radius = getClusterRadius(pointCount);
          const color = getClusterColor(totalBikes, capacity);

          return (
            <Marker
              key={`cluster-${properties.cluster_id}`}
              longitude={longitude}
              latitude={latitude}
            >
              <div
                className="cluster-marker"
                onClick={() => handleClusterClick(properties.cluster_id!)}
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
                style={{
                  width: `${radius * 1.5}px`, // Slightly smaller
                  height: `${radius * 1.5}px`,
                  // Pass color as CSS variable for the gradient/glow
                  ['--cluster-color' as any]: color,
                }}
              >
                <div className="cluster-inner">
                  <span className="cluster-count">{formatNumber(pointCount)}</span>
                </div>
              </div>
            </Marker>
          );
        }

        // C'est un point individuel (station)
        const stationColor = getClusterColor(
          properties.totalBikes || 0,
          properties.capacity || 1
        );

        return (
          <Marker
            key={`station-${properties.id}`}
            longitude={longitude}
            latitude={latitude}
          >
            <div
              className="station-point"
              onClick={handleStationMarkerClick(properties)}
              onMouseEnter={onMouseEnter}
              onMouseLeave={onMouseLeave}
              style={{
                ['--station-color' as any]: stationColor,
              }}
            >
              <span className="station-bikes">{properties.totalBikes}</span>
            </div>
          </Marker>
        );
      })}
    </>
  );
}

export default ClustersLayer;
