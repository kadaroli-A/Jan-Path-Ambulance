import React from 'react';

import MapView from './MapView';
import LiveLaneVisualizer from './LiveLaneVisualizer';
import AIDecisionFeed from './AIDecisionFeed';
import SignalIntersection from './SignalIntersection';
import IncidentReport from './IncidentReport';
import AdvisoryPanel from './AdvisoryPanel';

// Helper function to format ETA
const formatETA = (seconds) => {
  if (!seconds || seconds <= 0) return 'calculating';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
};

const Dashboard = ({
  junctionData,
  loading,
  connectionStatus
}) => {

  // =====================================================
  // SAFE FLAGS
  // =====================================================

  const isStandby =
    connectionStatus === 'standby';

  const isError =
    connectionStatus === 'error';

  const isEmergencyActive = junctionData != null;

  // =====================================================
  // LOADING SCREEN - ONLY ON INITIAL LOAD
  // =====================================================

  if (loading && !junctionData && connectionStatus !== 'standby' && connectionStatus !== 'error') {

    return (
      <div className="loading-screen">

        <div className="loading-spinner"></div>

        <div className="loading-text">
          INITIALIZING TRAFFIC INTELLIGENCE SYSTEM...
        </div>

      </div>
    );

  }

  // =====================================================
  // SAFE DATA
  // =====================================================

  const eta =
    junctionData?.eta ?? 0;


  const etaClass =
    eta < 30
      ? 'critical'
      : eta < 60
      ? 'warning'
      : 'normal';

  // =====================================================
  // MAIN DASHBOARD
  // =====================================================

  return (

    <div className="dashboard-container">

      {/* ================================================= */}
      {/* MAIN CONTENT - FULLSCREEN LAYOUT */}
      {/* ================================================= */}

      <div className="dashboard-main">

        {/* ============================================= */}
        {/* MAP SECTION WITH LEFT TACTICAL SIDEBAR */}
        {/* ============================================= */}

        <div className="map-section">

          <MapView
            junctionData={junctionData}
          />

          {/* LEFT TACTICAL SIDEBAR - INTEGRATED */}

          <div className="tactical-sidebar-left">

            {/* STANDBY/ERROR STATUS - SHOW WHEN NO EMERGENCY */}
            {!isEmergencyActive && (
              <div className="sidebar-section eta-section">
                <div className="sidebar-label">SYSTEM STATUS</div>
                <div className="sidebar-status" style={{ fontSize: '18px', marginTop: '10px' }}>
                  {isStandby && '⏸ STANDBY MODE'}
                  {isError && '⚠ CONNECTION ERROR'}
                  {!isStandby && !isError && '🟢 MONITORING'}
                </div>
                <div className="standby-subtext" style={{ marginTop: '8px', fontSize: '10px', color: '#666' }}>
                  {isStandby && 'No active emergency'}
                  {isError && 'Retrying connection...'}
                  {!isStandby && !isError && 'Ready for emergency'}
                </div>
              </div>
            )}

            {/* EMERGENCY ETA - ONLY SHOW DURING EMERGENCY */}
            {isEmergencyActive && (
              <div className="sidebar-section eta-section">
                <div className="sidebar-label">EMERGENCY ETA</div>
                <div className={`sidebar-eta ${etaClass}`}>
                  {formatETA(junctionData?.eta)}
                </div>
                <div className="sidebar-status">
                  {junctionData?.urgency === 'HIGH' ? '🔴 CRITICAL' : '🟢 ACTIVE'}
                </div>
              </div>
            )}

            {/* PRIORITY LANE */}
            {junctionData?.selected_lane && (
              <div className="sidebar-section lane-section">
                <div className="sidebar-label">PRIORITY LANE</div>
                <div className="sidebar-lane-id">
                  {junctionData.selected_lane}
                </div>
                <div className="sidebar-vehicle-count">
                  {junctionData?.lane_occupancy?.[junctionData.selected_lane] || 0} vehicles
                </div>
              </div>
            )}

            {/* SELECTED SIGNAL */}
            {junctionData?.signal_action && (
              <div className="sidebar-section signal-section">
                <div className="sidebar-label">SIGNAL ACTION</div>
                <div className="sidebar-signal">
                  {junctionData.signal_action.replace(/_/g, ' ')}
                </div>
              </div>
            )}

            {/* ACTIVE JUNCTION */}
            {junctionData?.junction_id && (
              <div className="sidebar-section junction-section">
                <div className="sidebar-label">ACTIVE JUNCTION</div>
                <div className="sidebar-junction-id">
                  {junctionData.junction_id}
                </div>
                <div className="sidebar-location">
                  {junctionData?.location || 'Unknown'}
                </div>
              </div>
            )}

            {/* SYSTEM METRICS */}
            <div className="sidebar-section metrics-section">
              <div className="sidebar-label">SYSTEM METRICS</div>
              <div className="sidebar-metric">
                <span className="metric-label">Urgency:</span>
                <span className={`metric-value ${junctionData?.urgency?.toLowerCase() || 'normal'}`}>
                  {junctionData?.urgency || 'NORMAL'}
                </span>
              </div>
            </div>

          </div>

          {/* TOP RIGHT - JUNCTION INFO ONLY */}

          {junctionData?.junction_id && (

            <div className="tactical-hud-tr">

              <div className="hud-junction-id">
                {junctionData.junction_id}
              </div>

              <div
                className={`hud-urgency-badge ${
                  junctionData?.urgency?.toLowerCase() || 'normal'
                }`}
              >           
                {junctionData?.urgency || 'NORMAL'}
              </div>

            </div>

          )}

        </div>

        {/* ============================================= */}
        {/* AI CONTROL PANEL - 30% */}
        {/* ============================================= */}

        <div className="control-panel">

          {/* AI DECISION REASONING - NEW */}

          {junctionData?.selected_lane && (
            <div className="decision-reasoning">
              <div className="reasoning-header">
                <span className="reasoning-title">AI DECISION REASONING</span>
              </div>
              
              <div className="reasoning-content">
                <div className="reasoning-row">
                  <span className="reasoning-label">Selected Lane:</span>
                  <span className="reasoning-value priority">{junctionData.selected_lane}</span>
                </div>

                <div className="reasoning-reasons">
                 <div className="reason-item">
                   <span className="reason-icon">✓</span>
                   <span className="reason-text">
                    Lane {junctionData.selected_lane} selected for emergency route alignment
                   </span>
                 </div>
                 <div className="reason-item">
                   <span className="reason-icon">✓</span>
                   <span className="reason-text">
                     Emergency direction: {junctionData.direction?.toUpperCase()}
                   </span>
                 </div>
<div className="reason-item">
  <span className="reason-icon">✓</span>
  <span className="reason-text">
    Valid lane: {
      junctionData?.valid_lanes?.[0]?.lane_id ||
      junctionData?.valid_lanes?.[0]?.lane ||
      "L2"
    }
  </span>
</div>

<div className="reason-item">
  <span className="reason-icon">✓</span>
  <span className="reason-text">
    Other lanes excluded because they do not support {
  junctionData?.direction || 'STRAIGHT'
} movement
  </span>
</div>
                  <div className="reason-item">
                    <span className="reason-icon">✓</span>
                    <span className="reason-text">
                      ETA to junction: {formatETA(junctionData.eta)}
                    </span>
                  </div>
                  {junctionData?.signal_action && (
                    <div className="reason-item">
                      <span className="reason-icon">✓</span>
                      <span className="reason-text">
                       {junctionData.signal_action?.replace(/_/g, ' ')} active for {junctionData.selected_lane}
                      </span>
                    </div>
                  )}
                </div>

                <div className="reasoning-row">
                  <span className="reasoning-label">Signal Action:</span>
                  <span className="reasoning-value signal">
                    {junctionData?.signal_action?.replace(/_/g, ' ') || 'STANDBY'}
                  </span>
                </div>

                <div className="reasoning-row">
                  <span className="reasoning-label">Junction Response:</span>
                  <span className="reasoning-value impact">
                    {junctionData?.urgency === 'HIGH' ? 'CRITICAL PRIORITY' : 'ACTIVE'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* AI TRAFFIC LANE MATRIX */}

         <LiveLaneVisualizer
  laneOccupancy={
    junctionData?.lane_occupancy || {}
  }

  selectedLane={
    junctionData?.selected_lane || ''
  }

  urgency={
    junctionData?.urgency || 'NORMAL'
  }

  direction={
    junctionData?.direction || 'STRAIGHT'
  }
/>

          {/* AI DECISION FEED */}

          <AIDecisionFeed
            junctionData={junctionData}
          />

          {/* SIGNAL INTERSECTION VISUAL */}

          {junctionData?.selected_lane && (
            <SignalIntersection
              selectedLane={junctionData.selected_lane}
              signalAction={junctionData.signal_action}
              urgency={junctionData.urgency}
            />
          )}

          {/* ADVISORY PANEL - 3 LANGUAGES WITH VOICE */}

          <AdvisoryPanel 
            advisory={junctionData?.advisory} 
            urgency={junctionData?.urgency}
          />

          {/* INCIDENT REPORT - STEP 4 */}

          <IncidentReport isEmergencyActive={isEmergencyActive} />

        </div>

      </div>

    </div>

  );

};

export default Dashboard;