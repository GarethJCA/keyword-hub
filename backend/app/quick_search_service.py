import json
import re
import httpx

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-pro-preview"

# Geo target IDs — verified via Google Ads API
GEO_TARGETS = {
    # ── Countries ──
    "canada": "2124",
    "united states": "2840",
    "usa": "2840",

    # ── US States + DC ──
    "alabama": "21133",
    "alaska": "21132",
    "arizona": "21136",
    "arkansas": "21135",
    "california": "21137",
    "colorado": "21138",
    "connecticut": "21139",
    "delaware": "21141",
    "district of columbia": "21140",
    "florida": "21142",
    "georgia": "21143",
    "hawaii": "21144",
    "idaho": "21146",
    "illinois": "21147",
    "indiana": "21148",
    "iowa": "21145",
    "kansas": "21149",
    "kentucky": "21150",
    "louisiana": "21151",
    "maine": "21154",
    "maryland": "21153",
    "massachusetts": "21152",
    "michigan": "21155",
    "minnesota": "21156",
    "mississippi": "21158",
    "missouri": "21157",
    "montana": "21159",
    "nebraska": "21162",
    "nevada": "21166",
    "new hampshire": "21163",
    "new jersey": "21164",
    "new mexico": "21165",
    "new york state": "21167",
    "north carolina": "21160",
    "north dakota": "21161",
    "ohio": "21168",
    "oklahoma": "21169",
    "oregon": "21170",
    "pennsylvania": "21171",
    "rhode island": "21172",
    "south carolina": "21173",
    "south dakota": "21174",
    "tennessee": "21175",
    "texas": "21176",
    "utah": "21177",
    "vermont": "21179",
    "virginia": "21178",
    "washington state": "21180",
    "west virginia": "21183",
    "wisconsin": "21182",
    "wyoming": "21184",

    # ── Canadian Provinces ──
    "alberta": "20113",
    "british columbia": "20114",
    "manitoba": "20115",
    "new brunswick": "20116",
    "newfoundland and labrador": "20117",
    "nova scotia": "20118",
    "ontario": "20121",
    "prince edward island": "20122",
    "quebec": "20123",
    "saskatchewan": "20124",

    # ── Major US Cities (1M+ metro) ──
    "new york": "1023191",
    "new york city": "1023191",
    "los angeles": "1013962",
    "chicago": "1016367",
    "houston": "1026481",
    "phoenix": "1013462",
    "philadelphia": "1025197",
    "san antonio": "1026759",
    "san diego": "1014218",
    "dallas": "1026339",
    "san jose": "1014226",
    "austin": "1026201",
    "jacksonville": "1015067",
    "san francisco": "1014221",
    "columbus": "1023640",
    "charlotte": "1021048",
    "indianapolis": "1017146",
    "seattle": "1027744",
    "denver": "1014485",
    "nashville": "1026083",
    "detroit": "1019250",
    "memphis": "1026069",
    "boston": "1018127",
    "baltimore": "1018511",
    "atlanta": "1015254",
    "miami": "1015116",
    "minneapolis": "1019973",
    "tampa": "1015214",
    "las vegas": "1022639",
    "portland": "1024543",
    "sacramento": "1014208",
    "kansas city": "1017527",
    "pittsburgh": "1025202",
    "cincinnati": "1023626",
    "orlando": "1015150",
    "st. louis": "1020618",
    "cleveland": "1023631",
    "raleigh": "1021278",
    "milwaukee": "1028087",
    "salt lake city": "1026990",
    "washington dc": "1014895",

    # ── Major Canadian Cities (1M+ metro) ──
    "toronto": "1002451",
    "montreal": "1002604",
    "vancouver": "1001970",
    "calgary": "1001801",
    "edmonton": "1001808",
    "ottawa": "1002376",
    "winnipeg": "1002045",
    "hamilton": "1002287",
    "quebec city": "1002624",
}

