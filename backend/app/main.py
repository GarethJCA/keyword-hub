from fastapi import FastAPI, Depends, Request, Response
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import Optional
from typing import Optional
from dotenv import load_dotenv
import os
import base64
from .models import ResearchRequest, ResearchResponse, AeoGenerateRequest
from .google_ads_service import get_service, GoogleAdsService
from .gemini_service import stream_chat
from .quick_search_service import extract_seeds, query_google_ads, stream_summary, resolve_location
from .aeo_service import process_aeo_batch

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), "../../.env"))

app = FastAPI(title="Keyword Research Dashboard API")

# Load API key from environment
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")

@app.middleware("http")
async def basic_auth(request: Request, call_next):
    app_password = os.environ.get("APP_PASSWORD")
    if not app_password:
        return await call_next(request)
    
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Basic "):
        encoded = auth_header.split(" ", 1)[1]
        try:
            decoded = base64.b64decode(encoded).decode("utf-8")
            if ":" in decoded:
                user, pwd = decoded.split(":", 1)
                if pwd == app_password:
                    return await call_next(request)
        except Exception:
            pass
            
    return Response(
        status_code=401,
        headers={"WWW-Authenticate": 'Basic realm="Keyword Hub Secure Area"'},
        content="Unauthorized"
    )


class ChatRequest(BaseModel):
    keywords: list[str]
    messages: list[dict]
    layer: str = "Layer 1"


class QuickSearchRequest(BaseModel):
    question: str
    location: Optional[str] = "Canada"
    month: Optional[str] = None
    year: Optional[int] = None


class ApiKeyUpdate(BaseModel):
    api_key: str


@app.post("/api/set-api-key")
async def set_api_key(body: ApiKeyUpdate):
    global GEMINI_API_KEY
    GEMINI_API_KEY = body.api_key
    return {"message": "API key set successfully"}


@app.get("/api/has-api-key")
async def has_api_key():
    return {"has_key": bool(GEMINI_API_KEY)}


@app.post("/api/research", response_model=ResearchResponse)
async def research(request: ResearchRequest, service: GoogleAdsService = Depends(get_service)):
    keywords = service.get_keyword_ideas(request.seed_keyword, request.limit, request.competition)
    return ResearchResponse(keywords=keywords)


@app.post("/api/chat")
async def chat(request: ChatRequest):
    if not GEMINI_API_KEY:
        return {"error": "Gemini API key not set. Please set it in the settings panel."}

    async def generate():
        async for chunk in stream_chat(GEMINI_API_KEY, request.keywords, request.messages, request.layer):
            yield chunk

    return StreamingResponse(generate(), media_type="text/plain")


@app.post("/api/quick-search")
async def quick_search(request: QuickSearchRequest, service: GoogleAdsService = Depends(get_service)):
    if not GEMINI_API_KEY:
        return {"error": "Gemini API key not set. Please set it via the SEO Draft Assistant first."}

    # Step 1: Resolve location
    geo_id, location_name = resolve_location(request.location)

    # Step 2: Gemini extracts keyword seeds from the question
    extraction = await extract_seeds(GEMINI_API_KEY, request.question)
    seeds = extraction.get("seeds", [request.question])

    # Step 3: Query Google Ads API with seeds
    results = await query_google_ads(service, seeds, location_id=geo_id)

    # Step 4: Stream Gemini summary
    async def generate():
        async for chunk in stream_summary(
            GEMINI_API_KEY, request.question, results,
            month_filter=request.month, year_filter=request.year,
            location=location_name
        ):
            yield chunk

    return StreamingResponse(generate(), media_type="text/plain")

@app.post("/api/aeo-generate")
async def aeo_generate(request: AeoGenerateRequest):
    if not GEMINI_API_KEY:
        return {"error": "Gemini API key not set. Please set it in the settings panel."}
    
    results = await process_aeo_batch(GEMINI_API_KEY, request.keywords)
    return {"results": results}

# Serve React Frontend (All-in-One Deployment)
dist_path = os.path.join(os.path.dirname(__file__), "../../frontend/dist")
os.makedirs(dist_path, exist_ok=True)
app.mount("/", StaticFiles(directory=dist_path, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
