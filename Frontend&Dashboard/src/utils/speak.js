// Voice Advisory System using Backend-Generated MP3 files
// Backend: FastAPI generates MP3 files (Sarvam TTS)
// Frontend: Plays MP3 files sequentially without repetition
// Speaks in sequential order: Tamil → English → Hindi

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://127.0.0.1:8000';

// Playback state management
let isSpeaking = false;
let currentAudio = null;
let playbackQueue = [];
let isProcessingQueue = false;
let currentPlayingLanguage = ''; // Track which language is playing

// Advisory tracking to prevent repetition
let lastAdvisoryHash = {
  tamil: '',
  english: '',
  hindi: ''
};

// Track latest advisory to ignore outdated requests
let latestAdvisoryHash = '';
let pendingAdvisoryHash = '';

// User interaction flag for autoplay
let userInteracted = false;
let autoplayBlocked = false;

/**
 * Generate simple hash from text
 */
const hashText = (text) => {
  if (!text) return '';
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

/**
 * Initialize user interaction listener
 */
const initUserInteraction = () => {
  if (userInteracted) return;
  
  const handleInteraction = () => {
    userInteracted = true;
    autoplayBlocked = false;
    console.log('User interaction detected - audio autoplay enabled');
    
    // Remove listeners after first interaction
    document.removeEventListener('click', handleInteraction);
    document.removeEventListener('keydown', handleInteraction);
    document.removeEventListener('touchstart', handleInteraction);
  };
  
  document.addEventListener('click', handleInteraction, { once: true });
  document.addEventListener('keydown', handleInteraction, { once: true });
  document.addEventListener('touchstart', handleInteraction, { once: true });
};

// Initialize on module load
initUserInteraction();

/**
 * Cancel any ongoing speech and clear queue
 */
export const cancelSpeech = () => {
  // Stop current audio
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
  
  // Clear queue
  playbackQueue = [];
  isProcessingQueue = false;
  isSpeaking = false;
  currentPlayingLanguage = '';
  
  // Clear pending advisory
  pendingAdvisoryHash = '';
  window.__pendingAdvisory = null;
};

/**
 * Check if currently speaking
 */
export const getIsSpeaking = () => isSpeaking;

/**
 * Get currently playing language
 */
export const getCurrentLanguage = () => currentPlayingLanguage;

/**
 * Check if autoplay is blocked
 */
export const isAutoplayBlocked = () => autoplayBlocked;

/**
 * Play a single MP3 file from backend
 */
const playMP3 = (url, language) => {
  return new Promise((resolve, reject) => {
    try {
      // Check if already playing
      if (currentAudio && !currentAudio.paused) {
        console.log(`Already playing audio, skipping ${language}`);
        resolve();
        return;
      }

      console.log(`Loading audio for ${language}: ${url}`);
      
      const audio = new Audio(url);
      currentAudio = audio;
      isSpeaking = true;
      currentPlayingLanguage = language; // Track current language

      audio.onloadeddata = () => {
        console.log(`Audio loaded for ${language}, duration: ${audio.duration}s`);
      };

      audio.onended = () => {
        console.log(`Audio playback completed for ${language}`);
        isSpeaking = false;
        currentAudio = null;
        currentPlayingLanguage = '';
        resolve();
      };

      audio.onerror = (error) => {
        console.error(`Audio playback error for ${language}:`, error);
        isSpeaking = false;
        currentAudio = null;
        currentPlayingLanguage = '';
        reject(new Error(`Failed to play ${language} audio`));
      };

      // Attempt to play
      audio.play()
        .then(() => {
          console.log(`Audio playback started for ${language}`);
          autoplayBlocked = false;
        })
        .catch((error) => {
          console.error(`Audio play() error for ${language}:`, error);
          
          // Handle autoplay block
          if (error.name === 'NotAllowedError') {
            autoplayBlocked = true;
            console.warn('Autoplay blocked by browser. User interaction required.');
            isSpeaking = false;
            currentAudio = null;
            currentPlayingLanguage = '';
            reject(new Error('AUTOPLAY_BLOCKED'));
          } else {
            isSpeaking = false;
            currentAudio = null;
            currentPlayingLanguage = '';
            reject(error);
          }
        });

    } catch (error) {
      console.error(`Exception playing ${language}:`, error);
      isSpeaking = false;
      currentAudio = null;
      currentPlayingLanguage = '';
      reject(error);
    }
  });
};

/**
 * Process playback queue sequentially
 */
const processQueue = async () => {
  if (isProcessingQueue || playbackQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (playbackQueue.length > 0) {
    const { url, language } = playbackQueue.shift();
    
    try {
      await playMP3(url, language);
      // Add small delay between languages for natural pacing
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      if (error.message === 'AUTOPLAY_BLOCKED') {
        console.log('Autoplay blocked - waiting for user interaction');
        // Put back in queue
        playbackQueue.unshift({ url, language });
        break;
      }
      console.error(`Failed to play ${language}, continuing to next...`);
    }
  }

  isProcessingQueue = false;
  
  // After completing playback, check if there's a pending advisory
  if (pendingAdvisoryHash && window.__pendingAdvisory) {
    console.log('Playing pending advisory after current sequence completed');
    const pending = window.__pendingAdvisory;
    window.__pendingAdvisory = null;
    pendingAdvisoryHash = '';
    // Small delay before playing next advisory
    setTimeout(() => speakSequential(pending, false), 500);
  }
};

/**
 * Add audio to playback queue
 */
const queueAudio = (url, language) => {
  playbackQueue.push({ url, language });
  processQueue();
};

/**
 * Speak advisory in all three languages sequentially
 * Tamil → English → Hindi
 * Uses backend-generated MP3 files
 * @param {Object} advisory - Object with tamil, english, hindi properties
 * @param {boolean} force - Force speaking even if text hasn't changed
 */
export const speakSequential = async (advisory, force = false) => {
  if (!advisory) {
    console.log('No advisory provided');
    return;
  }

  const { tamil = '', english = '', hindi = '' } = advisory;

  // Check if any text is empty
  if (!tamil && !english && !hindi) {
    console.log('All advisory texts are empty');
    return;
  }

  // Generate hashes for current advisory
  const currentHash = {
    tamil: hashText(tamil),
    english: hashText(english),
    hindi: hashText(hindi)
  };

  // Generate combined hash for this advisory
  const combinedHash = `${currentHash.tamil}-${currentHash.english}-${currentHash.hindi}`;

  // Check if advisory has changed
  const tamilChanged = currentHash.tamil !== lastAdvisoryHash.tamil && tamil;
  const englishChanged = currentHash.english !== lastAdvisoryHash.english && english;
  const hindiChanged = currentHash.hindi !== lastAdvisoryHash.hindi && hindi;

  if (!force && !tamilChanged && !englishChanged && !hindiChanged) {
    console.log('Advisory unchanged, skipping playback');
    return;
  }

  // If already playing, store this as the latest pending advisory
  if (isSpeaking || isProcessingQueue) {
    // Only update if this is newer than current pending
    if (combinedHash !== latestAdvisoryHash) {
      console.log('Audio already playing, queuing latest advisory');
      pendingAdvisoryHash = combinedHash;
      // Store the advisory for later playback
      window.__pendingAdvisory = advisory;
    }
    return;
  }

  console.log('New advisory detected, starting sequential playback');

  // Mark this as the latest advisory being played
  latestAdvisoryHash = combinedHash;
  pendingAdvisoryHash = '';

  // Update last advisory hashes
  if (tamil) lastAdvisoryHash.tamil = currentHash.tamil;
  if (english) lastAdvisoryHash.english = currentHash.english;
  if (hindi) lastAdvisoryHash.hindi = currentHash.hindi;

  // Clear any existing queue
  playbackQueue = [];

  // Add timestamp to prevent browser caching
  const timestamp = Date.now();

  // Queue Tamil audio
  if (tamil && tamil !== 'No message') {
    queueAudio(`${API_BASE_URL}/audio/advisory_tamil.mp3?t=${timestamp}`, 'Tamil');
  }

  // Queue English audio
  if (english && english !== 'No message') {
    queueAudio(`${API_BASE_URL}/audio/advisory_english.mp3?t=${timestamp}`, 'English');
  }

  // Queue Hindi audio
  if (hindi && hindi !== 'No message') {
    queueAudio(`${API_BASE_URL}/audio/advisory_hindi.mp3?t=${timestamp}`, 'Hindi');
  }
};

/**
 * Reset speech history (useful when starting a new emergency)
 */
export const resetSpeechHistory = () => {
  console.log('Resetting speech history');
  lastAdvisoryHash = {
    tamil: '',
    english: '',
    hindi: ''
  };
  cancelSpeech();
};

/**
 * Check if speech synthesis is supported
 */
export const isSpeechSupported = () => {
  return typeof Audio !== 'undefined';
};

/**
 * Enable audio after user interaction (call this on user click if autoplay blocked)
 */
export const enableAudioAfterInteraction = () => {
  userInteracted = true;
  autoplayBlocked = false;
  console.log('Audio enabled by user interaction');
  
  // Reset processing flag to allow retry
  isProcessingQueue = false;
  
  // Try to process queue if there are pending items
  if (playbackQueue.length > 0) {
    console.log('Processing pending audio queue after user interaction');
    processQueue();
  }
};