EXTRACT_PROMPT = """You are a Google Ads Keyword Planner research assistant. The user will ask a natural language question. Your job is to think step-by-step to generate the BEST possible keyword seeds to query the Google Ads Keyword Planner API.

THINK LIKE THIS:
1. "What is the user REALLY asking?" - Identify the category, industry, or topic
2. "What are ALL the specific terms in this category that people would actually Google?" - Use YOUR OWN knowledge to brainstorm 15-20 specific, concrete terms
3. Output ONLY those terms as seeds

CRITICAL RULES:
- NEVER include the user's question as a seed. The question is NOT a keyword.
- NEVER include vague phrases like "most searched" or "popular" - those are NOT keywords people Google
- Each seed must be a SHORT phrase (1-4 words) that someone would actually type into Google Search
- Generate 15-20 seeds to get comprehensive coverage
- Think broadly - cover common AND niche variations in the category

EXAMPLES:

Question: "What is the most searched tax job title?"
Think: User wants to compare tax-related job titles by search volume. Let me list every tax job title I know.
{"seeds": ["tax analyst", "tax accountant", "tax manager", "tax preparer", "tax consultant", "tax specialist", "tax advisor", "tax associate", "tax director", "CPA", "tax attorney", "tax auditor", "tax examiner", "tax clerk", "senior tax analyst", "tax coordinator", "tax compliance", "payroll tax specialist", "international tax", "corporate tax manager"], "intent": "rank tax job titles by search volume"}

Question: "Which IT certification is most in demand?"
Think: User wants to compare IT certifications by search volume. Let me list popular IT certs.
{"seeds": ["AWS certification", "CompTIA A+", "CISSP", "PMP certification", "Azure certification", "Google Cloud certification", "CCNA", "CEH certification", "ITIL certification", "Scrum Master certification", "CompTIA Security+", "Kubernetes certification", "Oracle certification", "Salesforce certification", "data engineering certification"], "intent": "rank IT certifications by search volume"}

Question: "What healthcare roles are trending?"
Think: User wants to see which healthcare job titles have high or growing search volume. Let me list healthcare roles.
{"seeds": ["registered nurse", "nurse practitioner", "physician assistant", "medical assistant", "dental hygienist", "pharmacist", "physical therapist", "occupational therapist", "respiratory therapist", "lab technician", "radiology technician", "home health aide", "EMT", "paramedic", "surgical technologist", "healthcare administrator", "medical coder", "clinical research associate", "dietitian", "speech pathologist"], "intent": "rank healthcare roles by search volume trends"}

Return ONLY the JSON object. No markdown, no code fences, no explanation, no "Think:" text in the output."""

SUMMARIZE_PROMPT = """You are a keyword research analyst presenting Google Ads Keyword Planner results. The user asked a question and we queried the API with multiple seed phrases. Below are the REAL results sorted by search volume.

Your job is to DIRECTLY ANSWER the user's question using this data.

Rules:
- Lead with the clear answer (e.g. "**Tax Analyst** is the most searched tax job title in Canada")
- Show a ranked top-5 list with: search volume, competition level, and CPC
- If a specific month was requested, highlight that month's data specifically
- Mention the location context
- Add one brief insight (e.g. opportunity, trend, cost comparison)
- Keep it under 150 words, punchy and useful
- Use **bold** for the top keyword and key numbers
- If most results show zero volume, acknowledge it and suggest the data may be limited for that niche/region

Format as clean markdown."""


