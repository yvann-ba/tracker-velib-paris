import { useEffect } from 'react';
import { Source, Layer, useMap } from 'react-map-gl/mapbox';
import type { HeatmapLayerSpecification } from 'mapbox-gl';
import type { StationGeoJSON } from '../../types/velib';

interface HeatmapLayerProps {
  geoJSON: StationGeoJSON;
}

// Heatmap configuration - enhanced visibility with vibrant colors
const heatmapLayerStyle: Omit<HeatmapLayerSpecification, 'id' | 'source'> = {
  type: 'heatmap',
  paint: {
    // Weight based on total bikes - stronger weights
    'heatmap-weight': [
      'interpolate',
      ['linear'],
      ['get', 'totalBikes'],
      0, 0,
      3, 0.3,
      10, 0.5,
      20, 0.75,
      35, 0.9,
      50, 1,
    ],
    // Intensity based on zoom - significantly increased
    'heatmap-intensity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 1.5,
      12, 2.0,
      14, 2.5,
      16, 3.0,
    ],
    // Enhanced color gradient - more vibrant and visible
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(0, 0, 0, 0)',
      0.1, 'rgba(15, 23, 100, 0.6)',    // Deep blue
      0.25, 'rgba(56, 189, 248, 0.7)',  // Cyan accent
      0.4, 'rgba(0, 255, 200, 0.75)',   // Turquoise
      0.55, 'rgba(100, 255, 100, 0.8)', // Lime green
      0.7, 'rgba(255, 220, 50, 0.85)',  // Warm yellow
      0.85, 'rgba(255, 140, 50, 0.9)',  // Orange
      1, 'rgba(255, 60, 60, 0.95)',     // Bright red
    ],
    // Radius based on zoom - much larger for visibility
    'heatmap-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 35,
      11, 45,
      12, 55,
      13, 65,
      14, 75,
      15, 85,
      16, 95,
    ],
    // Opacity - higher for better visibility
    'heatmap-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 0.9,
      12, 0.88,
      14, 0.85,
      16, 0.8,
    ],
  },
};

export function HeatmapLayer({ geoJSON }: HeatmapLayerProps) {
  const { current: map } = useMap();

  // Transform data for heatmap
  const heatmapData = {
    type: 'FeatureCollection' as const,
    features: geoJSON.features.map((feature) => ({
      type: 'Feature' as const,
      geometry: feature.geometry,
      properties: {
        totalBikes: feature.properties.totalBikes,
        mechanicalBikes: feature.properties.mechanicalBikes,
        electricBikes: feature.properties.electricBikes,
      },
    })),
  };

  useEffect(() => {
    if (map) {
      map.triggerRepaint();
    }
  }, [map, geoJSON]);

  return (
    <Source id="velib-heatmap-source" type="geojson" data={heatmapData}>
      <Layer
        id="velib-heatmap-layer"
        type="heatmap"
        paint={heatmapLayerStyle.paint}
      />
    </Source>
  );
}

export default HeatmapLayer;
