import os
from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from decision import decide

app = FastAPI(title="Cyber-Dome Brain Server", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------
API_KEY = os.environ.get("BRAIN_API_KEY", None)

async def verify_api_key(request: Request):
    if API_KEY:
        key = request.headers.get("X-API-Key")
        if key != API_KEY:
            raise HTTPException(status_code=401, detail="Invalid API key")
    return True

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

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
    version: str = "1.0"
    player_id: str
    credits: int
    archetype: str
    win_count: int
    fan_count: int
    shop_offers: list[ShopOffer] = []
    owned_cards: list[OwnedCard] = []
    memory_slots: list[MemorySlot] = []

class ShopResponse(BaseModel):
    version: str = "1.0"
    action: str
    card_index: Optional[int] = None
    reason: str = ""

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/v1/shop-decision", dependencies=[Depends(verify_api_key)])
async def shop_decision(req: ShopRequest) -> ShopResponse:
    # Validate version
    if req.version != "1.0":
        raise HTTPException(status_code=400, detail=f"Unsupported version: {req.version}. Expected 1.0")

    response = decide(req)
    response.version = "1.0"
    return response


@app.get("/health")
async def health():
    return {"status": "ok", "version": "1.0"}
