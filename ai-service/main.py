from __future__ import annotations

import os
from pathlib import Path
import joblib
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pymongo import MongoClient

MODEL_PATH = Path(os.environ.get("MODEL_PATH", "models/sns_clf5.joblib"))
MONGO_URI = os.environ.get("MONGO_URI")

model = joblib.load(MODEL_PATH)["pipeline"]

mongo = MongoClient(MONGO_URI)
db = mongo["jearn"]
categories_coll = db["categories"]

app = FastAPI(title="JEARN AI Categorizer")


class PredictRequest(BaseModel):
    text: str
    topk: int = 10


def predict_labels(text: str, topk: int):
    probs = model.predict_proba([text])[0]
    classes = model.classes_
    top = sorted(zip(classes, probs), key=lambda x: x[1], reverse=True)[:topk]
    return [{"label": c, "score": float(p)} for c, p in top]


@app.post("/categorize")
def categorize(req: PredictRequest):
    try:
        preds = predict_labels(req.text, req.topk)

        # ---------------- RAW Confidence ----------------
        top_score = preds[0]["score"] if preds else 0
        second_score = preds[1]["score"] if len(preds) > 1 else 0
        gap = top_score - second_score

        uncertain = top_score < 0.25 or gap < 0.05
        print(f"📊 AI Confidence → top={top_score:.4f}, gap={gap:.4f}, uncertain={uncertain}")

        cats = list(categories_coll.find({}, {
            "_id": 1,
            "name": 1,
            "jname": 1,
            "myname": 1
        }))

        raw_scores = {p["label"].lower(): p["score"] for p in preds}

        enriched = []
        for cat in cats:
            key = cat["name"].lower()
            raw = float(raw_scores.get(key, 0))

            enriched.append({
                "id": str(cat["_id"]),
                "label": cat["name"],
                "jname": cat.get("jname"),
                "myname": cat.get("myname"),
                "rawScore": raw,  # ← TRUE probability for learning
                "score": raw,     # will normalize below
            })

        # ---------------- Normalize only for UI ----------------
        max_score = max([c["score"] for c in enriched]) or 1
        for c in enriched:
            c["score"] /= max_score

        enriched.sort(key=lambda x: x["score"], reverse=True)

        return {
            "uncertain": uncertain,
            "predictions": enriched
        }

    except Exception as exc:
        print("❌ AI error:", exc)
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/health")
def health():
    return {"status": "ok", "model": str(MODEL_PATH)}
