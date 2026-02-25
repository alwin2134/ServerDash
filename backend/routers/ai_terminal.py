"""
ServerDash — AI Terminal Intelligence Router.
Provides endpoints to generate shell commands from natural language and explain terminal errors.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import httpx
from config import GEMINI_API_KEY
from auth import require_api_key

router = APIRouter(prefix="/api/ai/terminal", tags=["ai-terminal"])


class GenerateRequest(BaseModel):
    prompt: str
    os_info: str = "Linux"


class ExplainRequest(BaseModel):
    command: str
    stdout: str
    stderr: str
    exit_code: int
    os_info: str = "Linux"


async def call_gemini(prompt: str) -> str:
    """Call Google Gemini API via REST without requiring heavy SDKs."""
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="GEMINI_API_KEY is not configured on the server. Please set it in your environment."
        )

    # Use a fast standard model
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2, # Keep hallucination down for terminal commands
        }
    }

    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(url, json=payload, timeout=15.0)
            resp.raise_for_status()
            data = resp.json()
            return data["candidates"][0]["content"]["parts"][0]["text"].strip()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"AI generation failed: {str(e)}")


@router.post("/generate")
async def generate_command(req: GenerateRequest, _key=Depends(require_api_key)):
    """Generate a valid shell command based on natural language."""
    system_prompt = f"""
You are an expert sysadmin. The user will ask how to perform a task on a {req.os_info} server.
Return ONLY the exact raw terminal/shell command needed to safely accomplish this.
No markdown, no backticks, no explanation, only the literal command string.
If the request is dangerous (like rm -rf /), return: echo 'Command blocked for safety.'
User Request: {req.prompt}
"""
    cmd = await call_gemini(system_prompt)
    # Post-process: strip markdown if the LLM leaked some
    if cmd.startswith("```"):
        cmd = cmd.split("\n", 1)[-1].rsplit("\n", 1)[0]
    return {"command": cmd.strip()}


@router.post("/explain")
async def explain_output(req: ExplainRequest, _key=Depends(require_api_key)):
    """Explain a terminal output/error and suggest a fix."""
    system_prompt = f"""
You are an expert sysadmin diagnosing a failed terminal execution on a {req.os_info} server.

Command Executed: {req.command}
Exit Code: {req.exit_code}
STDOUT:
{req.stdout[:1000]}

STDERR:
{req.stderr[:1000]}

Provide a concise, human-readable explanation of why this command failed and EXACTLY what the user should do to fix it. Keep it under 4 paragraphs. Use simple formatting.
"""
    explanation = await call_gemini(system_prompt)
    return {"explanation": explanation}
