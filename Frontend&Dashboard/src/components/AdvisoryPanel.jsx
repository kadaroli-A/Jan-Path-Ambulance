import { useState, useEffect, useRef } from 'react';
import { speakSequential, cancelSpeech, getIsSpeaking, getCurrentLanguage, resetSpeechHistory, isAutoplayBlocked, enableAudioAfterInteraction } from '../utils/speak';

const AdvisoryPanel = ({ advisory, urgency }) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentLang, setCurrentLang] = useState('');
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
      setCurrentLang(getCurrentLanguage());
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

  const getLanguageStatus = (lang) => {
    if (!isSpeaking) return 'waiting';
    if (currentLang === lang) return 'playing';
    return 'waiting';
  };

  const advisoryEntries = [
    { lang: 'தமிழ்', text: advisory.tamil, key: 'Tamil' },
    { lang: 'ENG', text: advisory.english, key: 'English' },
    { lang: 'हिंदी', text: advisory.hindi, key: 'Hindi' },
  ];

  return (
    <div className={`ops-card rounded-lg p-4 h-full transition-all duration-300 ${
      isHighUrgency ? 'border-2 border-alert-red shadow-[0_0_20px_rgba(255,77,79,0.2)]' : ''
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="text-[11px] text-text-muted font-black tracking-widest uppercase">
            {isSpeaking ? '🔊 Live Public Announcement' : 'Public Advisory'}
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isHighUrgency && (
            <div className="flex items-center space-x-1 px-2 py-1 rounded bg-alert-red/10 border border-alert-red/30">
              <span className="status-dot critical"></span>
              <span className="text-[9px] text-alert-red font-bold tracking-wide">CRITICAL</span>
            </div>
          )}
          {isSpeaking && (
            <div className="flex items-center space-x-1 px-2 py-1 rounded bg-alert-green/10 border border-alert-green/30 animate-pulse">
              <span className="status-dot active"></span>
              <span className="text-[9px] text-alert-green font-bold tracking-wide">BROADCASTING</span>
            </div>
          )}
        </div>
      </div>

      {/* Autoplay Warning */}
      {showAutoplayWarning && (
        <div 
          onClick={handleEnableAudio}
          className="mb-3 bg-alert-amber/15 border border-alert-amber/40 rounded-lg px-4 py-3 cursor-pointer hover:bg-alert-amber/25 transition-all duration-200 shadow-lg"
        >
          <div className="text-[10px] text-alert-amber font-bold tracking-wide mb-1.5">
            🔊 VOICE ALERTS BLOCKED
          </div>
          <div className="text-[11px] text-text-secondary leading-relaxed">
            Click here to enable emergency voice announcements
          </div>
        </div>
      )}

      {/* Mute/Unmute Control */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleToggleMute}
          className={`flex-1 rounded-lg px-4 py-2 text-[11px] font-bold transition-all duration-200 ${
            isMuted 
              ? 'bg-alert-red/15 hover:bg-alert-red/25 border border-alert-red/40 text-alert-red shadow-md' 
              : 'bg-ops-panel hover:bg-ops-bg border border-ops-border text-text-primary shadow-sm'
          }`}
          title={isMuted ? 'Unmute automatic voice announcements' : 'Mute automatic voice announcements'}
        >
          {isMuted ? '🔇 VOICE MUTED' : '🔊 VOICE ACTIVE'}
        </button>
      </div>
      
      {/* Advisory Text Cards with Enhanced Voice Visualization */}
      <div className="flex flex-col gap-2">
        {advisoryEntries.map(({ lang, text, key }) => {
          const status = getLanguageStatus(key);
          const isPlaying = status === 'playing';
          
          return (
            <div 
              key={lang} 
              className={`voice-card ${isPlaying ? 'voice-card-active' : 'voice-card-idle'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`voice-lang-label ${isPlaying ? 'voice-lang-active' : ''}`}>
                    {lang}
                  </div>
                  {isPlaying && (
                    <div className="voice-wave-indicator">
                      <div className="voice-wave-bar"></div>
                      <div className="voice-wave-bar"></div>
                      <div className="voice-wave-bar"></div>
                      <div className="voice-wave-bar"></div>
                    </div>
                  )}
                </div>
                {isPlaying && (
                  <div className="voice-status-playing">
                    PLAYING
                  </div>
                )}
                {!isSpeaking && isSpeaking !== null && (
                  <div className="voice-status-ready">
                    READY
                  </div>
                )}
              </div>
              <div className={`voice-text ${isPlaying ? 'voice-text-active' : ''}`}>
                {text || 'No message'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AdvisoryPanel;
