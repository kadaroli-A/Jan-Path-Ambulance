import React, { useState, useEffect } from 'react';

const StatusBar = ({ connectionStatus, junctionData }) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatETA = (seconds) => {
    if (seconds == null || isNaN(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'status-online';
      case 'error': return 'status-offline';
      default: return 'status-standby';
    }
  };

  const isEmergencyActive = junctionData?.junction_id;

  return (
    <div className="status-bar">
      <div className="status-section">
        <div className="status-item">
          <span className={`status-indicator ${getStatusColor()}`}></span>
          <span className="status-label">SYSTEM</span>
          <span className="status-value">
            {connectionStatus === 'connected' ? 'ONLINE' : 
             connectionStatus === 'error' ? 'OFFLINE' : 'STANDBY'}
          </span>
        </div>

        {isEmergencyActive && (
          <>
            <div className="status-divider"></div>
            <div className="status-item emergency">
              <span className="status-label">EMERGENCY</span>
              <span className="status-value">ACTIVE</span>
            </div>

            <div className="status-divider"></div>
            <div className="status-item">
              <span className="status-label">JUNCTION</span>
              <span className="status-value">{junctionData.junction_id}</span>
            </div>

            <div className="status-divider"></div>
            <div className="status-item">
              <span className="status-label">ETA</span>
              <span className="status-value eta">{formatETA(junctionData.eta)}</span>
            </div>

            <div className="status-divider"></div>
            <div className="status-item">
              <span className="status-label">SIGNAL</span>
              <span className="status-value signal">
                {junctionData.signal_action?.split('_')[0] || 'N/A'}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="status-section">
        <div className="status-brand">JAN-PATH</div>
        <div className="status-divider"></div>
        <div className="status-time">{currentTime.toLocaleTimeString('en-US', { hour12: false })}</div>
      </div>
    </div>
  );
};

export default StatusBar;
