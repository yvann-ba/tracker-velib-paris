import { useState, useEffect, useCallback, useRef } from 'react';
import type { Station, BikeTrip, BikeType, FlowConfig } from '../types/velib';

const DEFAULT_CONFIG: FlowConfig = {
  maxTrips: 150,
  tripDurationMin: 8000,  // 8 seconds minimum
  tripDurationMax: 25000, // 25 seconds maximum
  spawnRate: 3, // 3 trips per second
};

/**
 * Calculates distance between two points using Haversine formula
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generates a unique trip ID
 */
function generateTripId(): string {
  return `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Selects stations weighted by bike availability (more bikes = more likely to be origin)
 */
function selectOriginStation(stations: Station[]): Station | null {
  const eligible = stations.filter(s => s.totalBikes > 0 && s.isRenting);
  if (eligible.length === 0) return null;
  
  // Weight by number of available bikes
  const totalWeight = eligible.reduce((sum, s) => sum + s.totalBikes, 0);
  let random = Math.random() * totalWeight;
  
  for (const station of eligible) {
    random -= station.totalBikes;
    if (random <= 0) return station;
  }
  
  return eligible[Math.floor(Math.random() * eligible.length)];
}

/**
 * Selects destination station weighted by available docks and distance
 */
function selectDestinationStation(
  stations: Station[], 
  origin: Station,
  minDistance: number = 0.3, // km
  maxDistance: number = 5 // km
): Station | null {
  const eligible = stations.filter(s => {
    if (s.id === origin.id || !s.isReturning || s.availableDocks === 0) return false;
    const dist = haversineDistance(origin.lat, origin.lon, s.lat, s.lon);
    return dist >= minDistance && dist <= maxDistance;
  });
  
  if (eligible.length === 0) return null;
  
  // Weight by available docks (more docks = more likely destination)
  const totalWeight = eligible.reduce((sum, s) => sum + s.availableDocks, 0);
  let random = Math.random() * totalWeight;
  
  for (const station of eligible) {
    random -= station.availableDocks;
    if (random <= 0) return station;
  }
  
  return eligible[Math.floor(Math.random() * eligible.length)];
}

/**
 * Determines bike type based on station availability
 */
function selectBikeType(station: Station): BikeType {
  const total = station.mechanicalBikes + station.electricBikes;
  if (total === 0) return Math.random() > 0.5 ? 'electric' : 'mechanical';
  
  const electricRatio = station.electricBikes / total;
  return Math.random() < electricRatio ? 'electric' : 'mechanical';
}

/**
 * Creates a new simulated trip
 */
function createTrip(stations: Station[], config: FlowConfig): BikeTrip | null {
  const origin = selectOriginStation(stations);
  if (!origin) return null;
  
  const destination = selectDestinationStation(stations, origin);
  if (!destination) return null;
  
  const bikeType = selectBikeType(origin);
  const distance = haversineDistance(origin.lat, origin.lon, destination.lat, destination.lon);
  
  // Calculate realistic duration based on distance
  // Average bike speed: 15 km/h for mechanical, 20 km/h for electric
  const avgSpeed = bikeType === 'electric' ? 20 : 15;
  const baseDuration = (distance / avgSpeed) * 3600 * 1000; // ms
  
  // Scale duration for visualization (faster for demo)
  const scaledDuration = Math.max(
    config.tripDurationMin,
    Math.min(config.tripDurationMax, baseDuration / 10)
  );
  
  const now = Date.now();
  
  return {
    id: generateTripId(),
    bikeType,
    startStation: {
      id: origin.id,
      lat: origin.lat,
      lon: origin.lon,
      name: origin.name,
    },
    endStation: {
      id: destination.id,
      lat: destination.lat,
      lon: destination.lon,
      name: destination.name,
    },
    progress: 0,
    speed: avgSpeed,
    startTime: now,
    duration: scaledDuration,
  };
}

interface UseSimulatedTripsOptions {
  stations: Station[];
  enabled: boolean;
  config?: Partial<FlowConfig>;
}

interface UseSimulatedTripsReturn {
  trips: BikeTrip[];
  activeCount: number;
  electricCount: number;
  mechanicalCount: number;
}

export function useSimulatedTrips({
  stations,
  enabled,
  config: userConfig,
}: UseSimulatedTripsOptions): UseSimulatedTripsReturn {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const [trips, setTrips] = useState<BikeTrip[]>([]);
  const animationRef = useRef<number | null>(null);
  const lastSpawnRef = useRef<number>(Date.now());
  
  // Animation loop
  const animate = useCallback(() => {
    const now = Date.now();
    
    setTrips(prevTrips => {
      // Update progress of existing trips
      let updatedTrips = prevTrips
        .map(trip => ({
          ...trip,
          progress: Math.min(1, (now - trip.startTime) / trip.duration),
        }))
        .filter(trip => trip.progress < 1); // Remove completed trips
      
      // Spawn new trips
      const timeSinceLastSpawn = now - lastSpawnRef.current;
      const spawnInterval = 1000 / config.spawnRate;
      
      if (timeSinceLastSpawn >= spawnInterval && updatedTrips.length < config.maxTrips && stations.length > 0) {
        const newTrip = createTrip(stations, config);
        if (newTrip) {
          updatedTrips = [...updatedTrips, newTrip];
        }
        lastSpawnRef.current = now;
      }
      
      return updatedTrips;
    });
    
    animationRef.current = requestAnimationFrame(animate);
  }, [stations, config]);
  
  // Start/stop animation based on enabled state
  useEffect(() => {
    if (enabled && stations.length > 0) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (!enabled) {
        setTrips([]);
      }
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enabled, stations.length, animate]);
  
  // Calculate counts
  const electricCount = trips.filter(t => t.bikeType === 'electric').length;
  const mechanicalCount = trips.filter(t => t.bikeType === 'mechanical').length;
  
  return {
    trips,
    activeCount: trips.length,
    electricCount,
    mechanicalCount,
  };
}

export default useSimulatedTrips;

