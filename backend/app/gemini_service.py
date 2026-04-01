import os
import json
from google import genai
from google.genai import types

MODEL_ID = "gemini-3.1-pro-preview"

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
        gemini_contents.append(
            types.Content(role="user", parts=[types.Part.from_text(keyword_context + "\n\n" + messages[0]["content"])])
        )
    else:
        # Add all messages
        for msg in messages:
            role = "user" if msg["role"] == "user" else "model"
            gemini_contents.append(
                types.Content(role=role, parts=[types.Part.from_text(msg["content"])])
            )
            
    client = genai.Client(api_key=api_key)
    
    config = types.GenerateContentConfig(
        system_instruction=full_system,
        temperature=0.7,
        max_output_tokens=8192,
        thinking_config=types.ThinkingConfig(
            include_thoughts=True,
            thinking_budget=8000
        )
    )
    
    try:
        response_stream = await client.aio.models.generate_content_stream(
            model=MODEL_ID,
            contents=gemini_contents,
            config=config
        )
        
        async for chunk in response_stream:
            # The user explicitly asked to "only show draft content"
            # This means we filter out all 'thoughts' from the stream and only yield the final text
            if chunk.text:
                yield chunk.text
                
    except Exception as e:
        print(f"Gemini stream error: {e}")
        yield f"\n\n⚠️ Error: {str(e)}"
