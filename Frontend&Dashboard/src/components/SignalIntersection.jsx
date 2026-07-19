import React from 'react';

const SignalIntersection = ({ selectedLane, signalAction, urgency }) => {
  
  // Lane direction mapping
  const laneDirections = {
    'L1': 'LEFT',
    'L2': 'DOWN',
    'L3': 'RIGHT',
    'L4': 'UP'
  };

  const selectedDirection = laneDirections[selectedLane] || 'DOWN';
  const isForceGreen = signalAction?.includes('FORCE');
  const isHighUrgency = urgency === 'HIGH';

  const getSignalState = (direction) => {
    if (direction === selectedDirection) {
      return 'GREEN';
    }
    return 'RED';
  };

  const SignalLight = ({ direction, label }) => {
    const state = getSignalState(direction);
    const isGreen = state === 'GREEN';
    const isSelected = direction === selectedDirection;

    return (
      <div className={`signal-direction ${direction.toLowerCase()} ${isSelected ? 'selected' : ''}`}>
        <div className={`signal-arrow ${state.toLowerCase()} ${isForceGreen && isSelected ? 'blinking' : ''}`}>
          {direction === 'UP' && '↑'}
          {direction === 'DOWN' && '↓'}
          {direction === 'LEFT' && '←'}
          {direction === 'RIGHT' && '→'}
        </div>
        <div className={`signal-label ${state.toLowerCase()}`}>
          {label}
        </div>
      </div>
    );
  };

  return (
    <div className={`signal-intersection ${isHighUrgency ? 'critical' : ''}`}>
      <div className="intersection-header">
        <span className="intersection-title">SIGNAL INTERSECTION</span>
        <span className="intersection-status">
          {isForceGreen ? 'FORCE GREEN' : 'PRIORITY'}
        </span>
      </div>

      <div className="intersection-grid">
        
        {/* TOP - UP */}
        <div className="grid-top">
          <SignalLight direction="UP" label="L4" />
        </div>

        {/* MIDDLE ROW */}
        <div className="grid-middle">
          <SignalLight direction="LEFT" label="L1" />
          
          <div className="intersection-center">
            <div className="center-icon">╳</div>
          </div>
          
          <SignalLight direction="RIGHT" label="L3" />
        </div>

        {/* BOTTOM - DOWN */}
        <div className="grid-bottom">
          <SignalLight direction="DOWN" label="L2" />
        </div>

      </div>

      <div className="intersection-footer">
        <span className="footer-label">Active Lane:</span>
        <span className="footer-value">{selectedLane || 'N/A'}</span>
      </div>
    </div>
  );
};

export default SignalIntersection;
