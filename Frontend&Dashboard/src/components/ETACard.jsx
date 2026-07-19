import React from 'react';
import { ETA_RED_THRESHOLD, ETA_YELLOW_THRESHOLD } from '../constants/config';

const ETACard = ({ eta, urgency }) => {
  const formatETA = (seconds) => {
    if (seconds == null || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getETAConfig = (seconds) => {
    if (seconds == null || isNaN(seconds)) {
      return {
        color: 'text-text-muted',
        border: 'border-ops-border',
        shadow: '',
        label: 'STANDBY',
      };
    }
    if (seconds < ETA_RED_THRESHOLD) {
      return {
        color: 'text-alert-red',
        border: 'border-alert-red',
        shadow: 'shadow-alert-red',
        label: 'CRITICAL',
      };
    }
    if (seconds < ETA_YELLOW_THRESHOLD) {
      return {
        color: 'text-alert-amber',
        border: 'border-alert-amber',
        shadow: 'shadow-alert-amber',
        label: 'APPROACHING',
      };
    }
    return {
      color: 'text-alert-green',
      border: 'border-alert-green',
      shadow: 'shadow-alert-green',
      label: 'EN ROUTE',
    };
  };

  const config = getETAConfig(eta);
  const isCritical = eta != null && eta < ETA_RED_THRESHOLD;

  return (
    <div className={`ops-card border-2 ${config.border} ${config.shadow} rounded-lg p-5 flex-shrink-0 ${isCritical ? 'critical-pulse' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Estimated Arrival</div>
        <div className={`text-[10px] font-bold tracking-wider px-2 py-0.5 rounded ${
          isCritical ? 'bg-alert-red/20 text-alert-red' : 
          eta < ETA_YELLOW_THRESHOLD ? 'bg-alert-amber/20 text-alert-amber' :
          'bg-alert-green/20 text-alert-green'
        }`}>
          {config.label}
        </div>
      </div>
      <div className={`text-7xl font-black ${config.color} tracking-tighter font-mono leading-none mb-2`}>
        {formatETA(eta)}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-text-muted font-semibold tracking-wide">MIN : SEC</div>
        {isCritical && (
          <div className="flex items-center space-x-1">
            <span className="status-dot critical"></span>
            <span className="text-[10px] text-alert-red font-bold tracking-wide">URGENT</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ETACard;
