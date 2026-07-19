import React, { useState, useEffect, useRef } from 'react';

const AIDecisionFeed = ({ junctionData }) => {
  const [decisions, setDecisions] = useState([]);
  const prevDataRef = useRef({});

  useEffect(() => {
    // Clear decisions when junctionData becomes null (standby mode)
    if (!junctionData) {
      setDecisions([]);
      prevDataRef.current = {};
      return;
    }

    const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
    const newDecisions = [];
    const prev = prevDataRef.current;

    // Detect changes and add decisions
    if (junctionData.junction_id !== prev.junction_id) {
      newDecisions.push({
        id: Date.now() + 1,
        time: timestamp,
        type: 'junction',
        message: `Junction ${junctionData.junction_id} activated`,
      });
    }

    if (junctionData.selected_lane !== prev.selected_lane && junctionData.selected_lane) {
      newDecisions.push({
        id: Date.now() + 2,
        time: timestamp,
        type: 'lane',
        message: `Lane ${junctionData.selected_lane} selected`,
      });
    }

    if (junctionData.signal_action !== prev.signal_action && junctionData.signal_action) {
      newDecisions.push({
        id: Date.now() + 3,
        time: timestamp,
        type: 'signal',
        message: `${junctionData.signal_action.replace(/_/g, ' ')}`,
      });
    }

    if (junctionData.urgency === 'HIGH' && prev.urgency !== 'HIGH') {
      newDecisions.push({
        id: Date.now() + 4,
        time: timestamp,
        type: 'critical',
        message: 'CRITICAL EMERGENCY DETECTED',
      });
    }

    if (newDecisions.length > 0) {
      setDecisions(prev => [...newDecisions, ...prev].slice(0, 8));
    }

    prevDataRef.current = junctionData;
  }, [junctionData]);

  return (
    <div className="ai-decision-feed">
      <div className="feed-header">
        <span>AI DECISIONS</span>
        <span className="feed-status">
          <span className="status-dot active"></span>
          STREAMING
        </span>
      </div>
      <div className="feed-content">
        {decisions.length === 0 ? (
          <div className="feed-empty">Monitoring traffic...</div>
        ) : (
          decisions.map((decision) => (
            <div key={decision.id} className={`feed-item ${decision.type}`}>
              <span className="feed-time">{decision.time}</span>
              <span className="feed-message">{decision.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AIDecisionFeed;
