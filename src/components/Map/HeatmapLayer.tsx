import { useEffect } from 'react';
import { Source, Layer, useMap } from 'react-map-gl/mapbox';
import type { HeatmapLayerSpecification } from 'mapbox-gl';
import type { StationGeoJSON } from '../../types/velib';

interface HeatmapLayerProps {
  geoJSON: StationGeoJSON;
}

// Heatmap configuration - minimalist blue/cyan theme
const heatmapLayerStyle: Omit<HeatmapLayerSpecification, 'id' | 'source'> = {
  type: 'heatmap',
  paint: {
    // Weight based on total bikes
    'heatmap-weight': [
      'interpolate',
      ['linear'],
      ['get', 'totalBikes'],
      0, 0,
      5, 0.3,
      15, 0.6,
      30, 0.8,
      50, 1,
    ],
    // Intensity based on zoom
    'heatmap-intensity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 0.4,
      13, 0.8,
      16, 1.2,
    ],
    // Minimalist blue/cyan gradient
    'heatmap-color': [
      'interpolate',
      ['linear'],
      ['heatmap-density'],
      0, 'rgba(0, 0, 0, 0)',
      0.1, 'rgba(15, 23, 42, 0.3)',        // Dark slate
      0.2, 'rgba(30, 41, 59, 0.4)',        // Slate 800
      0.3, 'rgba(51, 65, 85, 0.5)',        // Slate 700
      0.4, 'rgba(56, 189, 248, 0.4)',      // Cyan 400
      0.5, 'rgba(56, 189, 248, 0.5)',      // Cyan 400
      0.6, 'rgba(99, 102, 241, 0.55)',     // Indigo 500
      0.7, 'rgba(129, 140, 248, 0.6)',     // Indigo 400
      0.8, 'rgba(167, 139, 250, 0.65)',    // Violet 400
      0.9, 'rgba(192, 132, 252, 0.7)',     // Purple 400
      1, 'rgba(236, 72, 153, 0.75)',       // Pink 500
    ],
    // Radius based on zoom
    'heatmap-radius': [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 15,
      12, 25,
      14, 35,
      16, 45,
    ],
    // Opacity based on zoom
    'heatmap-opacity': [
      'interpolate',
      ['linear'],
      ['zoom'],
      10, 0.7,
      14, 0.5,
      16, 0.3,
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
