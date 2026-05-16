import sys

import requests
from bs4 import BeautifulSoup

URL = "https://quotes.toscrape.com/"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; scraper/1.0)"}


def scrape(url: str) -> list[dict[str, str]]:
    response = requests.get(url, headers=HEADERS, timeout=15)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")
    quotes = []
    for block in soup.select("div.quote"):
        text_el = block.select_one("span.text")
        author_el = block.select_one("small.author")
        if text_el and author_el:
            quotes.append({
                "text": text_el.get_text(strip=True),
                "author": author_el.get_text(strip=True),
            })
    return quotes


if __name__ == "__main__":
    target = sys.argv[1] if len(sys.argv) > 1 else URL
    try:
        results = scrape(target)
    except requests.RequestException as exc:
        print(f"Request failed: {exc}", file=sys.stderr)
        sys.exit(1)

    for i, item in enumerate(results, 1):
        print(f"{i}. {item['text']}")
        print(f"   — {item['author']}\n")

    print(f"Scraped {len(results)} items from {target}")
