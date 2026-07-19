import React, { useState, useEffect } from 'react';

const ActivityFeed = ({ junctionData, connectionStatus }) => {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    // Clear events when junctionData becomes null (standby mode)
    if (!junctionData) {
      setEvents([]);
      return;
    }

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    
    // Add new event when junction data changes
    const newEvent = {
      id: Date.now(),
      time: timestamp,
      type: junctionData.urgency === 'HIGH' ? 'critical' : 'normal',
      message: `${junctionData.junction_id} • ${junctionData.signal_action} • Lane ${junctionData.selected_lane}`,
    };

    setEvents(prev => [newEvent, ...prev].slice(0, 5)); // Keep last 5 events
  }, [junctionData?.junction_id, junctionData?.signal_action, junctionData?.selected_lane]);

  return (
    <div className="ops-card rounded-lg p-3 h-full">
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Live Activity</div>
        <div className="flex items-center space-x-1">
          <span className="status-dot active"></span>
          <span className="text-[9px] text-alert-green font-semibold">STREAMING</span>
        </div>
      </div>
      
      <div className="space-y-1.5">
        {events.length === 0 ? (
          <div className="text-xs text-text-muted py-2">No recent activity</div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex items-start space-x-2 text-xs bg-ops-panel rounded px-2 py-1.5 border border-ops-border">
              <span className="text-[10px] text-text-muted font-mono flex-shrink-0">{event.time}</span>
              <span className={`text-[10px] font-semibold flex-1 ${
                event.type === 'critical' ? 'text-alert-red' : 'text-text-secondary'
              }`}>
                {event.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
