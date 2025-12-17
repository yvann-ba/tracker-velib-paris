import axios from 'axios';
import type {
  StationInfo,
  StationInfoResponse,
  StationStatus,
  StationStatusResponse,
  Station,
  StationGeoJSON,
  StationFeature,
  VelibStats,
} from '../types/velib';

// API GBFS Vélib' Métropole endpoints (via Vite proxy to bypass CORS)
const GBFS_BASE_URL = '/api/velib';
const STATION_INFO_URL = `${GBFS_BASE_URL}/station_information.json`;
const STATION_STATUS_URL = `${GBFS_BASE_URL}/station_status.json`;

// Cache for static station information
let stationInfoCache: Map<string, StationInfo> | null = null;
let lastInfoFetch: number = 0;
const INFO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches static station information (name, position, capacity)
 */
export async function fetchStationInfo(): Promise<Map<string, StationInfo>> {
  const now = Date.now();
  
  // Use cache if available and still valid
  if (stationInfoCache && (now - lastInfoFetch) < INFO_CACHE_TTL) {
    return stationInfoCache;
  }

  try {
    const response = await axios.get<StationInfoResponse>(STATION_INFO_URL);
    const stations = response.data.data.stations;
    
    stationInfoCache = new Map();
    for (const station of stations) {
      // Convert station_id to string for consistent Map keys
      stationInfoCache.set(String(station.station_id), station);
    }
    
    lastInfoFetch = now;
    console.log(`Loaded ${stationInfoCache.size} station infos`);
    return stationInfoCache;
  } catch (error) {
    console.error('Error fetching station info:', error);
    // Return expired cache on error
    if (stationInfoCache) {
      return stationInfoCache;
    }
    throw error;
  }
}

/**
 * Fetches real-time station status (bike/dock availability)
 */
export async function fetchStationStatus(): Promise<StationStatus[]> {
  try {
    const response = await axios.get<StationStatusResponse>(STATION_STATUS_URL);
    console.log(`Loaded ${response.data.data.stations.length} station statuses`);
    return response.data.data.stations;
  } catch (error) {
    console.error('Error fetching station status:', error);
    throw error;
  }
}

/**
 * Extract bike counts from the num_bikes_available_types array
 * Format: [{"mechanical": N}, {"ebike": M}]
 */
function extractBikeCounts(bikeTypes: Array<Record<string, number>> | undefined): { mechanical: number; electric: number } {
  let mechanical = 0;
  let electric = 0;

  if (!bikeTypes || !Array.isArray(bikeTypes)) {
    return { mechanical, electric };
  }

  for (const bikeType of bikeTypes) {
    if (typeof bikeType === 'object' && bikeType !== null) {
      if ('mechanical' in bikeType) {
        mechanical = bikeType.mechanical || 0;
      }
      if ('ebike' in bikeType) {
        electric = bikeType.ebike || 0;
      }
    }
  }

  return { mechanical, electric };
}

/**
 * Merges static information and real-time status of stations
 */
export async function fetchStations(): Promise<Station[]> {
  const [stationInfoMap, stationStatuses] = await Promise.all([
    fetchStationInfo(),
    fetchStationStatus(),
  ]);

  const stations: Station[] = [];

  for (const status of stationStatuses) {
    // Convert station_id to string for Map lookup
    const stationId = String(status.station_id);
    const info = stationInfoMap.get(stationId);
    
    if (!info) {
      continue; // Skip if no info for this station
    }

    // Extract mechanical and electric bikes from the array format
    const { mechanical: mechanicalBikes, electric: electricBikes } = extractBikeCounts(
      status.num_bikes_available_types as Array<Record<string, number>>
    );
    
    const totalBikes = status.num_bikes_available || (mechanicalBikes + electricBikes);
    const availableDocks = status.num_docks_available || 0;
    const capacity = info.capacity || (totalBikes + availableDocks);

    const station: Station = {
      id: stationId,
      name: info.name,
      lat: info.lat,
      lon: info.lon,
      capacity,
      stationCode: info.stationCode || status.stationCode,
      mechanicalBikes,
      electricBikes,
      totalBikes,
      availableDocks,
      isInstalled: status.is_installed === 1,
      isReturning: status.is_returning === 1,
      isRenting: status.is_renting === 1,
      lastReported: new Date(status.last_reported * 1000),
      // Calculate ratios
      availabilityRatio: capacity > 0 ? totalBikes / capacity : 0,
      fillLevel: capacity > 0 ? (capacity - availableDocks) / capacity : 0,
    };

    stations.push(station);
  }

  console.log(`Merged ${stations.length} stations with data`);
  return stations;
}

/**
 * Converts stations to GeoJSON for Mapbox
 */
export function stationsToGeoJSON(stations: Station[]): StationGeoJSON {
  const features: StationFeature[] = stations
    .filter(station => station.isInstalled && station.lat && station.lon)
    .map(station => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [station.lon, station.lat],
      },
      properties: station,
    }));

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Calculates global statistics
 */
export function calculateStats(stations: Station[]): VelibStats {
  const activeStations = stations.filter(s => s.isInstalled);
  
  const stats: VelibStats = {
    totalStations: stations.length,
    activeStations: activeStations.length,
    totalBikes: 0,
    mechanicalBikes: 0,
    electricBikes: 0,
    availableDocks: 0,
    totalCapacity: 0,
    averageAvailability: 0,
    lastUpdated: null,
  };

  let latestReport: Date | null = null;

  for (const station of activeStations) {
    stats.totalBikes += station.totalBikes;
    stats.mechanicalBikes += station.mechanicalBikes;
    stats.electricBikes += station.electricBikes;
    stats.availableDocks += station.availableDocks;
    stats.totalCapacity += station.capacity;

    if (!latestReport || station.lastReported > latestReport) {
      latestReport = station.lastReported;
    }
  }

  stats.averageAvailability = stats.totalCapacity > 0 
    ? stats.totalBikes / stats.totalCapacity 
    : 0;
  stats.lastUpdated = latestReport;

  return stats;
}

/**
 * Returns a color based on availability ratio
 * Minimalist blue/cyan theme
 */
export function getAvailabilityColor(ratio: number): string {
  if (ratio >= 0.5) return '#38bdf8'; // Cyan - well stocked
  if (ratio >= 0.3) return '#818cf8'; // Indigo - moderate
  if (ratio >= 0.15) return '#f59e0b'; // Amber - low
  return '#f87171'; // Red - critical
}

/**
 * Returns RGB intensity for heatmap
 */
export function getHeatmapIntensity(totalBikes: number, maxBikes: number = 50): number {
  return Math.min(totalBikes / maxBikes, 1);
}
