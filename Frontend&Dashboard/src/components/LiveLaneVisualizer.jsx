import React from 'react';

const LiveLaneVisualizer = ({
  laneOccupancy,
  selectedLane,
  urgency,
  direction
}) => {
  if (!laneOccupancy) {
    return (
      <div className="lane-matrix">
        <div className="matrix-header">
          <span className="matrix-title">🚗 TRAFFIC LANE MATRIX</span>
          <span className="matrix-status offline">OFFLINE</span>
        </div>
        <div className="matrix-empty">No lane data available</div>
      </div>
    );
  }

  const lanes = Object.entries(laneOccupancy)
    .sort(([a], [b]) => a.localeCompare(b));
  const maxCount = 10;

  // Find optimal lane (least congested, not selected)
  const optimalLaneId = lanes
    .filter(([laneId]) => laneId !== selectedLane)
    .sort(([, countA], [, countB]) => countA - countB)[0]?.[0];

  return (
    <div className="lane-matrix">
      <div className="matrix-header">
        <span className="matrix-title">🚗 TRAFFIC LANE MATRIX</span>
        <span className="matrix-status online">
          <span className="status-dot active"></span>
          LIVE
        </span>
      </div>
      
      <div className="matrix-grid">
        {lanes.map(([laneId, count]) => {
          const isSelected = laneId === selectedLane;
          const isOptimal = laneId === optimalLaneId;
          const occupancyPercent = Math.min((count / maxCount) * 100, 100);
          
          let status = '';
          let statusLabel = '';
          let statusIcon = '';

          if (urgency === 'HIGH' && isSelected) {
            status = 'critical';
            statusLabel = 'CRITICAL';
            statusIcon = '🚨';
          } else if (isSelected) {
            status = 'priority';
            statusLabel = 'PRIORITY';
            statusIcon = '⚡';
          } else if (count >= 7) {
            status = 'congested';
            statusLabel = 'CONGESTED';
            statusIcon = '🔴';
          } else if (count >= 4) {
            status = 'moderate';
            statusLabel = 'MODERATE';
            statusIcon = '🟡';
          } else {
            status = 'clear';
            statusLabel = 'CLEAR';
            statusIcon = '🟢';
          }

          return (
            <div key={laneId} className={`matrix-lane ${status}`}>
              
              {/* Header with Lane ID and Optimal Badge */}
              <div className="matrix-lane-header">
                <div className="matrix-lane-id-container">
                  <div className="matrix-lane-id">{laneId}</div>
                  {isOptimal && !isSelected && (
                    <div className="optimal-lane-badge">
                      ⭐ OPTIMAL
                    </div>
                  )}
                </div>
              </div>

              {/* Vehicle Count - Large and Prominent */}
              <div className="matrix-lane-count-section">
                <div className="matrix-lane-count-large">{count}</div>
                <div className="matrix-lane-count-label">
                  {count === 1 ? 'vehicle' : 'vehicles'}
                </div>
              </div>

              {/* Occupancy Bar with Percentage */}
              <div className="matrix-bar-container">
                <div className="matrix-bar-label">
                  <span>Occupancy</span>
                  <span className="matrix-bar-percent">{Math.round(occupancyPercent)}%</span>
                </div>
                <div className="matrix-bar-bg">
                  {[...Array(10)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`matrix-bar-segment ${
                        i < Math.ceil(occupancyPercent / 10) ? 'filled' : ''
                      }`}
                    ></div>
                  ))}
                </div>
              </div>

              {/* Footer with Status Badge */}
              <div className="matrix-lane-footer">
                <div className={`matrix-status-badge ${status}`}>
                  <span className="status-badge-icon">{statusIcon}</span>
                  <span className="status-badge-label">{statusLabel}</span>
                </div>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LiveLaneVisualizer;
