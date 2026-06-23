import os
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import decision

app = FastAPI()

API_KEY = os.environ.get("BRAIN_API_KEY", None)

class ShopOffer(BaseModel):
    shop_index: int
    card_id: str
    cost: int

class OwnedCard(BaseModel):
    owned_index: int
    card_id: str
    location: str

class MemorySlot(BaseModel):
    base_card_id: str
    count: int

class ShopRequest(BaseModel):
    version: str
    player_id: str
    credits: int
    archetype: str
    win_count: int
    fan_count: int
    shop_offers: list[ShopOffer]
    owned_cards: list[OwnedCard]
    memory_slots: Optional[list[MemorySlot]] = []

class ShopResponse(BaseModel):
    version: str
    action: str  # "buy", "reroll", "delete", "skip"
    card_index: Optional[int] = None
    reason: Optional[str] = None

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if API_KEY:
        if request.headers.get("X-API-Key") != API_KEY:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Invalid API key"}
            )
    response = await call_next(request)
    return response

@app.post("/api/v1/shop-decision", response_model=ShopResponse)
async def shop_decision(req: ShopRequest):
    if req.version != "1.0":
        raise HTTPException(status_code=400, detail="Unsupported version")
    result = decision.decide(req.model_dump())
    return ShopResponse(**result)
