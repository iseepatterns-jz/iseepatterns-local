import sqlite3
import os
from datetime import datetime
from langchain_community.llms import Ollama

# Configuration
DB_PATH = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/chatdb_storage/m1studio_2025-05-31_chatdb_decodedBody_added/db/decoded/2025-05-31_decoded_body_all_chat_from_m1studio.db"
MODEL_NAME = "qwen2.5-32b-forensic"
OUTPUT_FILE = "/Volumes/iseepatterns-evidence/ISEEPATTERNS_LOCKER/lawmodel1/data/transcripts/narrative_timeline.md"

# Initialize LLM
llm = Ollama(model=MODEL_NAME, temperature=0.2, num_ctx=32768)

SYSTEM_PROMPT = """You are a forensic legal analyst. You will be provided with a transcript of iMessages between Lucas (LG) and Joseph (JZ) for a specific month.
Your goal is to build a high-fidelity chronological narrative of their interactions.

Focus on:
1. Significant financial or legal discussions (contracts, payments, disputes).
2. Key players mentioned (e.g., Jaclyn Torrey, Ronayne, Gauriglia, Rowboat Creative).
3. Relationship shifts or tension points.
4. Any specific instructions, promises, or threats exchanged.

Rules:
- Cite specific timestamps for key events.
- Be concise but thorough.
- Use a neutral, forensic tone.
- If a month has no significant activity, state "Minimal forensic activity."
"""

def get_message_chunks():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Get all months available
    cursor.execute("SELECT DISTINCT strftime('%Y-%m', msg_time_local) as month FROM messages_jz_lg ORDER BY month")
    months = [row[0] for row in cursor.fetchall()]
    
    for month in months:
        query = """
        SELECT msg_time_local, 
               CASE WHEN is_from_me = 1 THEN 'JZ' ELSE 'LG' END as speaker,
               COALESCE(decodedBody, text) as body
        FROM messages_jz_lg
        WHERE strftime('%Y-%m', msg_time_local) = ?
        ORDER BY msg_time_local
        """
        cursor.execute(query, (month,))
        messages = cursor.fetchall()
        
        transcript = ""
        for m in messages:
            transcript += f"[{m[0]}] {m[1]}: {m[2]}\n"
        
        yield month, transcript
    
    conn.close()

MAX_CHARS_PER_PROMPT = 25000  # ~6k-8k tokens

def generate_summary(month, transcript):
    if len(transcript) <= MAX_CHARS_PER_PROMPT:
        prompt = f"{SYSTEM_PROMPT}\n\n### Month: {month}\n\nTranscript:\n{transcript}\n\nNarrative Analysis:"
        try:
            return llm.invoke(prompt)
        except Exception as e:
            return f"Error generating summary for {month}: {e}"
    else:
        print(f"    Month {month} is too large ({len(transcript)} chars). Splitting into sub-chunks.")
        # Split by lines to avoid cutting in the middle of a message
        lines = transcript.split("\n")
        sub_chunks = []
        current_chunk = ""
        
        for line in lines:
            if len(current_chunk) + len(line) < MAX_CHARS_PER_PROMPT:
                current_chunk += line + "\n"
            else:
                sub_chunks.append(current_chunk)
                current_chunk = line + "\n"
        if current_chunk:
            sub_chunks.append(current_chunk)
            
        sub_summaries = []
        for i, chunk in enumerate(sub_chunks, 1):
            print(f"      Processing sub-chunk {i}/{len(sub_chunks)}...")
            prompt = f"{SYSTEM_PROMPT}\n\n### Month: {month} (Part {i}/{len(sub_chunks)})\n\nTranscript:\n{chunk}\n\nNarrative Analysis:"
            try:
                sub_summaries.append(llm.invoke(prompt))
            except Exception as e:
                sub_summaries.append(f"Error in sub-chunk {i}: {e}")
        
        # Merge summaries
        merged_prompt = f"""You are a forensic legal analyst. Below are multiple partial investigative summaries for the month of {month}.
Combine them into a single, cohesive chronological narrative for the entire month.

RULES:
- Maintain chronological flow.
- Ensure all key legal/financial events from the sub-summaries are preserved.
- Use a neutral, forensic tone.

SUB-SUMMARIES:
{chr(10).join(sub_summaries)}

FULL MONTHLY NARRATIVE:"""
        try:
            return llm.invoke(merged_prompt)
        except Exception as e:
            return f"Error merging summaries for {month}: {e}"

def main():
    print(f"🚀 Starting Narrative Generation using {MODEL_NAME}...")
    
    if not os.path.exists(os.path.dirname(OUTPUT_FILE)):
        os.makedirs(os.path.dirname(OUTPUT_FILE))
        
    if not os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            f.write(f"# Unified Forensic Narrative Timeline: LG ↔ JZ\n")
            f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")

    # Read existing timeline to skip processed months
    existing_content = ""
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            existing_content = f.read()

    for month, transcript in get_message_chunks():
        if f"## {month}" in existing_content:
            print(f"  - {month} already exists. Skipping.")
            continue
            
        print(f"  Processing {month} ({len(transcript)} chars)...")
        summary = generate_summary(month, transcript)
        
        with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
            f.write(f"## {month}\n")
            f.write(summary + "\n\n")
            f.write("---\n\n")
        
        print(f"  ✓ {month} completed.")

if __name__ == "__main__":
    main()
