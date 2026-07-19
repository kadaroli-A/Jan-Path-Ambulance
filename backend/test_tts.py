from services.tts_service import generate_tamil_tts

generate_tamil_tts(
    eta=30,
    selected_lane="L2"
)

print("Tamil TTS generated successfully.")