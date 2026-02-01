from __future__ import annotations

import os
import sys
from pathlib import Path
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pymongo import MongoClient

# -------------------------------------------------
# PATH FIX (IMPORTANT)
# -------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent
SRC_DIR = BASE_DIR / "src"

if SRC_DIR.exists():
    sys.path.insert(0, str(SRC_DIR))

# -------------------------------------------------
# Config
# -------------------------------------------------

MODEL_PATH = Path(os.environ.get("MODEL_PATH", "models/sns_clf5.joblib"))
MONGO_URI = os.environ.get("MONGO_URI")

if not MODEL_PATH.exists():
    raise RuntimeError(f"Model not found at {MODEL_PATH}")

if not MONGO_URI:
    raise RuntimeError("MONGO_URI is not set")

# -------------------------------------------------
# Load model
# -------------------------------------------------

bundle = joblib.load(MODEL_PATH)
model = bundle["pipeline"]

print("Loaded model classes:", list(model.classes_))

# -------------------------------------------------
# Mongo
# -------------------------------------------------

mongo = MongoClient(MONGO_URI)
db = mongo["jearn"]
categories_coll = db["categories"]

# -------------------------------------------------
# FastAPI
# -------------------------------------------------

app = FastAPI(title="JEARN AI Categorizer")

# -------------------------------------------------
# Schemas
# -------------------------------------------------

class PredictRequest(BaseModel):
    text: str
    topk: int = 10

# -------------------------------------------------
# Core logic
# -------------------------------------------------

def predict_labels(text: str, topk: int):
    probs = model.predict_proba([text])[0]
    classes = model.classes_

    ranked = sorted(
        zip(classes, probs),
        key=lambda x: x[1],
        reverse=True
    )[:topk]

    return [
        {"label": label, "score": float(score)}
        for label, score in ranked
    ]

# -------------------------------------------------
# Routes
# -------------------------------------------------

@app.post("/categorize")
def categorize(req: PredictRequest):
    try:
        if not req.text.strip():
            raise HTTPException(status_code=400, detail="Text is empty")

        preds = predict_labels(req.text, req.topk)

        top_score = preds[0]["score"] if preds else 0.0
        second_score = preds[1]["score"] if len(preds) > 1 else 0.0
        gap = top_score - second_score

        uncertain = top_score < 0.25 or gap < 0.05

        cats = list(
            categories_coll.find(
                {},
                {"_id": 1, "name": 1, "jname": 1, "myname": 1}
            )
        )

        raw_scores = {
            p["label"].lower(): p["score"]
            for p in preds
        }

        enriched = []
        for cat in cats:
            key = cat["name"].lower()
            raw = float(raw_scores.get(key, 0.0))

            enriched.append({
                "id": str(cat["_id"]),
                "label": cat["name"],
                "jname": cat.get("jname"),
                "myname": cat.get("myname"),
                "rawScore": raw,
                "score": raw,
            })

        max_score = max((c["score"] for c in enriched), default=0.0) or 1.0
        for c in enriched:
            c["score"] /= max_score

        enriched.sort(key=lambda x: x["score"], reverse=True)

        return {
            "uncertain": uncertain,
            "predictions": enriched,
        }

    except HTTPException:
        raise
    except Exception as exc:
        print("AI error:", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/health")
def health():
    return {
        "status": "ok",
        "model": str(MODEL_PATH),
        "classes": list(model.classes_),
    }
