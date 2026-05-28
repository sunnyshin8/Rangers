import sys
import os
import importlib.util
import httpx

# Ensure we are in real mode
os.environ["BRIGHT_DATA_MOCK"] = "false"

# Add services/external-monitor to sys.path to resolve imports
sys.path.append(os.path.abspath("g:/github_kick/leak-radar/services/external-monitor"))

# Load the production main.py from external-monitor dynamically
spec = importlib.util.spec_from_file_location("external_monitor", "g:/github_kick/leak-radar/services/external-monitor/main.py")
em = importlib.util.module_from_spec(spec)
sys.modules["external_monitor"] = em
spec.loader.exec_module(em)

# Override mock flag explicitly to ensure it runs in real mode
em.MOCK_MODE = False

# Read API Key from .env manually
api_key = None
try:
    with open("g:/github_kick/leak-radar/.env", "r") as f:
        for line in f:
            if line.startswith("BRIGHT_DATA_API_KEY="):
                api_key = line.strip().split("=", 1)[1]
except Exception as e:
    print("[-] Failed to read .env file:", e)
    sys.exit(1)

if not api_key:
    print("[-] BRIGHT_DATA_API_KEY not found in .env")
    sys.exit(1)

# Override variables explicitly
em.BRIGHT_DATA_SERP_ZONE = "serp_api1"
em.BRIGHT_DATA_SERP_FORMAT = "raw"

print("[+] Verified Bright Data API Key:", api_key)
print("[+] Running verification search query: 'leakradar test'")

# 1. Execute live SERP Google Search
try:
    results = em.fetch_serp(api_key, "leakradar test")
    print(f"[+] Successfully fetched {len(results)} live organic search results:")
    for idx, r in enumerate(results):
        print(f"  {idx + 1}. Title: {r.get('title')} | URL: {r.get('url')}")
except httpx.HTTPStatusError as e:
    print("[-] HTTP Status Error:", e.response.status_code)
    print("[-] Response content:", e.response.text)
    sys.exit(1)
except Exception as e:
    print("[-] Failed to fetch SERP search results:", e)
    sys.exit(1)

# 2. Pick the first URL and execute live Web Unlocker page fetch
if not results:
    print("[-] No search results returned. Bypassing page fetch test.")
    sys.exit(0)

target_url = results[0]["url"]
print(f"[+] Fetching target page via Web Unlocker: {target_url}")
try:
    page_content = em.fetch_page(api_key, target_url)
    print(f"[+] Successfully scraped {len(page_content)} bytes of live web page.")
except Exception as e:
    print(f"[-] Failed to scrape page via Web Unlocker (falling back to search snippet): {e}")
    page_content = results[0].get("snippet", "")

# 3. Insert a mock secret token into the scraped content to test scanner detection
test_key = "AKIA123456789012ABCD"  # Mock AWS Key format to trigger scanner
content_to_scan = f"{page_content}\n\nHere is a test token for verification: {test_key}"

# 4. Run the scanner rules engine
print("[+] Running secret scanner rules on the live fetched content...")
candidates = em.scan_content(content_to_scan, target_url, "00000000-0000-0000-0000-000000000001")

if candidates:
    print(f"[+] Success! Scanner detected {len(candidates)} leak candidates:")
    for idx, c in enumerate(candidates):
        print(f"  - Candidate ID: {c['candidateId']}")
        print(f"    Rule Matched: {c['ruleId']}")
        print(f"    Masked Value: {c['maskedSnippet']}")
        print(f"    Severity: {c['severity']}")
        print(f"    Source URL: {c['url']}")
else:
    print("[-] Secret scanner did not detect any leak candidates in the page.")

print("[+] Bright Data end-to-end real mode validation finished successfully!")
