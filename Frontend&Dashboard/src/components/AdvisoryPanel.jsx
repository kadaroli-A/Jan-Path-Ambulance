import React, { useState, useEffect, useRef } from 'react';
import { speakSequential, cancelSpeech, getIsSpeaking, resetSpeechHistory, isAutoplayBlocked, enableAudioAfterInteraction } from '../utils/speak';

const AdvisoryPanel = ({ advisory, urgency }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showAutoplayWarning, setShowAutoplayWarning] = useState(false);
  const prevAdvisoryRef = useRef(null);
  const prevUrgencyRef = useRef(null);
  const isHighUrgency = urgency === 'HIGH';

  // Auto-speak on HIGH urgency when advisory changes
  useEffect(() => {
    if (!advisory || isMuted) {
      return;
    }

    // Trigger speech when:
    // 1. Urgency changes to HIGH, OR
    // 2. Advisory text changes while urgency is HIGH
    const urgencyChangedToHigh = urgency === 'HIGH' && prevUrgencyRef.current !== 'HIGH';
    
    const advisoryChanged = 
      prevAdvisoryRef.current === null ||
      prevAdvisoryRef.current.tamil !== advisory.tamil ||
      prevAdvisoryRef.current.english !== advisory.english ||
      prevAdvisoryRef.current.hindi !== advisory.hindi;

    if (urgencyChangedToHigh || (urgency === 'HIGH' && advisoryChanged)) {
      speakSequential(advisory, false);
      prevAdvisoryRef.current = advisory;
    }

    prevUrgencyRef.current = urgency;
  }, [advisory, urgency, isMuted]);

  // Monitor speaking state and autoplay block
  useEffect(() => {
    const interval = setInterval(() => {
      setIsSpeaking(getIsSpeaking());
      setShowAutoplayWarning(isAutoplayBlocked());
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Reset speech history when advisory becomes null
  useEffect(() => {
    if (!advisory) {
      resetSpeechHistory();
      prevAdvisoryRef.current = null;
      prevUrgencyRef.current = null;
    }
  }, [advisory]);

  const handleToggleMute = () => {
    if (!isMuted) {
      // Muting: cancel any ongoing speech
      cancelSpeech();
    }
    setIsMuted(!isMuted);
  };

  const handleEnableAudio = () => {
    enableAudioAfterInteraction();
    setShowAutoplayWarning(false);
  };

  if (!advisory) {
    return (
      <div className="ops-card rounded-lg p-3 h-full">
        <div className="text-[10px] text-text-muted font-bold tracking-widest uppercase mb-2">Public Advisory</div>
        <div className="text-text-secondary text-xs">No advisory available</div>
      </div>
    );
  }

  const advisoryEntries = [
    { lang: 'தமிழ்', text: advisory.tamil },
    { lang: 'ENG', text: advisory.english },
    { lang: 'हிंदी', text: advisory.hindi },
  ];

  return (
    <div className={`ops-card rounded-lg p-3 h-full ${
      isHighUrgency ? 'border-2 border-alert-red shadow-alert-red' : ''
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] text-text-muted font-bold tracking-widest uppercase">Public Advisory</div>
        <div className="flex items-center space-x-2">
          {isHighUrgency && (
            <div className="flex items-center space-x-1">
              <span className="status-dot critical"></span>
              <span className="text-[9px] text-alert-red font-bold tracking-wide">CRITICAL</span>
            </div>
          )}
          {isSpeaking && (
            <div className="flex items-center space-x-1">
              <span className="status-dot active"></span>
              <span className="text-[9px] text-alert-green font-bold tracking-wide">SPEAKING</span>
            </div>
          )}
        </div>
      </div>

      {/* Autoplay Warning */}
      {showAutoplayWarning && (
        <div 
          onClick={handleEnableAudio}
          className="mb-2 bg-alert-amber/10 border border-alert-amber/30 rounded px-3 py-2 cursor-pointer hover:bg-alert-amber/20 transition-colors"
        >
          <div className="text-[9px] text-alert-amber font-bold tracking-wide mb-1">
            🔊 VOICE ALERTS BLOCKED
          </div>
          <div className="text-[10px] text-text-secondary">
            Click here to enable emergency voice announcements
          </div>
        </div>
      )}

      {/* Mute/Unmute Control */}
      <div className="flex gap-1 mb-2">
        <button
          onClick={handleToggleMute}
          className={`w-full rounded px-3 py-1.5 text-[10px] font-bold transition-colors ${
            isMuted 
              ? 'bg-alert-red/10 hover:bg-alert-red/20 border border-alert-red/30 text-alert-red' 
              : 'bg-ops-panel hover:bg-ops-bg border border-ops-border text-text-primary'
          }`}
          title={isMuted ? 'Unmute automatic voice announcements' : 'Mute automatic voice announcements'}
        >
          {isMuted ? '🔇 VOICE MUTED' : '🔊 VOICE ACTIVE'}
        </button>
      </div>
      
      <div className="flex gap-2">
        {advisoryEntries.map(({ lang, text }) => (
          <div key={lang} className="flex-1 bg-ops-panel rounded p-2 border border-ops-border">
            <div className="text-[9px] font-bold text-alert-blue mb-1 tracking-wide">{lang}</div>
            <div className="text-[11px] text-text-primary leading-tight line-clamp-2">
              {text || 'No message'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdvisoryPanel;