async def extract_seeds(api_key: str, question: str) -> dict:
    """Use Gemini to extract keyword seeds from a natural language question."""
    url = f"{GEMINI_API_URL}:generateContent?key={api_key}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": f'{EXTRACT_PROMPT}\n\nQuestion: "{question}"'}]}],
        "generationConfig": {"temperature": 0.3, "maxOutputTokens": 1024}
    }
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code != 200:
            print(f"Gemini extract error: {resp.status_code} - {resp.text}")
            return {"seeds": [], "intent": question}
        
        data = resp.json()
        try:
            text = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            print(f"Quick Search: Unexpected Gemini response: {json.dumps(data)[:300]}")
            return {"seeds": [], "intent": question}
        
        text = text.strip()
        print(f"Quick Search: Raw Gemini extraction response: {text[:500]}")
        
        # Strategy 1: Try direct JSON parse
        try:
            result = json.loads(text)
            seeds = _validate_seeds(result.get("seeds", []), question)
            if seeds:
                print(f"Quick Search: Direct parse OK → {len(seeds)} seeds: {seeds[:5]}...")
                return {"seeds": seeds, "intent": result.get("intent", question)}
        except json.JSONDecodeError:
            pass
        
        # Strategy 2: Extract JSON from markdown fences or surrounding text
        json_match = re.search(r'\{[^{}]*"seeds"\s*:\s*\[.*?\][^{}]*\}', text, re.DOTALL)
        if json_match:
            try:
                result = json.loads(json_match.group(0))
                seeds = _validate_seeds(result.get("seeds", []), question)
                if seeds:
                    print(f"Quick Search: Regex extract OK → {len(seeds)} seeds: {seeds[:5]}...")
                    return {"seeds": seeds, "intent": result.get("intent", question)}
            except json.JSONDecodeError:
                pass
        
        # Strategy 3: Extract just the array
        array_match = re.search(r'"seeds"\s*:\s*\[([^\]]+)\]', text)
        if array_match:
            try:
                seeds_raw = json.loads(f"[{array_match.group(1)}]")
                seeds = _validate_seeds(seeds_raw, question)
                if seeds:
                    print(f"Quick Search: Array extract OK → {len(seeds)} seeds")
                    return {"seeds": seeds, "intent": question}
            except json.JSONDecodeError:
                pass
        
        print(f"Quick Search: ALL extraction strategies failed for '{question}'")
        return {"seeds": [], "intent": question}


def _validate_seeds(seeds: list, question: str) -> list:
    """Filter out bad seeds — questions, long phrases, or the literal user question."""
    question_lower = question.lower().strip().rstrip("?")
    valid = []
    for s in seeds:
        if not isinstance(s, str):
            continue
        s = s.strip()
        if not s:
            continue
        # Reject if it's too long (more than 5 words)
        if len(s.split()) > 5:
            continue
        # Reject if it contains a question mark
        if "?" in s:
            continue
        # Reject if it's basically the user's question
        if s.lower().strip() == question_lower:
            continue
        # Reject vague meta-phrases
        if any(bad in s.lower() for bad in ["most searched", "most popular", "highest volume", "trending"]):
            continue
        valid.append(s)
    return valid


async def query_google_ads(google_ads_service, seeds: list[str], location_id: str = "2124"):
    """Query Google Ads API for each seed keyword and collect results."""
    if not seeds:
        return []
    
    all_results = []
    comp_map = {2: "LOW", 3: "MEDIUM", 4: "HIGH"}
    
    keyword_plan_idea_service = google_ads_service.client.get_service("KeywordPlanIdeaService")
    
    for seed in seeds:
        request = google_ads_service.client.get_type("GenerateKeywordIdeasRequest")
        request.customer_id = google_ads_service.customer_id
        request.language = "languageConstants/1000"
        if location_id:
            request.geo_target_constants.append(f"geoTargetConstants/{location_id}")
        request.keyword_seed.keywords.append(seed)
        
        try:
            response = keyword_plan_idea_service.generate_keyword_ideas(request=request)
            for result in response:
                metrics = result.keyword_idea_metrics
                vol = metrics.avg_monthly_searches or 0
                comp = comp_map.get(metrics.competition, "UNKNOWN")
                cpc = round((metrics.average_cpc_micros / 1_000_000) if metrics.average_cpc_micros else 0.0, 2)
                
                monthly = []
                for m in metrics.monthly_search_volumes:
                    monthly.append({
                        "month": m.month.name,
                        "year": m.year,
                        "searches": m.monthly_searches or 0
                    })
                
                all_results.append({
                    "keyword": result.text,
                    "avg_monthly_volume": vol,
                    "competition": comp,
                    "cpc_cad": cpc,
                    "monthly_data": monthly
                })
        except Exception as e:
            print(f"Google Ads error for seed '{seed}': {e}")
    
    # Deduplicate by keyword text and sort by volume
    seen = set()
    unique = []
    for r in all_results:
        if r["keyword"] not in seen:
            seen.add(r["keyword"])
            unique.append(r)
    unique.sort(key=lambda x: x["avg_monthly_volume"], reverse=True)
    
    print(f"Quick Search: Google Ads returned {len(unique)} unique results from {len(seeds)} seeds")
    return unique[:30]  # Cap at 30 results to keep context manageable


