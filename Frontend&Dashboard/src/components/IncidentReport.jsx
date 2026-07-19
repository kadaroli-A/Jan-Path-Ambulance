import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '../constants/config';

const IncidentReport = ({ isEmergencyActive }) => {
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    // Clear report data when emergency ends (standby mode)
    if (!isEmergencyActive) {
      setReportData(null);
      setError(false);
      return; // Stop polling during standby
    }

    const fetchIncidentReport = async () => {
      try {
        const response = await fetch(
  `${API_BASE_URL}/incident-report/AMB001`
);
        if (!response.ok) {
          throw new Error('API unavailable');
        }
        const data = await response.json();
        setReportData(data);
        setError(false);
      } catch (err) {
        setError(true);
        setReportData(null);
      }
    };

    // Initial fetch (only during emergency)
    fetchIncidentReport();

    // Poll every 30 seconds (only during emergency)
    const interval = setInterval(fetchIncidentReport, 30000);

    return () => clearInterval(interval);
  }, [isEmergencyActive]);

  // Error state
  if (error) {
    return (
      <div className="incident-report-container">
        <div className="incident-report-panel">
          <div className="incident-report-header">
            <span className="incident-report-title">INCIDENT REPORT</span>
          </div>
          <div className="incident-report-error">
            Incident report unavailable
          </div>
        </div>
      </div>
    );
  }

  // Standby state - show "No active emergency" instead of "Loading..."
  if (!isEmergencyActive) {
    return (
      <div className="incident-report-container">
        <div className="incident-report-panel">
          <div className="incident-report-header">
            <span className="incident-report-title">INCIDENT REPORT</span>
          </div>
          <div className="incident-report-loading">
            No active emergency
          </div>
        </div>
      </div>
    );
  }

  // Loading state (only during active emergency)
  if (!reportData) {
    return (
      <div className="incident-report-container">
        <div className="incident-report-panel">
          <div className="incident-report-header">
            <span className="incident-report-title">INCIDENT REPORT</span>
          </div>
          <div className="incident-report-loading">
            Loading incident report...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="incident-report-container">
      <div className="incident-report-panel">
        <div className="incident-report-header">
          <span className="incident-report-title">INCIDENT REPORT</span>
        </div>

        <div className="incident-report-content">
          {/* Ambulance ID */}
          <div className="incident-report-row">
            <span className="incident-report-label">Ambulance ID:</span>
            <span className="incident-report-value">{reportData.ambulance_id || 'N/A'}</span>
          </div>

          {/* Junctions Activated */}
          <div className="incident-report-row">
            <span className="incident-report-label">Junctions Activated:</span>
            <span className="incident-report-value">
              {reportData.junctions_activated || 0}
            </span>
          </div>

          {/* Estimated Time Saved */}
          <div className="incident-report-row">
            <span className="incident-report-label">Estimated Time Saved:</span>
            <span className="incident-report-value highlight">
              {reportData.estimated_time_saved_sec || 0} seconds
            </span>
          </div>

          {/* High Urgency Events */}
          <div className="incident-report-row">
            <span className="incident-report-label">High Urgency Events:</span>
            <span className="incident-report-value critical">
              {reportData.high_urgency_events || 0}
            </span>
          </div>

          {/* Total Run Duration */}
          <div className="incident-report-row">
            <span className="incident-report-label">Total Run Duration:</span>
            <span className="incident-report-value">
              {reportData.total_run_duration_sec || 0} seconds
            </span>
          </div>

          {/* Lane History */}
          {reportData.lane_selections && reportData.lane_selections.length > 0 && (
            <div className="incident-report-section">
              <div className="incident-report-section-title">Lane History:</div>
              <div className="incident-report-list">
                {reportData.lane_selections.map((lane, index) => (
                  <div key={index} className="incident-report-list-item">
                    • {lane}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {reportData.summary && (
            <div className="incident-report-section">
              <div className="incident-report-section-title">Summary:</div>
              <div className="incident-report-summary">
                {reportData.summary}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncidentReport;
