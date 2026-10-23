import os
from datetime import date
from dotenv import load_dotenv

load_dotenv()

# Safely handle cache import across different CrewAI versions / LLM providers
try:
    import crewai.llms.cache as _cache
    _cache.mark_cache_breakpoint = lambda message: message
except (ImportError, ModuleNotFoundError, AttributeError):
    _cache = None

from crewai import Agent, Task, Crew, Process, LLM
from scraper import WebScraperTool


DEFAULT_MODEL = "openai/gpt-oss-120b"


class TextToolsLLM(LLM):
    """Use CrewAI's text-based tool calling. Groq's native tool API breaks gpt-oss."""

    def supports_function_calling(self) -> bool:
        return False


def make_llm(max_tokens: int):
    model = os.environ.get("GROQ_MODEL", DEFAULT_MODEL).strip().strip("\"'")
    model = model.removeprefix("groq/")
    extra = {}
    if "gpt-oss" in model:
        extra["reasoning_effort"] = "low"
    return TextToolsLLM(
        model=f"groq/{model}",
        api_key=os.environ.get("GROQ_API_KEY"),
        max_tokens=max_tokens,
        **extra,
    )


researcher_llm = make_llm(1000)
analyst_llm = make_llm(1000)
writer_llm = make_llm(1800)

NO_TOOLS = "You have NO tools. Do not call any tool or function. Respond with plain text only."

PLAIN_TEXT_RULES = (
    "Use only plain ASCII hyphens (-) and plain URLs or [1], [2] style citations. "
    "Do not use non-breaking hyphens, special bracket characters, or <angle-bracket> links. "
    "Every table row must have the same number of cells as its header."
)


def create_crew(topic: str, depth: str, focus: list, step_callback=None):
    # Fresh tool per run, so the 4-call limit resets every time
    scraper_tool = WebScraperTool()

    def cb(msg):
        return lambda step: step_callback(msg) if step_callback else None

    researcher = Agent(
        role='Senior Market Researcher',
        goal=f'Scrape the web to find accurate, up-to-date information about {topic}.',
        backstory='You are an expert market researcher. You excel at finding precise data from the web using advanced searches.',
        verbose=True,
        allow_delegation=False,
        tools=[scraper_tool],
        llm=researcher_llm,
        max_iter=10,
        step_callback=cb("Researcher Agent is gathering data..."),
    )

    analyst = Agent(
        role='Market Data Analyst',
        goal='Synthesize raw research data and verify facts.',
        backstory='You are a meticulous analyst. You strictly require inline citations (URLs) for every factual claim.',
        verbose=True,
        allow_delegation=False,
        llm=analyst_llm,
        step_callback=cb("Analyst Agent is synthesizing data..."),
    )

    writer = Agent(
        role='Professional Report Writer',
        goal='Structure the synthesized data into a polished, professional market report.',
        backstory='You write clear, well-structured executive reports (Executive Summary, Market Trends, etc.).',
        verbose=True,
        allow_delegation=False,
        llm=writer_llm,
        step_callback=cb("Writer Agent is writing the final report..."),
    )

    research_task = Task(
        description=f"""Conduct research on {topic}.
        Depth required: {depth}. Focus areas: {', '.join(focus) if focus else 'General market overview'}.
        Rely strictly on data from WebScraperTool. Use it at most 4 times, then STOP searching.
        Prefer pages that are specifically about {topic}; name specific companies where you find them.
        Final answer: a concise bullet summary of key facts (max 400 words), each bullet followed by
        its source URL. Do NOT paste raw page text.
        If you cannot find sufficient data, output 'Insufficient data.'""",
        expected_output="A concise bulleted summary (max 400 words) of facts, each with a source URL.",
        agent=researcher,
    )

    analysis_task = Task(
        description=f"""Analyze the research summary provided by the Researcher.
        Use ONLY facts explicitly stated in that summary. Do not add outside knowledge,
        estimates, or inferences. If something is missing, leave it out and list it under
        'Gaps in the data'. Cite every claim with its full URL.
        {PLAIN_TEXT_RULES}
        {NO_TOOLS}""",
        expected_output="A structured analysis with a full-URL citation for every claim, plus a 'Gaps in the data' section.",
        agent=analyst,
    )

    writing_task = Task(
        description=f"""Format the analyst's findings into a professional market report in Markdown.
        Today's date is {date.today():%B %d, %Y}; use it as the report date.
        Include sections: Executive Summary, Market Trends, Competitors, Risks & Opportunities,
        Gaps in the data. Use ONLY the analyst's facts, with inline full-URL citations
        (no 'Source 2' labels). Do not invent numbers, shares, or standards.
        {PLAIN_TEXT_RULES}
        {NO_TOOLS}""",
        expected_output="A fully formatted market report in Markdown.",
        agent=writer,
    )

    return Crew(
        agents=[researcher, analyst, writer],
        tasks=[research_task, analysis_task, writing_task],
        process=Process.sequential,
        max_rpm=2,
        verbose=True,
    )