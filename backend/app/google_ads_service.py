import os
import yaml
from google.ads.googleads.client import GoogleAdsClient
from .models import KeywordResult, MonthlySearchVolume
from typing import List

class GoogleAdsService:
    def __init__(self, config_dict: dict = None, config_path: str = None):
        if config_dict:
            self.client = GoogleAdsClient.load_from_dict(config_dict)
            self.customer_id = str(config_dict.get("login_customer_id", ""))
        elif config_path:
            self.client = GoogleAdsClient.load_from_storage(config_path)
            with open(config_path, "r") as f:
                config = yaml.safe_load(f)
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
        # Method 1: Individual environment variables (simplest for Cloud Run)
        dev_token = os.environ.get("GOOGLE_ADS_DEVELOPER_TOKEN")
        if dev_token:
            config_dict = {
                "developer_token": dev_token,
                "client_id": os.environ.get("GOOGLE_ADS_CLIENT_ID", ""),
                "client_secret": os.environ.get("GOOGLE_ADS_CLIENT_SECRET", ""),
                "refresh_token": os.environ.get("GOOGLE_ADS_REFRESH_TOKEN", ""),
                "login_customer_id": os.environ.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID", ""),
                "use_proto_plus": True,
            }
            service = GoogleAdsService(config_dict=config_dict)
        else:
            # Method 2: Local development file
            config_path = os.path.join(os.path.dirname(__file__), "../../google-ads.yaml")
            service = GoogleAdsService(config_path=config_path)
    return service
