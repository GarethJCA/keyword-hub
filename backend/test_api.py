import sys
from google.ads.googleads.client import GoogleAdsClient

def main():
    config_path = "/Users/justinjones/KeywordResearch/google-ads.yaml"
    client = GoogleAdsClient.load_from_storage(config_path)
    
    # Try to make a simple request to KeywordPlanIdeaService
    keyword_plan_idea_service = client.get_service("KeywordPlanIdeaService")
    request = client.get_type("GenerateKeywordIdeasRequest")
    request.customer_id = "1537278337" # from yaml
    request.language = "languageConstants/1000"
    request.geo_target_constants.append("geoTargetConstants/2124")
    request.keyword_seed.keywords.append("Marketing Recruitment")
    
    try:
        response = keyword_plan_idea_service.generate_keyword_ideas(request=request)
        for result in response:
            metrics = result.keyword_idea_metrics
            print(f"Keyword: {result.text}")
            print(f"Volume: {metrics.avg_monthly_searches}")
            print(f"Competition: {metrics.competition}")
            print(f"CPC (micros): {metrics.average_cpc_micros}")
            for month in metrics.monthly_search_volumes:
                print(f"  {month.year}-{month.month.name}: {month.monthly_searches}")
            break
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
