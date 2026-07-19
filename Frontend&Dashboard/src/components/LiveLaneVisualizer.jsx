import React from 'react';

const LiveLaneVisualizer = ({
  laneOccupancy,
  selectedLane,
  urgency,
  direction
}) =>
 {
  if (!laneOccupancy) {
    return (
      <div className="lane-matrix">
        <div className="matrix-header">
          <span className="matrix-title">TRAFFIC LANE MATRIX</span>
          <span className="matrix-status offline">OFFLINE</span>
        </div>
        <div className="matrix-empty">No lane data available</div>
      </div>
    );
  }

 const lanes = Object.entries(laneOccupancy)
  .sort(([a], [b]) => a.localeCompare(b));
 const maxCount = 10;

  return (
    <div className="lane-matrix">
      <div className="matrix-header">
        <span className="matrix-title">TRAFFIC LANE MATRIX</span>
        <span className="matrix-status online">
          <span className="status-dot active"></span>
          LIVE
        </span>
      </div>
      
      <div className="matrix-grid">
        {lanes.map(([laneId, count]) => {
         

          const isSelected = laneId === selectedLane;
          const occupancyPercent =
            Math.min((count / maxCount) * 100, 100);
          
          let status = '';
          let statusLabel = '';

          if (urgency === 'HIGH' && isSelected) {
            status = 'critical';
            statusLabel = 'CRITICAL';
          } else if (isSelected) {
            status = 'priority';
            statusLabel = 'PRIORITY';
          } else if (count >= 7) {
            status = 'congested';
            statusLabel = 'CONGESTED';
          } else if (count >= 4) {
            status = 'moderate';
            statusLabel = 'MODERATE';
          } else {
            status = 'clear';
            statusLabel = 'AVAILABLE';
          }

          return (
            <div key={laneId} className={`matrix-lane ${status}`}>
              
              <div className="matrix-lane-header">
              <div className="matrix-lane-id">{laneId}</div>
              <div className="matrix-lane-count">
                 {count} {count === 1 ? 'vehicle' : 'vehicles'}
              </div>
              </div>

              <div className="matrix-bar-container">
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

              <div className="matrix-lane-footer">
                <div className={`matrix-status-badge ${status}`}>
                  {statusLabel}
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
