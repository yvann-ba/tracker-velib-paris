import Supercluster from 'supercluster';
import type { StationGeoJSON, StationFeature, ClusterProperties } from '../types/velib';

export type ClusterFeature = Supercluster.ClusterFeature<ClusterProperties> | Supercluster.PointFeature<ClusterProperties>;

/**
 * Crée une instance Supercluster configurée pour les stations Vélib'
 */
export function createSupercluster(geoJSON: StationGeoJSON): Supercluster<ClusterProperties> {
  const cluster = new Supercluster<ClusterProperties>({
    radius: 60,
    maxZoom: 16,
    minZoom: 0,
    map: (props) => ({
      totalBikes: props.totalBikes || 0,
      mechanicalBikes: props.mechanicalBikes || 0,
      electricBikes: props.electricBikes || 0,
      availableDocks: props.availableDocks || 0,
      capacity: props.capacity || 0,
    }),
    reduce: (accumulated, props) => {
      accumulated.totalBikes = (accumulated.totalBikes || 0) + (props.totalBikes || 0);
      accumulated.mechanicalBikes = (accumulated.mechanicalBikes || 0) + (props.mechanicalBikes || 0);
      accumulated.electricBikes = (accumulated.electricBikes || 0) + (props.electricBikes || 0);
      accumulated.availableDocks = (accumulated.availableDocks || 0) + (props.availableDocks || 0);
      accumulated.capacity = (accumulated.capacity || 0) + (props.capacity || 0);
    },
  });

  // Convertir les features pour Supercluster
  const points = geoJSON.features.map((feature: StationFeature) => ({
    type: 'Feature' as const,
    geometry: feature.geometry,
    properties: {
      cluster: false,
      id: feature.properties.id,
      name: feature.properties.name,
      totalBikes: feature.properties.totalBikes,
      mechanicalBikes: feature.properties.mechanicalBikes,
      electricBikes: feature.properties.electricBikes,
      availableDocks: feature.properties.availableDocks,
      capacity: feature.properties.capacity,
      availabilityRatio: feature.properties.availabilityRatio,
    } as ClusterProperties,
  }));

  cluster.load(points);
  return cluster;
}

/**
 * Récupère les clusters pour une bbox et un niveau de zoom donnés
 */
export function getClusters(
  supercluster: Supercluster<ClusterProperties>,
  bounds: [number, number, number, number], // [west, south, east, north]
  zoom: number
): ClusterFeature[] {
  return supercluster.getClusters(bounds, Math.floor(zoom));
}

/**
 * Formate un nombre pour l'affichage
 */
export function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`;
  }
  return num.toString();
}

/**
 * Calcule le rayon d'un cluster basé sur le nombre de points
 */
export function getClusterRadius(pointCount: number): number {
  const baseRadius = 20;
  const scale = Math.log10(pointCount + 1);
  return Math.min(baseRadius + scale * 15, 50);
}

/*
 * New minimalist sombre theme
 */
export function getClusterColor(totalBikes: number, capacity: number): string {
  const ratio = capacity > 0 ? totalBikes / capacity : 0;

  // Using somewhat clearer colors but keeping them darker/muted in the CSS override effectively,
  // but here we return the 'base' color which might show through borders or if we remove !important.
  // Actually, let's return colors that look good on dark map.
  if (ratio >= 0.5) return '#0ea5e9'; // Sky 500
  if (ratio >= 0.25) return '#6366f1'; // Indigo 500
  if (ratio >= 0.1) return '#d946ef'; // Fuschia 500
  return '#64748b'; // Slate 500 (Empty/Low)
}

