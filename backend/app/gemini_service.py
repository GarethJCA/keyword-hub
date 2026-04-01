import os
import json
import httpx

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-high:streamGenerateContent"

def _load_brand_context():
    """Load brand_standards.md and agency_architect_instructions.md as system context."""
    base_dir = os.path.join(os.path.dirname(__file__), "../..")
    context_parts = []
    
    for filename in ["brand_standards.md", "agency_architect_instructions.md"]:
        filepath = os.path.join(base_dir, filename)
        if os.path.exists(filepath):
            with open(filepath, "r") as f:
                context_parts.append(f"--- {filename} ---\n{f.read()}")
    
    return "\n\n".join(context_parts)


SYSTEM_PROMPT = """You are an expert SEO Content Strategist for a Canadian Professional Staffing & Recruitment agency. 

Your job is to draft page outlines and content following the brand standards and agency architect instructions provided below. Every response you produce must:

1. Follow the exact H1 formula, word count targets, CTA language, and metadata formulas defined in the brand standards
2. Use third-person brand voice (refer to the company as "[Company Name]" — the user will replace this)
3. Never use banned words or phrases listed in the brand standards
4. Apply the correct content ratio (employer vs. candidate focus) for the specified Layer
5. Include proper internal linking hierarchy
6. All salary/compensation figures must be in CAD
7. Geographic references must include province on first mention

When drafting a page outline, produce the following sections:
- **Title Tag** (under 60 characters)
- **Meta Description** (under 155 characters)
- **H1 Heading** (following the layer-specific formula)
- **Full Page Outline** with H2/H3 subheadings, content descriptions, and word count estimates for each section
- **Primary CTA** and **Secondary CTA** using the correct layer language
- **Internal Links** following the hub-and-spoke hierarchy
- **Target Keywords** mapped to each section

Format everything in clean markdown.

BRAND CONTEXT:
"""


async def stream_chat(api_key: str, keywords: list[str], messages: list[dict], layer: str = "Layer 1"):
    """Stream a chat response from Gemini with brand context."""
    brand_context = _load_brand_context()
    full_system = SYSTEM_PROMPT + brand_context
    
    # Build the keyword context message
    keyword_context = f"Selected keywords for this draft: {', '.join(keywords)}\nTarget Layer: {layer}"
    
    # Build messages for Gemini
    gemini_contents = []
    
    # Add keyword context as first user message if this is the start of the conversation
    if len(messages) == 1:
        gemini_contents.append({
            "role": "user",
            "parts": [{"text": keyword_context + "\n\n" + messages[0]["content"]}]
        })
    else:
        # Add all messages
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            gemini_contents.append({
                "role": role,
                "parts": [{"text": msg["content"]}]
            })
    
    payload = {
        "contents": gemini_contents,
        "systemInstruction": {
            "parts": [{"text": full_system}]
        },
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 8192
        }
    }
    
    url = f"{GEMINI_API_URL}?alt=sse&key={api_key}"
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    print(f"Gemini API error: {response.status_code} - {error_body.decode()}")
                    yield f"⚠️ Gemini API returned error {response.status_code}. Please check your API key."
                    return
                    
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            candidates = chunk.get("candidates", [])
                            if candidates:
                                parts = candidates[0].get("content", {}).get("parts", [])
                                for part in parts:
                                    text = part.get("text", "")
                                    if text:
                                        yield text
                        except json.JSONDecodeError:
                            continue
        except httpx.ReadTimeout:
            yield "\n\n⚠️ The request timed out. The system prompt may be too large. Please try again."
        except Exception as e:
            print(f"Gemini stream error: {e}")
            yield f"\n\n⚠️ Error: {str(e)}"
