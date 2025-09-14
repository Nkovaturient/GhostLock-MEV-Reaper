# app.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import os
import requests
import json

# Optional: import your local ML inference code if you have one
# from model_inference import predict_clearing_price

app = FastAPI()

AI_INFERENCE_URL = os.getenv("AI_INFERENCE_URL")  # external inference endpoint
CONF_THRESHOLD = float(os.getenv("AI_CONFIDENCE_THRESHOLD", 0.6))

class IntentFeature(BaseModel):
    side: int
    amount: str
    limitPrice: str
    marketId: int

class RequestPayload(BaseModel):
    intents: list[IntentFeature]
    referencePrice: str | None = None
    symbol: str
    timestamp: int

@app.post("/predict")
async def predict(payload: RequestPayload):
    # Option A: forward to external inference service if configured
    if AI_INFERENCE_URL:
        try:
            resp = requests.post(AI_INFERENCE_URL, json=payload.dict(), timeout=10)
            resp.raise_for_status()
            result = resp.json()
            if result.get('confidence', 0) < CONF_THRESHOLD:
                raise HTTPException(status_code=422, detail="Model confidence too low")
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"External model error: {str(e)}")

    # Option B: local inference (implement predict_clearing_price in model_inference.py)
    try:
        result = predict_clearing_price(payload.dict())
        if result['confidence'] < CONF_THRESHOLD:
            raise HTTPException(status_code=422, detail="Local model confidence too low")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Local model error: {str(e)}")
