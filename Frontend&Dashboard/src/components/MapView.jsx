import React, { useMemo, useEffect, useRef } from 'react';

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
// AMBULANCE ICON - LARGE GLOWING EMERGENCY MARKER
// =====================================================

const ambulanceIcon = L.divIcon({
  className: 'ambulance-marker',

  html: `
    <div style="
      position: relative;
      width: 64px;
      height: 64px;
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
// JUNCTION MARKER WITH SMALLER ACTIVATION ZONE
// =====================================================

const JunctionMarker = ({
  junction,
  isActive,
  eta,
  urgency
}) => {

  if (!junction || !junction.coords) return null;

  const getColor = () => {

    if (!isActive) return '#38bdf8';

    if (urgency === 'HIGH') return '#ff3b30';

    return '#22c55e';

  };

  const color = getColor();
  const isPulsing = isActive && urgency === 'HIGH';

  return (
    <>
      {/* SMALLER ACTIVATION ZONE - 60m radius */}
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

      {/* JUNCTION CENTER MARKER */}
      <CircleMarker
        center={junction.coords}

        radius={isActive ? 12 : 8}

        pathOptions={{
          color: color,
          fillColor: color,
          fillOpacity: 0.7,
          weight: isActive ? 4 : 2,
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
                ETA:
                {' '}
                {Math.floor(eta / 60)}:
                {String(Math.floor(eta % 60)).padStart(2, '0')}
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

  const routeCoords = useMemo(() => {

    if (!activeJunction?.coords) return [];

    return [
      ambulancePos,
      activeJunction.coords
    ];

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

        {/* AMBULANCE - ONLY DURING EMERGENCY */}

        {isEmergencyActive && (
          <Marker
            position={ambulancePos}
            icon={ambulanceIcon}
          >
            <Popup>

              <div style={{ color: 'black' }}>

                <strong>AMB001</strong>

                <br />

                Emergency Vehicle

              </div>

            </Popup>
          </Marker>
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