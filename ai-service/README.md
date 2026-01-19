# SNS Text Classifier (sns_clf1) Service

Minimal FastAPI service that wraps the trained `sns_clf1.joblib` model.

## What's included
- `main.py`: FastAPI app with `/predict` and `/health` endpoints.
- `requirements.txt`: Runtime-only deps (FastAPI + scikit-learn + joblib).
- `Dockerfile`: Builds a lightweight image on `python:3.11-slim`.
- `models/sns_clf1.joblib`: Trained classifier bundle.

## Run locally
```bash
pip install --no-cache-dir -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
Send a request:
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "Your post text", "topk": 5}'
```

## Docker usage
```bash
docker build -t sns-clf1 .
docker run --rm -p 8000:8000 sns-clf1
# Optional: mount a different model at runtime
# docker run --rm -p 8000:8000 -v /path/to/models:/app/models -e MODEL_PATH=/app/models/sns_clf1.joblib sns-clf1
```

## Notes
- Model expects UTF-8 text; `topk` defaults to 5 and clamps to available classes.
- Keep `scikit-learn` aligned with the pinned version to avoid pickle compatibility issues.
