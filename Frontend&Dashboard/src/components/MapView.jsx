import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  CircleMarker,
  useMap
} from 'react-leaflet';

import L from 'leaflet';

import 'leaflet/dist/leaflet.css';

import {
  MAP_CONFIG,
  AMBULANCE_POSITION,
  JUNCTIONS
} from '../constants/config';

// =====================================================
// FIX LEAFLET DEFAULT ICON
// =====================================================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),

  iconUrl: require('leaflet/dist/images/marker-icon.png'),

  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// =====================================================
// SMOOTH AMBULANCE MARKER WITH ROTATION
// =====================================================

const SmoothAmbulanceMarker = ({ position, targetPosition }) => {
  const markerRef = useRef(null);
  const [currentPos, setCurrentPos] = useState(position);
  const [rotation, setRotation] = useState(0);
  const animationRef = useRef(null);
  const startPosRef = useRef(position);
  const startTimeRef = useRef(Date.now());
  const durationRef = useRef(2000); // 2 seconds for smooth transition

  // Calculate bearing (rotation angle) between two points
  const calculateBearing = useCallback((start, end) => {
    const startLat = start[0] * Math.PI / 180;
    const startLng = start[1] * Math.PI / 180;
    const endLat = end[0] * Math.PI / 180;
    const endLng = end[1] * Math.PI / 180;

    const dLng = endLng - startLng;

    const y = Math.sin(dLng) * Math.cos(endLat);
    const x = Math.cos(startLat) * Math.sin(endLat) -
              Math.sin(startLat) * Math.cos(endLat) * Math.cos(dLng);

    const bearing = Math.atan2(y, x) * 180 / Math.PI;
    return (bearing + 360) % 360; // Normalize to 0-360
  }, []);

  // Ease-in-out interpolation function
  const easeInOutCubic = useCallback((t) => {
    return t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }, []);

  // Interpolate between two positions
  const interpolatePosition = useCallback((start, end, progress) => {
    const easedProgress = easeInOutCubic(progress);
    return [
      start[0] + (end[0] - start[0]) * easedProgress,
      start[1] + (end[1] - start[1]) * easedProgress
    ];
  }, [easeInOutCubic]);

  useEffect(() => {
    // When target position changes, start new animation
    if (targetPosition && 
        (targetPosition[0] !== startPosRef.current[0] || 
         targetPosition[1] !== startPosRef.current[1])) {
      
      const startPos = currentPos;
      startPosRef.current = startPos;
      startTimeRef.current = Date.now();
      
      // Calculate rotation for new direction
      const newRotation = calculateBearing(startPos, targetPosition);
      setRotation(newRotation);

      const animate = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsed / durationRef.current, 1);

        if (progress < 1) {
          const newPos = interpolatePosition(
            startPosRef.current,
            targetPosition,
            progress
          );
          setCurrentPos(newPos);
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setCurrentPos(targetPosition);
          animationRef.current = null;
        }
      };

      // Cancel any ongoing animation
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetPosition, currentPos, calculateBearing, interpolatePosition]);

  // Create custom ambulance icon with rotation
  const createRotatedAmbulanceIcon = (rotation) => {
    return L.divIcon({
      className: 'ambulance-marker-smooth',
      html: `
        <div style="
          position: relative;
          width: 64px;
          height: 64px;
          transform: rotate(${rotation}deg);
          transition: transform 0.3s ease-out;
        ">
          <div style="
            position: absolute;
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: rgba(255, 59, 48, 0.3);
            animation: pulse-ring 2s ease-out infinite;
          "></div>
          <div style="
            position: absolute;
            width: 64px;
            height: 64px;
            border-radius: 50%;
            background: #ff3b30;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 32px;
            box-shadow: 0 0 30px rgba(255,59,48,0.9), 0 0 60px rgba(255,59,48,0.5);
            border: 4px solid white;
          ">
            🚑
          </div>
        </div>
        <style>
          @keyframes pulse-ring {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            100% {
              transform: scale(2);
              opacity: 0;
            }
          }
        </style>
      `,
      iconSize: [64, 64],
      iconAnchor: [32, 32],
      popupAnchor: [0, -32],
    });
  };

  return (
    <Marker
      ref={markerRef}
      position={currentPos}
      icon={createRotatedAmbulanceIcon(rotation)}
    >
      <Popup>
        <div style={{ color: 'black' }}>
          <strong>AMB001</strong>
          <br />
          Emergency Vehicle
        </div>
      </Popup>
    </Marker>
  );
};

