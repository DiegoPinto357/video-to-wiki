import sys
import json
from faster_whisper import WhisperModel


def transcribe(audio_path: str, model_size: str = "small") -> str:
    model = WhisperModel(model_size, device="auto", compute_type="auto")
    segments, _ = model.transcribe(audio_path, beam_size=5)
    return " ".join(segment.text.strip() for segment in segments)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: transcribe.py <audio_file> [model_size]"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    model_size = sys.argv[2] if len(sys.argv) > 2 else "small"

    try:
        text = transcribe(audio_path, model_size)
        print(json.dumps({"text": text}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
