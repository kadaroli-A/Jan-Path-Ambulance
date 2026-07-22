import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../constants/config';

// Animated counter hook
const useAnimatedCounter = (targetValue, duration = 1000) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef(null);
  const startTimeRef = useRef(null);
  const startValueRef = useRef(0);

  useEffect(() => {
    // If target hasn't changed or is same as current, skip animation
    if (targetValue === displayValue) return;

    startValueRef.current = displayValue;
    startTimeRef.current = Date.now();
    const targetNum = Number(targetValue) || 0;

    const animate = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      const currentValue = startValueRef.current + 
        (targetNum - startValueRef.current) * easeProgress;
      
      setDisplayValue(Math.round(currentValue));

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetValue, duration]);

  return displayValue;
};

const IncidentReport = ({ isEmergencyActive }) => {
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    // Clear report data when emergency ends (standby mode)
    if (!isEmergencyActive) {
      setReportData(null);
      setError(false);
      setLastUpdated(null);
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
        setLastUpdated(new Date());
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

  // Animated counters for numeric values - MUST be called before any returns
  const animatedJunctions = useAnimatedCounter(reportData?.junctions_activated || 0, 1200);
  const animatedTimeSaved = useAnimatedCounter(reportData?.estimated_time_saved_sec || 0, 1500);
  const animatedUrgencyEvents = useAnimatedCounter(reportData?.high_urgency_events || 0, 1000);
  const animatedRunDuration = useAnimatedCounter(reportData?.total_run_duration_sec || 0, 1500);

  // Format timestamp
  const formatTimestamp = (date) => {
    if (!date) return '';
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Error state
  if (error) {
    return (
      <div className="incident-report-container">
        <div className="incident-report-panel">
          <div className="incident-report-header">
            <span className="incident-report-title">📋 INCIDENT REPORT</span>
          </div>
          <div className="incident-report-error">
            ⚠ Incident report unavailable
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
            <span className="incident-report-title">📋 INCIDENT REPORT</span>
          </div>
          <div className="incident-report-loading">
            ⏸ No active emergency
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
            <span className="incident-report-title">📋 INCIDENT REPORT</span>
          </div>
          <div className="incident-report-loading">
            <div className="loading-spinner-small"></div>
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
          <span className="incident-report-title">📋 INCIDENT REPORT</span>
          {lastUpdated && (
            <span className="incident-report-timestamp">
              Updated: {formatTimestamp(lastUpdated)}
            </span>
          )}
        </div>

        <div className="incident-report-content">
          {/* Ambulance ID - Non-animated */}
          <div className="incident-report-row">
            <span className="incident-report-label">Ambulance ID:</span>
            <span className="incident-report-value ambulance-id">
              {reportData.ambulance_id || 'N/A'}
            </span>
          </div>

          {/* Junctions Activated - Animated Counter */}
          <div className="incident-report-row metric-row">
            <div className="metric-content">
              <span className="incident-report-label">Junctions Activated</span>
              <div className="metric-value-container">
                <span className="incident-report-value animated-counter">
                  {animatedJunctions}
                </span>
                <span className="metric-unit">junctions</span>
              </div>
            </div>
          </div>

          {/* Estimated Time Saved - Animated Counter */}
          <div className="incident-report-row metric-row highlight-row">
            <div className="metric-content">
              <span className="incident-report-label">⚡ Time Saved</span>
              <div className="metric-value-container">
                <span className="incident-report-value highlight animated-counter">
                  {animatedTimeSaved}
                </span>
                <span className="metric-unit">seconds</span>
              </div>
              <div className="metric-subtitle">
                ≈ {formatDuration(animatedTimeSaved)} minutes
              </div>
            </div>
          </div>

          {/* High Urgency Events - Animated Counter */}
          <div className="incident-report-row metric-row critical-row">
            <div className="metric-content">
              <span className="incident-report-label">🚨 High Urgency Events</span>
              <div className="metric-value-container">
                <span className="incident-report-value critical animated-counter">
                  {animatedUrgencyEvents}
                </span>
                <span className="metric-unit">events</span>
              </div>
            </div>
          </div>

          {/* Total Run Duration - Animated Counter */}
          <div className="incident-report-row metric-row">
            <div className="metric-content">
              <span className="incident-report-label">⏱ Total Run Duration</span>
              <div className="metric-value-container">
                <span className="incident-report-value animated-counter">
                  {formatDuration(animatedRunDuration)}
                </span>
                <span className="metric-unit">min:sec</span>
              </div>
              <div className="metric-subtitle">
                {animatedRunDuration} seconds elapsed
              </div>
            </div>
          </div>

          {/* Lane History */}
          {reportData.lane_selections && reportData.lane_selections.length > 0 && (
            <div className="incident-report-section">
              <div className="incident-report-section-title">
                🛣 Lane Selection History
              </div>
              <div className="incident-report-list">
                {reportData.lane_selections.map((lane, index) => (
                  <div key={index} className="incident-report-list-item">
                    <span className="lane-badge">{lane}</span>
                    <span className="lane-index">Selection #{index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          {reportData.summary && (
            <div className="incident-report-section">
              <div className="incident-report-section-title">
                📝 Incident Summary
              </div>
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
