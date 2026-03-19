import sys
from google.ads.googleads.client import GoogleAdsClient

def main():
    config_path = "/Users/justinjones/KeywordResearch/google-ads.yaml"
    client = GoogleAdsClient.load_from_storage(config_path)
    
    geo_target_constant_service = client.get_service("GeoTargetConstantService")
    query = """
    SELECT
      geo_target_constant.id,
      geo_target_constant.name,
      geo_target_constant.country_code,
      geo_target_constant.target_type,
      geo_target_constant.status
    FROM geo_target_constant
    WHERE geo_target_constant.name = 'Canada'
    """
    ga_service = client.get_service("GoogleAdsService")
    search_request = client.get_type("SearchGoogleAdsRequest")
    search_request.customer_id = "1537278337"
    search_request.query = query
    
    response = ga_service.search(request=search_request)
    for row in response:
        print(row)

if __name__ == "__main__":
    main()