// =====================================================
// MAP BOUNDS CONTROLLER - AUTO-FOCUS ON EMERGENCY
// =====================================================

const MapBoundsController = ({ ambulancePos, activeJunction }) => {
  const map = useMap();

  useEffect(() => {
    if (
    !activeJunction?.coords ||
    !ambulancePos ||
    ambulancePos.length !== 2
) {
    return;
}

    // Create bounds between ambulance and active junction
    const bounds = L.latLngBounds([
      ambulancePos,
      activeJunction.coords
    ]);

    // Fit map to emergency corridor with padding
    map.fitBounds(bounds, {
    padding: [80, 80],
    maxZoom: 15,
    animate: false
});
      

  }, [map, ambulancePos, activeJunction]);

  return null;
};

// =====================================================
// ANIMATED ROUTE - THICK EMERGENCY LINE
// =====================================================

const AnimatedPolyline = ({
  positions,
  color = '#ff3b30',
  dashArray = '20,15',
  opacity = 0.9
}) => {

  const map = useMap();

  const polylineRef = useRef(null);

  useEffect(() => {

    if (!positions || positions.length < 2) return;

    const polyline = L.polyline(positions, {
      color,
      weight: 8,
      opacity,
      dashArray,
    }).addTo(map);

    polylineRef.current = polyline;

    let offset = 0;

    let animationFrame;

    const animate = () => {

      offset = (offset + 2) % 70;

      if (polylineRef.current) {

        polylineRef.current.setStyle({
          dashOffset: -offset,
        });

      }

      animationFrame = requestAnimationFrame(animate);

    };

    animate();

    return () => {

      cancelAnimationFrame(animationFrame);

      if (map && polyline && map.hasLayer(polyline)) {
    map.removeLayer(polyline);
}

    };

  }, [positions, color, dashArray, opacity, map]);

  return null;
};

// =====================================================
// JUNCTION MARKER WITH ENHANCED ACTIVE VISUALIZATION
// =====================================================

