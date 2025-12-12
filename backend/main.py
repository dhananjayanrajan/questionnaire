import os
import json
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

app = FastAPI()

BASE_DIR = Path(__file__).parent.parent
VERSIONS_DIR = BASE_DIR / "versions"
VERSIONS_DIR.mkdir(exist_ok=True)

@app.get("/api/latest-version")
async def get_latest_version():
    version_files = sorted(VERSIONS_DIR.glob("v*.json"), key=lambda x: int(x.stem[1:]), reverse=True)
    if not version_files:
        return {"exists": False}
    latest = version_files[0]
    data = json.loads(latest.read_text())
    return {
        "exists": True,
        "version_file": latest.name,
        "data": data,
        "last_modified": datetime.fromtimestamp(latest.stat().st_mtime).isoformat()
    }

@app.post("/api/save-version")
async def save_version(data: dict):
    # Use v0.json as working draft
    draft_file = VERSIONS_DIR / "v0.json"
    with open(draft_file, "w") as f:
        json.dump(data, f, indent=2)
    return {"saved": True, "file": "v0.json"}

@app.post("/api/submit")
async def submit_final(data: dict):
    # Finalize: rename v0.json to next version
    draft_file = VERSIONS_DIR / "v0.json"
    if not draft_file.exists():
        raise HTTPException(status_code=400, detail="No draft to submit")

    # Get next version number
    existing = [f for f in VERSIONS_DIR.glob("v*.json") if f.name != "v0.json"]
    nums = []
    for f in existing:
        try:
            nums.append(int(f.stem[1:]))
        except ValueError:
            continue
    next_ver = max(nums) + 1 if nums else 1
    final_version_file = VERSIONS_DIR / f"v{next_ver}.json"
    
    # Save finalized version
    with open(final_version_file, "w") as f:
        json.dump(data, f, indent=2)
    draft_file.unlink(missing_ok=True)

    # Copy to Downloads
    downloads = Path.home() / "Downloads"
    if not downloads.exists():
        downloads = Path("C:/Downloads")
    downloads.mkdir(exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    download_file = downloads / f"questionnaire_response_{timestamp}.json"
    with open(download_file, "w") as f:
        json.dump(data, f, indent=2)

    return {"status": "success", "version": next_ver, "download": str(download_file)}

@app.post("/api/reset")
async def reset_form():
    draft_file = VERSIONS_DIR / "v0.json"
    draft_file.unlink(missing_ok=True)
    return {"reset": True}

# Serve frontend
app.mount("/", StaticFiles(directory=BASE_DIR / "frontend", html=True), name="frontend")