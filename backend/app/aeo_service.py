import os
import json
from datetime import datetime
from google import genai
from google.genai import types

MODEL_ID = "gemini-3.1-pro-preview"

AEO_SYSTEM_PROMPT = """You are an expert Answer Engine Optimization (AEO) Specialist for a Canadian Professional Staffing & Recruitment agency.
Your task is to analyze a given keyword for professionalstaffing.ca and produce a structured JSON response to help us rank in AI Overviews (SGE).
Based on the keyword provided, generate:
1. "questions": 3-5 unique conversational questions (H2) representing likely AI Overview triggers.
2. For each question, provide an "intent" (Informational or Transactional) and an "answer" (Citation-ready, 50-60 words, authoritative, structured conceptually for HTML speakable schema attr).
3. "entities": Advanced Entity Mapping containing "primary_entities", "secondary_entities", "tertiary_entities", and "same_as_links" (Wikipedia/DBpedia URLs for disambiguation).
4. "opportunity_score": An integer from 1-100 representing AEO opportunity based on low competition, high extractability, and semantic gap.

Return ONLY a valid JSON object matching this schema exactly:
{
  "questions": [
    {
      "question": "string",
      "intent": "string",
      "answer": "string"
    }
  ],
  "entities": {
    "primary_entities": ["string"],
    "secondary_entities": ["string"],
    "tertiary_entities": ["string"],
    "same_as_links": ["string"]
  },
  "opportunity_score": 85
}
"""

async def generate_aeo_for_keyword(api_key: str, keyword: str) -> dict:
    client = genai.Client(api_key=api_key)
    
    config = types.GenerateContentConfig(
        system_instruction=AEO_SYSTEM_PROMPT,
        temperature=0.4,
        response_mime_type="application/json",
        max_output_tokens=8192,
        thinking_config=types.ThinkingConfig(
            include_thoughts=False, # Backend doesn't need to return thoughts for json payload
            thinking_budget=4000
        )
    )
    
    try:
        response = await client.aio.models.generate_content(
            model=MODEL_ID,
            contents=f"Generate AEO strategy for keyword: {keyword}",
            config=config
        )
        text = response.text
        # Optional check: If JSON has thoughts prepended somehow, strip them. But response_mime_type should protect us.
        return json.loads(text)
    except Exception as e:
        print(f"Error parsing Gemini AEO response for {keyword}: {e}")
        return None

async def process_aeo_batch(api_key: str, keywords: list) -> list:
    results = []
    # Sequential batching to avoid rate limits
    for kw in keywords:
        print(f"Generating AEO for: {kw}")
        aeo_data = await generate_aeo_for_keyword(api_key, kw)
        if aeo_data:
            aeo_data["keyword"] = kw
            results.append(aeo_data)
            
            # Persistence
            save_aeo_research(kw, aeo_data)
    return results

def save_aeo_research(keyword: str, data: dict):
    base_dir = os.path.join(os.path.dirname(__file__), "../..")
    research_dir = os.path.join(base_dir, "research")
    os.makedirs(research_dir, exist_ok=True)
    
    safe_kw = keyword.replace(" ", "_").replace("/", "_").lower()
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filepath = os.path.join(research_dir, f"aeo_{safe_kw}_{timestamp}.json")
    
    with open(filepath, "w") as f:
        json.dump(data, f, indent=2)