const JunctionMarker = ({
  junction,
  isActive,
  eta,
  urgency
}) => {
  const map = useMap();
  const radarRef = useRef(null);

  const getColor = () => {
    if (!isActive) return '#38bdf8';
    if (urgency === 'HIGH') return '#ff3b30';
    return '#22c55e';
  };

  const color = getColor();
  const isPulsing = isActive && urgency === 'HIGH';

  // Radar scan animation for active junction
  useEffect(() => {
    if (!isActive || !map || !junction?.coords) return;

    let angle = 0;
    let animationFrame;

    const radarScan = () => {
      if (radarRef.current && map.hasLayer(radarRef.current)) {
        map.removeLayer(radarRef.current);
      }

      // Create radar sweep line
      const startPoint = junction.coords;
      const distance = 0.002; // Radius in degrees
      const endLat = startPoint[0] + distance * Math.cos(angle * Math.PI / 180);
      const endLng = startPoint[1] + distance * Math.sin(angle * Math.PI / 180);

      const radarLine = L.polyline([startPoint, [endLat, endLng]], {
        color: color,
        weight: 2,
        opacity: 0.6,
        className: 'radar-sweep'
      }).addTo(map);

      radarRef.current = radarLine;

      angle = (angle + 6) % 360; // 6 degrees per frame for smooth rotation
      animationFrame = requestAnimationFrame(radarScan);
    };

    radarScan();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      if (radarRef.current && map.hasLayer(radarRef.current)) {
        map.removeLayer(radarRef.current);
      }
    };
  }, [isActive, map, junction?.coords, color]);

  // Early return after all hooks
  if (!junction || !junction.coords) return null;

  // Create custom marker with label for active junction
  const createActiveJunctionIcon = () => {
    if (!isActive) return null;

    return L.divIcon({
      className: 'active-junction-label',
      html: `
        <div style="
          position: absolute;
          bottom: 80px;
          left: 50%;
          transform: translateX(-50%);
          background: linear-gradient(135deg, ${color}22 0%, ${color}44 100%);
          border: 2px solid ${color};
          border-radius: 6px;
          padding: 6px 12px;
          white-space: nowrap;
          font-family: 'Inter', sans-serif;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: ${color};
          text-shadow: 0 0 10px ${color}66;
          box-shadow: 0 0 20px ${color}66, 0 4px 12px rgba(0,0,0,0.4);
          animation: label-pulse 2s ease-in-out infinite;
        ">
          🎯 ACTIVE PRIORITY ZONE
        </div>
        <style>
          @keyframes label-pulse {
            0%, 100% {
              opacity: 1;
              transform: translateX(-50%) scale(1);
            }
            50% {
              opacity: 0.85;
              transform: translateX(-50%) scale(1.05);
            }
          }
        </style>
      `,
      iconSize: [1, 1],
      iconAnchor: [0, 0]
    });
  };

  return (
    <>
      {/* PRIORITY ZONE LABEL - ONLY FOR ACTIVE JUNCTION */}
      {isActive && (
        <Marker
          position={junction.coords}
          icon={createActiveJunctionIcon()}
          zIndexOffset={1000}
        />
      )}

      {/* OUTER GLOW RING - ONLY FOR ACTIVE JUNCTION */}
      {isActive && (
        <CircleMarker
          center={junction.coords}
          radius={100}
          pathOptions={{
            color: color,
            fillColor: color,
            fillOpacity: 0.05,
            weight: 3,
            opacity: 0.3,
            className: 'junction-glow-outer',
          }}
        />
      )}

      {/* MIDDLE PULSE RING - ONLY FOR ACTIVE JUNCTION */}
      {isActive && (
        <CircleMarker
          center={junction.coords}
          radius={70}
          pathOptions={{
            color: color,
            fillColor: color,
            fillOpacity: 0.08,
            weight: 2,
            opacity: 0.5,
            className: isPulsing ? 'junction-pulse-ring' : '',
          }}
        />
      )}

      {/* ACTIVATION ZONE */}
      {isActive && (
        <CircleMarker
          center={junction.coords}
          radius={60}
          pathOptions={{
            color: color,
            fillColor: color,
            fillOpacity: isPulsing ? 0.12 : 0.08,
            weight: 2,
            opacity: isPulsing ? 0.6 : 0.4,
            className: isPulsing ? 'pulsing-circle' : '',
          }}
        />
      )}

      {/* JUNCTION CENTER MARKER WITH ENHANCED GLOW */}
      <CircleMarker
        center={junction.coords}
        radius={isActive ? 14 : 8}
        pathOptions={{
          color: color,
          fillColor: color,
          fillOpacity: isActive ? 0.9 : 0.7,
          weight: isActive ? 5 : 2,
          className: isActive ? 'junction-center-glow' : '',
        }}
      >
        <Popup>
          <div style={{ color: 'black' }}>
            <strong>{junction.id}</strong>
            <br />
            {junction.name}
            {isActive && eta != null && (
              <>
                <br />
                <strong style={{ color: color }}>
                  ETA: {Math.floor(eta / 60)}:{String(Math.floor(eta % 60)).padStart(2, '0')}
                </strong>
              </>
            )}
            {isActive && (
              <>
                <br />
                <span style={{ 
                  color: color, 
                  fontWeight: 'bold',
                  fontSize: '10px'
                }}>
                  ⚡ PRIORITY ACTIVE
                </span>
              </>
            )}
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
};

