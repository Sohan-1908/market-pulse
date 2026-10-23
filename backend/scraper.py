from crewai.tools import BaseTool
from playwright.sync_api import sync_playwright
from pydantic import BaseModel, Field, PrivateAttr
from ddgs import DDGS


class ScraperInput(BaseModel):
    query: str = Field(
        ...,
        description="A web search query, OR a full URL (starting with http) to scrape. "
        "Only one string argument named 'query'.",
    )


class WebScraperTool(BaseTool):
    name: str = "WebScraperTool"
    description: str = (
        "Search the web or scrape a URL. Pass a search query to get result titles, "
        "URLs and snippets. Pass a full URL to read that page's text. "
        "Limited to 4 calls per task."
    )
    args_schema: type[BaseModel] = ScraperInput

    _calls: int = PrivateAttr(default=0)
    _seen: set = PrivateAttr(default_factory=set)
    _max_calls: int = PrivateAttr(default=4)

    def _search(self, query: str) -> str:
        try:
            results = DDGS().text(query, max_results=5)
        except Exception as e:
            return f"Search failed: {e}"
        if not results:
            return "No results found. Do not repeat this query; try a URL or give your final answer."
        out = [f"Search Results for '{query}':\n"]
        for r in results:
            out.append(f"Title: {r.get('title','')}\nURL: {r.get('href','')}\nSnippet: {r.get('body','')}\n")
        return "\n".join(out)

    def _scrape(self, url: str) -> str:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            try:
                page = browser.new_page()
                page.goto(url, timeout=15000)
                page.wait_for_load_state("domcontentloaded")

                # Remove menus, banners, footers, scripts before reading text
                page.evaluate("""() => document.querySelectorAll(
                    'nav, header, footer, aside, script, style, form, noscript,'
                    + '[role=banner], [role=navigation], [id*=cookie], [class*=cookie], [class*=consent]'
                ).forEach(e => e.remove())""")

                # Prefer the main article area; fall back to the whole body
                root = page.locator("article, main")
                text = (root.first if root.count() else page.locator("body")).inner_text()

                # Keep real sentences and data lines; drop short menu-style lines
                lines = [
                    l.strip() for l in text.split("\n")
                    if len(l.strip()) > 45 or any(c.isdigit() for c in l)
                ]
                cleaned = "\n".join(lines)
                return cleaned[:2000] or "Page had no readable text."
            except Exception as e:
                return f"Error scraping {url}: {e}"
            finally:
                browser.close()

    def _run(self, query: str) -> str:
        key = query.split("?")[0].strip().lower()
        if key in self._seen:
            return "Already retrieved this. Do not repeat it. Use a different source or write your final answer."
        if self._calls >= self._max_calls:
            return "Tool call limit reached. STOP using tools and write your final answer now."
        self._calls += 1
        self._seen.add(key)

        if query.startswith(("http://", "https://")):
            return self._scrape(query)
        return self._search(query)