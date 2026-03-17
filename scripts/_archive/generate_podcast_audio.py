import json
import os
import subprocess
from pathlib import Path

# Configuration
SCRIPT_FILE = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/transcripts/podcast_script.json")
OUTPUT_DIR = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/TRANSCRIPTS_LOCKER/2026-03-12-narrative-timeline/audio")
TEMP_DIR = Path("/tmp/podcast_gen")
NARRATIVE_TEXT_DEST = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/TRANSCRIPTS_LOCKER/2026-03-12-narrative-timeline/txt/narrative_timeline.txt")
ORIGINAL_NARRATIVE = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/transcripts/narrative_timeline.md")

# Voice Mapping (macOS 'say' defaults)
VOICES = {
    "Aris": "Daniel",    # UK Male
    "Isabella": "Samantha" # US Female
}

def main():
    if not SCRIPT_FILE.exists():
        print(f"Error: {SCRIPT_FILE} not found.")
        return

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    with open(SCRIPT_FILE, "r") as f:
        script = json.load(f)

    # 1) Copy narrative text to the locker
    if ORIGINAL_NARRATIVE.exists():
        NARRATIVE_TEXT_DEST.write_text(ORIGINAL_NARRATIVE.read_text())
        print(f"✓ Narrative text copied to {NARRATIVE_TEXT_DEST}")

    # 2) Generate individual audio segments
    print(f"Generating {len(script)} audio segments using 'say'...")
    segment_files = []
    
    for i, turn in enumerate(script):
        speaker = turn["speaker"]
        text = turn["text"]
        voice = VOICES.get(speaker, "Alex") # Fallback to Alex
        
        tmp_file = TEMP_DIR / f"segment_{i:03d}.aiff"
        print(f"  [{i+1}/{len(script)}] {speaker}: {text[:50]}...")
        
        subprocess.run(["say", "-v", voice, "-o", str(tmp_file), text], check=True)
        segment_files.append(str(tmp_file))

    # 3) Concatenate using ffmpeg
    final_mp3 = OUTPUT_DIR / "narrative_podcast.mp3"
    print(f"Merging segments into {final_mp3}...")
    
    # Create a file list for ffmpeg
    list_file = TEMP_DIR / "segments.txt"
    with open(list_file, "w") as f:
        for fpath in segment_files:
            f.write(f"file '{fpath}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(list_file),
        "-c:a", "libmp3lame",
        "-q:a", "2",
        str(final_mp3)
    ]
    
    subprocess.run(cmd, check=True)
    
    # 4) Cleanup
    print("Cleaning up temp files...")
    for f in segment_files:
        os.remove(f)
    os.remove(list_file)

    print(f"\n✨ Success! Podcast audio produced at:\n{final_mp3}")

if __name__ == "__main__":
    main()