// =====================================================
// LANE VISUALIZATION - REMOVED (TOO CLUTTERED)
// =====================================================

// =====================================================
// MAIN MAP VIEW
// =====================================================

const MapView = ({ junctionData }) => {

  const ambulancePos = useMemo(() => {

  return [
    junctionData?.ambulance_lat ||
      AMBULANCE_POSITION.lat,

    junctionData?.ambulance_lon ||
      AMBULANCE_POSITION.lon
  ];

}, [junctionData]);

  const activeJunction = useMemo(() => {

    if (!junctionData?.junction_id) return null;

    return JUNCTIONS?.[junctionData.junction_id] || null;

  }, [junctionData]);

  // Generate smooth curved route using Bezier curve with intermediate points
  const routeCoords = useMemo(() => {
    if (!activeJunction?.coords) return [];

    const start = ambulancePos;
    const end = activeJunction.coords;

    // Generate curved route with multiple intermediate points for smooth roads
    const generateCurvedRoute = (startPoint, endPoint) => {
      const points = [];
      const steps = 25; // More steps = smoother curve
      
      // Calculate perpendicular offset for road curve realism
      const latDiff = endPoint[0] - startPoint[0];
      const lngDiff = endPoint[1] - startPoint[1];
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
      
      // Curve intensity based on distance (realistic road curvature)
      const curveIntensity = Math.min(distance * 0.15, 0.003);
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        
        // Quadratic Bezier curve formula for smooth roads
        // Control point offset perpendicular to direct line
        const controlOffset = Math.sin(Math.PI * t) * curveIntensity;
        
        // Linear interpolation with curve offset
        const lat = startPoint[0] + (endPoint[0] - startPoint[0]) * t;
        const lng = startPoint[1] + (endPoint[1] - startPoint[1]) * t;
        
        // Apply perpendicular curve offset (simulates road bend)
        const perpLat = -lngDiff / distance * controlOffset;
        const perpLng = latDiff / distance * controlOffset;
        
        points.push([
          lat + perpLat,
          lng + perpLng
        ]);
      }
      
      return points;
    };

    return generateCurvedRoute(start, end);

  }, [ambulancePos, activeJunction]);

  const isEmergencyActive = junctionData != null;

  return (

    <div
      style={{
        height: '100%',
        width: '100%',
        minHeight: '500px',
        borderRadius: '12px',
        overflow: 'hidden',
      }}
    >

      <MapContainer
        center={MAP_CONFIG.center}

        zoom={MAP_CONFIG.zoom}

        style={{
          height: '100%',
          width: '100%',
          minHeight: '500px',
        }}

        scrollWheelZoom={false}
      >

        <TileLayer
          attribution="&copy; OpenStreetMap contributors &copy; CartoDB"

          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* AUTO-FOCUS ON EMERGENCY CORRIDOR - ONLY DURING EMERGENCY */}
        {isEmergencyActive && (
          <MapBoundsController 
            ambulancePos={ambulancePos}
            activeJunction={activeJunction}
          />
        )}

        {/* ROUTE - ONLY DURING EMERGENCY */}

        {isEmergencyActive && routeCoords.length > 1 && (

          <AnimatedPolyline
            positions={routeCoords}
          />

        )}

        {/* AMBULANCE - SMOOTH ANIMATED WITH ROTATION */}

        {isEmergencyActive && (
          <SmoothAmbulanceMarker
            position={ambulancePos}
            targetPosition={ambulancePos}
          />
        )}

        {/* JUNCTIONS */}

        {Object.values(JUNCTIONS || {}).map((junction) => (

          <JunctionMarker
            key={junction.id}

            junction={junction}

            isActive={
              junction.id === junctionData?.junction_id
            }

            eta={
              junction.id === junctionData?.junction_id
                ? junctionData?.eta
                : null
            }

            urgency={junctionData?.urgency}
          />

        ))}

      </MapContainer>

    </div>
  );
};

export default MapView;
