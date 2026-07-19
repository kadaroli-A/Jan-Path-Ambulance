import os
import base64
import hashlib
from dotenv import load_dotenv

try:
    from sarvamai import SarvamAI
except ImportError:  # pragma: no cover - fallback for environments without the package
    SarvamAI = None

# Load environment variables
load_dotenv()

API_KEY = os.getenv("SARVAM_API_KEY")

# Initialize Sarvam Client only when available
client = None
if API_KEY and SarvamAI is not None:
    client = SarvamAI(
        api_subscription_key=API_KEY,
    )

# Lane Mapping
LANE_TEXT = {
    "L1": "இடது வழித்தடத்தில் உள்ள வாகனங்கள்",
    "L2": "நடுப்பாதையில் உள்ள வாகனங்கள்",
    "L3": "வலது வழித்தடத்தில் உள்ள வாகனங்கள்",
}


def generate_tamil_tts(
    text: str,
    output_file: str = "backend/audio/advisory.mp3",
    language_code: str = "ta-IN",
    language_name: str = "tamil",
):
    """
    Generate speech from the given text for a specific language.

    Args:
        text (str): Advisory text
        output_file (str): MP3 output path
        language_code (str): ISO language code for Sarvam
        language_name (str): Display name for logging

    Returns:
        str: Generated MP3 path or None if generation fails
    """

    output_dir = os.path.dirname(output_file) or "."
    os.makedirs(output_dir, exist_ok=True)

    cache_file = f"{output_file}.cache"
    text_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()

    if os.path.exists(output_file) and os.path.exists(cache_file):
        with open(cache_file, "r", encoding="utf-8") as cache_handle:
            if cache_handle.read().strip() == text_hash:
                print(f"Using cached {language_name} audio: {output_file}")
                return output_file

    if client is None:
        print(f"Skipping {language_name} TTS generation: client unavailable")
        return None

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

        with open(cache_file, "w", encoding="utf-8") as cache_handle:
            cache_handle.write(text_hash)

        print(f"Generated {language_name} Advisory:\n{text}")

        return output_file

    except Exception as e:
        print("=" * 60)
        print(f"SARVAM TTS ERROR [{language_name}]")
        print(e)
        print("Skipping TTS generation...")
        print("=" * 60)

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