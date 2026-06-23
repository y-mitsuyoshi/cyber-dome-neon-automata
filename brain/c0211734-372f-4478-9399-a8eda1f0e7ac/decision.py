from typing import Optional
from pydantic import BaseModel

class ShopRequest(BaseModel):
    player_id: str = ""
    credits: int = 0
    archetype: str = "combo"
    win_count: int = 0
    fan_count: int = 0
    shop_offers: list = []
    owned_cards: list = []
    memory_slots: Optional[list] = None

    class Config:
        extra = "allow"

class ShopResponse(BaseModel):
    version: str = "1.0"
    action: str = "skip"
    card_index: Optional[int] = None
    reason: Optional[str] = None

def decide(request: ShopRequest) -> ShopResponse:
    # Rule-based decision logic
    # If there's an affordable card, buy the first one
    for offer in request.shop_offers:
        if offer.cost <= request.credits:
            return ShopResponse(
                action="buy",
                card_index=offer.shop_index,
                reason="affordable card found"
            )
    # If no affordable card and we can reroll, do so
    if request.credits >= 1:
        return ShopResponse(action="reroll", reason="no affordable card")
    # Otherwise skip
    return ShopResponse(action="skip", reason="insufficient credits")
