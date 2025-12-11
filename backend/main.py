# backend/main.py
import json
from pathlib import Path
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()

BASE_DIR = Path(__file__).parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"
VERSIONS_DIR = BASE_DIR / "versions"

# Create versions dir safely
VERSIONS_DIR.mkdir(exist_ok=True)

# Always serve frontend if it exists
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True))
else:
    @app.get("/")
    async def fallback():
        return JSONResponse(
            status_code=500,
            content={"error": "Frontend missing", "frontend_path": str(FRONTEND_DIR)}
        )

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "frontend_exists": FRONTEND_DIR.exists(),
        "versions_writable": VERSIONS_DIR.exists()
    }

@app.get("/api/latest-version")
async def get_latest_version():
    try:
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
    except Exception as e:
        print(f"[ERROR] /api/latest-version: {e}")
        return {"exists": False}

@app.post("/api/save-version")
async def save_version(data: dict):
    try:
        draft_file = VERSIONS_DIR / "v0.json"
        with open(draft_file, "w") as f:
            json.dump(data, f, indent=2)
        return {"saved": True, "file": "v0.json"}
    except Exception as e:
        print(f"[ERROR] /api/save-version: {e}")
        raise HTTPException(status_code=500, detail="Save failed")

@app.post("/api/submit")
async def submit_final(data: dict):
    try:
        draft_file = VERSIONS_DIR / "v0.json"
        if not draft_file.exists():
            raise HTTPException(status_code=400, detail="No draft to submit")

        existing = [f for f in VERSIONS_DIR.glob("v*.json") if f.name != "v0.json"]
        nums = []
        for f in existing:
            try:
                nums.append(int(f.stem[1:]))
            except ValueError:
                continue
        next_ver = max(nums) + 1 if nums else 1
        final_version_file = VERSIONS_DIR / f"v{next_ver}.json"

        with open(final_version_file, "w") as f:
            json.dump(data, f, indent=2)
        draft_file.unlink(missing_ok=True)

        return {"status": "success", "version": next_ver}
    except Exception as e:
        print(f"[ERROR] /api/submit: {e}")
        raise HTTPException(status_code=500, detail="Submit failed")

@app.post("/api/reset")
async def reset_form():
    try:
        draft_file = VERSIONS_DIR / "v0.json"
        draft_file.unlink(missing_ok=True)
        return {"reset": True}
    except Exception as e:
        print(f"[ERROR] /api/reset: {e}")
        return {"reset": False}

# Serve static frontend
app.mount("/", StaticFiles(directory=BASE_DIR / "frontend", html=True), name="frontend")