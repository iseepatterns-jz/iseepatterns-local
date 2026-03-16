import json
import os
from pathlib import Path
from langchain_community.llms import Ollama

# Configuration
NARRATIVE_FILE = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/transcripts/narrative_timeline.md")
OUTPUT_SCRIPT = Path("/Volumes/batdrivetb5/AI_TRAINING/lawmodel1/data/transcripts/podcast_script.json")
MODEL_NAME = "qwen2.5-32b-forensic"

# Initialize LLM
llm = Ollama(model=MODEL_NAME, temperature=0.7, num_ctx=32768)

SYSTEM_PROMPT = """You are an expert scriptwriter for a "Deep Dive" style investigative podcast.
You will be provided with a forensic narrative timeline of iMessage interactions between Lucas (LG) and Joseph (JZ).

Your goal is to transform this timeline into a compelling, 2-person podcast script.

### Cast:
1. **Aris**: The primary investigative analyst. Deeply forensic, focused on the data, timestamps, and specific legal implications. Sounds slightly more formal but accessible.
2. **Isabella**: The co-host who focuses on the narrative arc, human psychology, and "connecting the dots" for the listener. She asks the questions the audience is thinking and highlights the emotional tension.

### Guidelines:
- The tone should be similar to "The Daily" or "NotebookLM Deep Dive."
- Use natural conversational fillers (e.g., "Right," "Exactly," "And that's where it gets weird.").
- Focus heavily on the **December 2023 - January 2024 collapse**.
- Mention specific evidence: "18k messages," "fake documents to accountants," "denied bank access," "FBI mentions."
- Highlight the relationship arc: From 13-year partnership to total legal warfare.

### Output Format:
You MUST output ONLY valid JSON in the following format:
[
  {"speaker": "Aris", "text": "Welcome back to the deep dive. Today, we're looking at the Rowboat Creative files."},
  {"speaker": "Isabella", "text": "And Aris, this one is... it's heavy. We're talking about a thirteen-year partnership that just... implodes over three months."}
]
"""

def main():
    if not NARRATIVE_FILE.exists():
        print(f"Error: {NARRATIVE_FILE} not found.")
        return

    print(f"Reading narrative from {NARRATIVE_FILE}...")
    narrative_text = NARRATIVE_FILE.read_text()

    prompt = f"{SYSTEM_PROMPT}\n\nFORENSIC NARRATIVE:\n{narrative_text}\n\nPODCAST SCRIPT (JSON):"

    print(f"Generating script using {MODEL_NAME} (this may take a minute)...")
    try:
        response = llm.invoke(prompt)
        
        # Strip potential markdown code blocks
        if "```json" in response:
            response = response.split("```json")[1].split("```")[0].strip()
        elif "```" in response:
            response = response.split("```")[1].split("```")[0].strip()
        
        script_data = json.loads(response)
        
        with open(OUTPUT_SCRIPT, "w", encoding="utf-8") as f:
            json.dump(script_data, f, indent=2)
            
        print(f"✓ Podcast script generated: {OUTPUT_SCRIPT}")
        
    except Exception as e:
        print(f"Error generating script: {e}")
        # Print first 500 chars of response for debugging
        if 'response' in locals():
            print("Response Snippet:", response[:500])

if __name__ == "__main__":
    main()
