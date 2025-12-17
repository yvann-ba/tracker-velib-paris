import { useEffect, useRef, useMemo } from 'react';
import { useMap } from 'react-map-gl/mapbox';
import type { BikeTrip } from '../../types/velib';

interface FlowLayerProps {
  trips: BikeTrip[];
}

// Interpolate position along a bezier curve for smoother paths
function interpolatePosition(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number,
  progress: number
): [number, number] {
  // Add a slight curve to make paths more interesting
  const midLat = (startLat + endLat) / 2;
  const midLon = (startLon + endLon) / 2;
  
  // Offset mid point perpendicular to the line
  const dx = endLon - startLon;
  const dy = endLat - startLat;
  const len = Math.sqrt(dx * dx + dy * dy);
  
  // Curve intensity based on distance
  const curveOffset = len * 0.15;
  const perpX = -dy / len * curveOffset;
  const perpY = dx / len * curveOffset;
  
  // Alternate curve direction based on trip id hash
  const curvedMidLat = midLat + perpY;
  const curvedMidLon = midLon + perpX;
  
  // Quadratic bezier interpolation
  const t = progress;
  const mt = 1 - t;
  
  const lat = mt * mt * startLat + 2 * mt * t * curvedMidLat + t * t * endLat;
  const lon = mt * mt * startLon + 2 * mt * t * curvedMidLon + t * t * endLon;
  
  return [lon, lat];
}

// Generate trail points for a trip
function generateTrailPoints(trip: BikeTrip, numPoints: number = 8): [number, number][] {
  const points: [number, number][] = [];
  const trailLength = 0.15; // Trail length as fraction of total path
  
  for (let i = 0; i < numPoints; i++) {
    const trailProgress = trip.progress - (i / numPoints) * trailLength;
    if (trailProgress < 0) continue;
    
    const pos = interpolatePosition(
      trip.startStation.lat,
      trip.startStation.lon,
      trip.endStation.lat,
      trip.endStation.lon,
      Math.max(0, trailProgress)
    );
    points.push(pos);
  }
  
  return points;
}

export function FlowLayer({ trips }: FlowLayerProps) {
  const { current: map } = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  // Colors for bike types - cyan for electric, silver/white for mechanical
  const colors = useMemo(() => ({
    electric: {
      head: 'rgba(56, 189, 248, 1)',      // Bright cyan
      trail: 'rgba(56, 189, 248, 0.6)',
      glow: 'rgba(56, 189, 248, 0.3)',
    },
    mechanical: {
      head: 'rgba(226, 232, 240, 1)',     // Silver white
      trail: 'rgba(226, 232, 240, 0.5)',
      glow: 'rgba(226, 232, 240, 0.2)',
    },
  }), []);
  
  useEffect(() => {
    if (!map) return;
    
    const mapCanvas = map.getCanvas();
    const container = mapCanvas.parentElement;
    if (!container) return;
    
    // Create overlay canvas
    let canvas = canvasRef.current;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '10';
      container.appendChild(canvas);
      canvasRef.current = canvas;
    }
    
    // Match canvas size
    const resizeCanvas = () => {
      if (canvas) {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    map.on('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      map.off('resize', resizeCanvas);
    };
  }, [map]);
  
  // Draw animation frame
  useEffect(() => {
    if (!map || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      for (const trip of trips) {
        const color = colors[trip.bikeType];
        const trailPoints = generateTrailPoints(trip);
        
        if (trailPoints.length < 2) continue;
        
        // Convert geo coordinates to screen coordinates
        const screenPoints = trailPoints.map(([lon, lat]) => {
          const point = map.project([lon, lat]);
          return { x: point.x, y: point.y };
        });
        
        // Draw glow
        ctx.beginPath();
        ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
        for (let i = 1; i < screenPoints.length; i++) {
          ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
        }
        ctx.strokeStyle = color.glow;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // Draw trail with gradient
        if (screenPoints.length >= 2) {
          const gradient = ctx.createLinearGradient(
            screenPoints[0].x, screenPoints[0].y,
            screenPoints[screenPoints.length - 1].x, screenPoints[screenPoints.length - 1].y
          );
          gradient.addColorStop(0, color.head);
          gradient.addColorStop(1, 'transparent');
          
          ctx.beginPath();
          ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
          for (let i = 1; i < screenPoints.length; i++) {
            ctx.lineTo(screenPoints[i].x, screenPoints[i].y);
          }
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        
        // Draw head point
        if (screenPoints.length > 0) {
          const head = screenPoints[0];
          
          // Outer glow
          ctx.beginPath();
          ctx.arc(head.x, head.y, 6, 0, Math.PI * 2);
          ctx.fillStyle = color.glow;
          ctx.fill();
          
          // Inner point
          ctx.beginPath();
          ctx.arc(head.x, head.y, 3, 0, Math.PI * 2);
          ctx.fillStyle = color.head;
          ctx.fill();
        }
      }
      
      ctx.restore();
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    // Redraw on map move
    const handleMove = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      animationRef.current = requestAnimationFrame(draw);
    };
    
    map.on('move', handleMove);
    map.on('zoom', handleMove);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      map.off('move', handleMove);
      map.off('zoom', handleMove);
    };
  }, [map, trips, colors]);
  
  // Cleanup canvas on unmount
  useEffect(() => {
    return () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        canvasRef.current.parentElement.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, []);
  
  return null;
}

export default FlowLayer;

