from pydantic import BaseModel
from typing import List, Optional

class MonthlySearchVolume(BaseModel):
    month: str
    year: int
    count: int

class KeywordResult(BaseModel):
    text: str
    avg_monthly_volume: int
    competition: str
    cpc_cad: float
    difficulty: int
    priority: str
    strategic_flag: str
    history: List[MonthlySearchVolume]

class ResearchRequest(BaseModel):
    seed_keyword: str
    target_region: str = "Canada"
    layer: str = "Layer 1"
    limit: int = 20
    competition: str = "ALL"

class ResearchResponse(BaseModel):
    keywords: List[KeywordResult]

class AeoQuestion(BaseModel):
    question: str
    intent: str
    answer: str

class AeoEntityMapping(BaseModel):
    primary_entities: List[str]
    secondary_entities: List[str]
    tertiary_entities: List[str]
    same_as_links: List[str]

class AeoResult(BaseModel):
    keyword: str
    questions: List[AeoQuestion]
    entities: AeoEntityMapping
    opportunity_score: int

class AeoGenerateRequest(BaseModel):
    keywords: List[str]
