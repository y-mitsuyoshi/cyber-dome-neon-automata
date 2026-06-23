import os
from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from decision import decide

app = FastAPI(title="Brain Server", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BRAIN_API_KEY = os.environ.get("BRAIN_API_KEY", "")

async def verify_api_key(request: Request):
    if BRAIN_API_KEY:
        key = request.headers.get("X-API-Key", "")
        if key != BRAIN_API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")

class MemorySlot(BaseModel):
    base_card_id: str
    count: int

class ShopOffer(BaseModel):
    shop_index: int
    card_id: str
    cost: int

class OwnedCard(BaseModel):
    owned_index: int
    card_id: str
    location: str

class ShopRequest(BaseModel):
    version: str = "1.0"
    player_id: str = ""
    credits: int = 0
    archetype: str = "combo"
    win_count: int = 0
    fan_count: int = 0
    shop_offers: List[ShopOffer] = []
    owned_cards: List[OwnedCard] = []
    memory_slots: Optional[List[MemorySlot]] = None

class ShopResponse(BaseModel):
    version: str = "1.0"
    action: str = "skip"
    card_index: Optional[int] = None
    reason: Optional[str] = None

@app.post("/api/v1/shop-decision", dependencies=[Depends(verify_api_key)])
async def shop_decision(request: ShopRequest):
    if request.version not in ("1.0",):
        raise HTTPException(status_code=400, detail=f"Unsupported version: {request.version}")
    result = decide(request)
    return result
