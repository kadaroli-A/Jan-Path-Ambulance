import React from 'react';
import { CONGESTION_THRESHOLD } from '../constants/config';

const LaneCard = ({ laneOccupancy, selectedLane, urgency }) => {
  if (!laneOccupancy) {
    return (
      <div className="ops-card rounded-lg p-3 flex-shrink-0">
        <div className="text-[10px] text-text-muted font-bold tracking-widest uppercase mb-2">Lane Priority</div>
        <div className="text-text-secondary text-xs">No data available</div>
      </div>
    );
  }

  const isHighUrgency = urgency === 'HIGH';

  return (
    <div className="ops-card rounded-lg p-3 flex-shrink-0">
      <div className="text-[10px] text-text-muted font-bold tracking-widest uppercase mb-2">Lane Priority</div>
      <div className="space-y-1.5">
        {Object.entries(laneOccupancy).map(([laneId, count]) => {
          const isSelected = laneId === selectedLane;
          const isCongested = count >= CONGESTION_THRESHOLD;
          
          const percentage = Math.min((count / 15) * 100, 100);
          
          let barColor = 'bg-text-muted';
          if (isHighUrgency) {
            barColor = 'bg-alert-red';
          } else if (isSelected) {
            barColor = 'bg-alert-green';
          } else if (isCongested) {
            barColor = 'bg-alert-amber';
          }

          return (
            <div key={laneId} className={`p-2 rounded transition-all ${
              isSelected ? 'bg-alert-green/10 border border-alert-green/50' : 'bg-ops-panel border border-ops-border'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center space-x-1.5">
                  <span className={`font-black text-sm ${isSelected ? 'text-alert-green' : 'text-text-primary'}`}>
                    {laneId}
                  </span>
                  {isSelected && (
                    <span className="text-[8px] bg-alert-green/20 text-alert-green px-1.5 py-0.5 rounded font-bold tracking-wide">
                      PRIORITY
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-text-muted font-semibold">{count} VEH</span>
              </div>
              <div className="w-full bg-ops-bg rounded-full h-1 overflow-hidden">
                <div
                  className={`h-full ${barColor} transition-all duration-500`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LaneCard;
