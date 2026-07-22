import base64
import hashlib
import logging
import os
from dotenv import load_dotenv

try:
    from sarvamai import SarvamAI
except ImportError:  # pragma: no cover - fallback for environments without the package
    SarvamAI = None

from backend.services.local_tts_service import generate_local_tts

logger = logging.getLogger("tts_service")

# Load environment variables
load_dotenv()

API_KEY = os.getenv("SARVAM_API_KEY")
client = None


def _get_sarvam_client():
    global API_KEY, client

    load_dotenv(override=True)
    api_key = os.getenv("SARVAM_API_KEY")
    if api_key is None or SarvamAI is None:
        client = None
        API_KEY = api_key
        return None

    if client is None or api_key != API_KEY:
        try:
            client = SarvamAI(api_subscription_key=api_key)
            API_KEY = api_key
            logger.info("Sarvam client initialized or refreshed")
        except Exception as exc:
            logger.warning("Failed to initialize Sarvam client: %s", exc)
            client = None

    return client


def _should_use_fallback(error_text: str) -> bool:
    """
    Determine if an error should trigger fallback to Local TTS.
    
    Args:
        error_text (str): Error message from Sarvam API
    
    Returns:
        bool: True if fallback should be triggered
    """
    error_lower = error_text.lower()
    
    # Trigger fallback on these conditions:
    # - Payment required (402)
    # - Rate limit (429)
    # - Authentication errors
    # - Network timeouts
    # - Connection errors
    # - Quota exceeded
    
    fallback_triggers = [
        "402",  # Payment required
        "429",  # Rate limit
        "401",  # Unauthorized
        "403",  # Forbidden
        "auth",  # Authentication
        "timeout",  # Network timeout
        "connection",  # Connection error
        "quota",  # Quota exceeded
        "rate limit",  # Rate limiting message
        "temporarily unavailable",
        "service unavailable",
        "500",  # Server error
        "503",  # Service unavailable
    ]
    
    return any(trigger in error_lower for trigger in fallback_triggers)


def generate_tamil_tts(
    text: str,
    output_file: str = "backend/audio/advisory.mp3",
    language_code: str = "ta-IN",
    language_name: str = "tamil",
):
    """
    Generate speech from the given text for a specific language.
    
    Implements fallback chain:
    1. Try Sarvam API (primary)
    2. If Sarvam fails, try Local TTS (fallback)
    3. If both fail, use cached file if available
    
    Args:
        text (str): Advisory text
        output_file (str): MP3 output path
        language_code (str): ISO language code for Sarvam
        language_name (str): Display name for logging

    Returns:
        str: Generated MP3 path or None if generation fails and no cache exists
    """

    output_dir = os.path.dirname(output_file) or "."
    os.makedirs(output_dir, exist_ok=True)

    cache_file = f"{output_file}.cache"
    text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

    # Check if we have valid cached audio for this exact text
    if os.path.exists(output_file) and os.path.exists(cache_file):
        try:
            with open(cache_file, "r", encoding="utf-8") as cache_handle:
                cached_hash = cache_handle.read().strip()
                if cached_hash == text_hash:
                    logger.info("Using Cached Audio: %s", output_file)
                    return output_file
        except Exception as e:
            logger.debug("Error reading cache file: %s", e)

    # ========================================
    # STEP 1: Try Sarvam API (Primary)
    # ========================================
    
    _get_sarvam_client()
    if client is not None:
        try:
            response = client.text_to_speech.convert(
                text=text,
                target_language_code=language_code,
                speaker="kavya",
                model="bulbul:v3",
            )

            audio_base64 = response.audios[0]
            audio_bytes = base64.b64decode(audio_base64)

            with open(output_file, "wb") as f:
                f.write(audio_bytes)

            # Save cache hash for this text
            with open(cache_file, "w", encoding="utf-8") as cache_handle:
                cache_handle.write(text_hash)

            logger.info("Using Sarvam TTS: %s (%s)", output_file, language_name)
            return output_file

        except Exception as e:
            err_text = str(e)
            
            # Log Sarvam failure
            if "402" in err_text or "429" in err_text:
                logger.warning("Sarvam API Rate Limited/Quota: %s", err_text)
            else:
                logger.warning("Sarvam TTS failed (%s): %s", language_name, err_text)
            
            # Check if we should fall back to Local TTS
            if _should_use_fallback(err_text):
                logger.info("Sarvam failed, switching to Local TTS for %s", language_name)
            else:
                logger.debug("Sarvam error does not trigger fallback: %s", err_text)
    else:
        logger.warning("Sarvam client not available, attempting Local TTS")

    # ========================================
    # STEP 2: Try Local TTS (Fallback)
    # ========================================
    
    logger.info("Switching to Local TTS for %s", language_name)
    
    local_success = generate_local_tts(
        text=text,
        output_file=output_file,
        language_code=language_code,
        language_name=language_name
    )
    
    if local_success:
        # Save cache hash for this text
        try:
            with open(cache_file, "w", encoding="utf-8") as cache_handle:
                cache_handle.write(text_hash)
        except Exception as e:
            logger.debug("Error saving cache file: %s", e)
        
        return output_file

    # ========================================
    # STEP 3: Use Cached Audio (Final Fallback)
    # ========================================
    
    if os.path.exists(output_file):
        logger.warning("Local TTS Failed for %s, using Cached Audio", language_name)
        logger.info("Voice unavailable, using Cached Audio: %s", output_file)
        return output_file
    
    logger.error("All TTS methods failed and no cached audio available for %s", language_name)
    return None



def generate_multilingual_tts(advisory: dict):
    """Generate Tamil, English, and Hindi MP3 files from an advisory payload."""

    language_specs = [
        ("tamil", advisory.get("tamil"), "backend/audio/advisory_tamil.mp3", "ta-IN"),
        ("english", advisory.get("english"), "backend/audio/advisory_english.mp3", "en-IN"),
        ("hindi", advisory.get("hindi"), "backend/audio/advisory_hindi.mp3", "hi-IN"),
    ]

    generated_files = {}

    for language_name, text, output_file, language_code in language_specs:
        if not text:
            continue

        generated_files[language_name] = generate_tamil_tts(
            text=text,
            output_file=output_file,
            language_code=language_code,
            language_name=language_name,
        )

    return generated_files