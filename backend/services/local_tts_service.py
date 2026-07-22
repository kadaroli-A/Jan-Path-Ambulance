"""
Local TTS fallback service using pyttsx3.
"""

import logging
import os

try:
    import pyttsx3
except ImportError:
    pyttsx3 = None

logger = logging.getLogger("local_tts_service")


def generate_local_tts(
    text: str,
    output_file: str,
    language_code: str = "ta-IN",
    language_name: str = "tamil",
) -> bool:

    if pyttsx3 is None:
        logger.warning("pyttsx3 not installed")
        return False

    engine = None

    try:
        # Create output folder if needed
        output_dir = os.path.dirname(output_file) or "."
        os.makedirs(output_dir, exist_ok=True)

        # Create NEW engine every call
        engine = pyttsx3.init()

        # Speech rate
        if language_code == "en-IN":
            engine.setProperty("rate", 160)
        else:
            engine.setProperty("rate", 150)

        # Generate audio
        engine.save_to_file(text, output_file)
        engine.runAndWait()

        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
            logger.info("Local TTS Generated: %s", output_file)
            return True

        logger.warning("Generated file is empty")
        return False

    except Exception as e:
        logger.warning("Local TTS failed: %s", e)
        return False

    finally:
        try:
            if engine is not None:
                del engine
        except Exception:
            pass

engine = pyttsx3.init()

voices = engine.getProperty("voices")

for i, voice in enumerate(voices):
    print("=" * 40)
    print(i)
    print("ID:", voice.id)
    print("Name:", voice.name)
    print("Languages:", getattr(voice, "languages", "N/A"))