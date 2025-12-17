// Types pour l'API GBFS Vélib' Métropole

// Station Information (données statiques)
export interface StationInfo {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  stationCode: string;
}

export interface StationInfoResponse {
  lastUpdatedOther: number;
  ttl: number;
  data: {
    stations: StationInfo[];
  };
}

// Station Status (données temps réel)
export interface StationStatus {
  station_id: string;
  stationCode: string;
  num_bikes_available: number;
  numBikesAvailable: number;
  num_bikes_available_types: {
    mechanical: number;
    ebike: number;
  }[];
  num_docks_available: number;
  numDocksAvailable: number;
  is_installed: number;
  is_returning: number;
  is_renting: number;
  last_reported: number;
}

export interface StationStatusResponse {
  lastUpdatedOther: number;
  ttl: number;
  data: {
    stations: StationStatus[];
  };
}

// Données fusionnées pour l'application
export interface Station {
  id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  stationCode: string;
  mechanicalBikes: number;
  electricBikes: number;
  totalBikes: number;
  availableDocks: number;
  isInstalled: boolean;
  isReturning: boolean;
  isRenting: boolean;
  lastReported: Date;
  // Métriques calculées
  availabilityRatio: number; // 0-1, ratio vélos disponibles / capacité
  fillLevel: number; // 0-1, ratio places occupées / capacité
}

// GeoJSON types pour Mapbox
export interface StationFeature {
  type: 'Feature';
  geometry: {
    type: 'Point';
    coordinates: [number, number]; // [lon, lat]
  };
  properties: Station;
}

export interface StationGeoJSON {
  type: 'FeatureCollection';
  features: StationFeature[];
}

// Cluster properties pour Supercluster
export interface ClusterProperties {
  cluster: boolean;
  cluster_id?: number;
  point_count?: number;
  point_count_abbreviated?: string | number;
  // Pour les points individuels (non-clusters)
  id?: string;
  name?: string;
  totalBikes?: number;
  mechanicalBikes?: number;
  electricBikes?: number;
  availableDocks?: number;
  capacity?: number;
  availabilityRatio?: number;
}

// Types pour les couches de visualisation
export type LayerType = 'markers' | 'heatmap' | 'clusters';

export interface LayerVisibility {
  markers: boolean;
  heatmap: boolean;
  clusters: boolean;
}

// Types pour le mode Flow - simulation de déplacements
export type BikeType = 'mechanical' | 'electric';

export interface BikeTrip {
  id: string;
  bikeType: BikeType;
  startStation: {
    id: string;
    lat: number;
    lon: number;
    name: string;
  };
  endStation: {
    id: string;
    lat: number;
    lon: number;
    name: string;
  };
  progress: number; // 0 to 1
  speed: number; // km/h estimated
  startTime: number;
  duration: number; // ms
}

export interface FlowConfig {
  maxTrips: number;
  tripDurationMin: number; // ms
  tripDurationMax: number; // ms
  spawnRate: number; // trips per second
}

// Statistiques globales
export interface VelibStats {
  totalStations: number;
  activeStations: number;
  totalBikes: number;
  mechanicalBikes: number;
  electricBikes: number;
  availableDocks: number;
  totalCapacity: number;
  averageAvailability: number;
  lastUpdated: Date | null;
}

