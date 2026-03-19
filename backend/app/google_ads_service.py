import os
import yaml
from google.ads.googleads.client import GoogleAdsClient
from .models import KeywordResult, MonthlySearchVolume
from typing import List

class GoogleAdsService:
    def __init__(self, config_path: str):
        self.client = GoogleAdsClient.load_from_storage(config_path)
        with open(config_path, "r") as f:
            config = yaml.safe_load(f)
            # Find the primary customer ID from the yaml or use a default
            # For simplicity, we assume login_customer_id is the one to use for queries
            self.customer_id = str(config.get("login_customer_id", ""))

    def get_keyword_ideas(self, seed_keyword: str, limit: int = 20, competition: str = "ALL", location_id: str = "2124") -> List[KeywordResult]:
        keyword_plan_idea_service = self.client.get_service("KeywordPlanIdeaService")
        request = self.client.get_type("GenerateKeywordIdeasRequest")
        request.customer_id = self.customer_id
        
        request.language = "languageConstants/1000"
        if location_id:
            request.geo_target_constants.append(f"geoTargetConstants/{location_id}")
            
        request.keyword_seed.keywords.append(seed_keyword)
        
        comp_map = {
            2: "LOW",
            3: "MEDIUM",
            4: "HIGH"
        }

        try:
            response = keyword_plan_idea_service.generate_keyword_ideas(request=request)
        except Exception as e:
            print(f"Error fetching from Google Ads: {e}")
            return []

        mock_keywords = []
        for result in response:
            metrics = result.keyword_idea_metrics
            vol = metrics.avg_monthly_searches if metrics.avg_monthly_searches else 0
            
            # Map competition enum to string
            comp_level = comp_map.get(metrics.competition, "UNKNOWN")
            
            # Optional filter by competition
            if competition != "ALL" and comp_level != competition.upper():
                continue
                
            cpc = (metrics.average_cpc_micros / 1000000.0) if metrics.average_cpc_micros else 0.0
            
            # Difficulty is not a native Google Ads metric, we'll estimate it based on competition & volume
            # Google Ads Competition is 1-100 indexed within the API in newer versions, but we'll use a simple heuristic
            diff = 50
            if comp_level == "HIGH": diff = 80
            elif comp_level == "MEDIUM": diff = 50
            elif comp_level == "LOW": diff = 20
            
            history = []
            for m in metrics.monthly_search_volumes:
                history.append(MonthlySearchVolume(
                    month=m.month.name[:3].capitalize(),
                    year=m.year,
                    count=m.monthly_searches if m.monthly_searches else 0
                ))
            
            priority, flag = self._classify(vol, diff, cpc)
            
            mock_keywords.append(KeywordResult(
                text=result.text,
                avg_monthly_volume=vol,
                competition=comp_level,
                cpc_cad=round(cpc, 2),
                difficulty=diff,
                priority=priority,
                strategic_flag=flag,
                history=history
            ))
            
            if len(mock_keywords) >= limit:
                break

        return mock_keywords

    def _classify(self, vol: int, diff: int, cpc: float):
        if vol > 1000 and diff > 70:
            return "P3", "Long-Term Target"
        if vol < 500 and diff < 40:
            return "P1", "Quick Win"
        if cpc > 8.00 and diff < 55:
            return "P1", "Quick Win"
        return "P2", "Standard"

# Singleton instance for the app
service = None

def get_service():
    global service
    if service is None:
        config_path = os.path.join(os.path.dirname(__file__), "../../google-ads.yaml")
        # In a real environment, we'd initialize the client normally.
        # Here we'll handle the case where the file might not be perfectly formatted or accessible.
        service = GoogleAdsService(config_path)
    return service