async def stream_summary(api_key: str, question: str, results: list[dict], month_filter: str = None, year_filter: int = None, location: str = None):
    """Stream Gemini's summary of the API results."""
    # Build context string from results
    if not results:
        results_text = "No results were returned from the API."
    else:
        lines = []
        for i, r in enumerate(results):
            line = f"{i+1}. **{r['keyword']}**: {r['avg_monthly_volume']} avg monthly searches, {r['competition']} competition, ${r['cpc_cad']} CPC"
            if month_filter and r.get("monthly_data"):
                for m in r["monthly_data"]:
                    if m["month"].startswith(month_filter.upper()[:3]) and (not year_filter or m["year"] == year_filter):
                        line += f" | {m['month']} {m['year']}: {m['searches']} searches"
            lines.append(line)
        results_text = "\n".join(lines)
    
    filters_text = ""
    if month_filter:
        filters_text += f"\nMonth filter: {month_filter}"
    if year_filter:
        filters_text += f" {year_filter}"
    if location:
        filters_text += f"\nLocation: {location}"
    
    user_message = f"""Original question: {question}{filters_text}

API Results (sorted by search volume, highest first):
{results_text}"""
    
    url = f"{GEMINI_API_URL}:streamGenerateContent?alt=sse&key={api_key}"
    payload = {
        "contents": [{"role": "user", "parts": [{"text": f"{SUMMARIZE_PROMPT}\n\n{user_message}"}]}],
        "generationConfig": {"temperature": 0.5, "maxOutputTokens": 2048}
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    error_body = await response.aread()
                    print(f"Gemini summary error: {response.status_code} - {error_body.decode()}")
                    yield f"⚠️ API error {response.status_code}. Please check your Gemini API key."
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
            yield "\n\n⚠️ Request timed out. Please try again."
        except Exception as e:
            print(f"Gemini stream error: {e}")
            yield f"\n\n⚠️ Error: {str(e)}"


def resolve_location(location_str: str) -> tuple[str, str]:
    """Resolve a location string to a geo target ID and display name."""
    if not location_str:
        return "2124", "Canada"
    
    location_lower = location_str.strip().lower()
    
    # Priority 1: Exact match
    if location_lower in GEO_TARGETS:
        geo_id = GEO_TARGETS[location_lower]
        print(f"Quick Search: Location '{location_str}' → exact match → geo ID {geo_id}")
        return geo_id, location_str.strip().title()
    
    # Priority 2: Longer keys first (so "united states" matches before "us")
    sorted_keys = sorted(GEO_TARGETS.keys(), key=len, reverse=True)
    for key in sorted_keys:
        if key in location_lower:
            geo_id = GEO_TARGETS[key]
            print(f"Quick Search: Location '{location_str}' → substring match '{key}' → geo ID {geo_id}")
            return geo_id, key.title()
    
    # Default to Canada
    print(f"Quick Search: Location '{location_str}' → no match, defaulting to Canada")
    return "2124", "Canada"

