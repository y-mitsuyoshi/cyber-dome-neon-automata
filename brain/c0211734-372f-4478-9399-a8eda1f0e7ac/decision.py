"""Rule-based decision engine for NPC shop actions."""

from typing import Optional
from pydantic import BaseModel

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
    memory_slots: list[MemorySlot]

class ShopResponse(BaseModel):
    version: str = "1.0"
    action: str
    card_index: Optional[int] = None
    reason: str = ""


def decide(req: ShopRequest) -> ShopResponse:
    """
    Return a shop decision based on simple heuristics.
    Later this can be replaced with an ML model.
    """
    # Default: skip
    best_action = "skip"
    best_index = None
    best_reason = "No action taken"

    # 1) Try to buy an affordable card that matches archetype
    #    Archetype priority: aggressive -> Virus, combo -> AI, control -> Hardware/Netrunner
    archetype_preference = {
        "aggressive": "virus",
        "combo": "ai",
        "control": "hardware",  # also netrunner
    }
    preferred_prefix = archetype_preference.get(req.archetype, "")

    for offer in req.shop_offers:
        if req.credits >= offer.cost:
            # Simple preference matching
            if preferred_prefix and offer.card_id.lower().startswith(preferred_prefix):
                return ShopResponse(action="buy", card_index=offer.shop_index, reason=f"Buying preferred {offer.card_id}")
    # 2) Fallback: buy cheapest affordable card
    if req.shop_offers:
        cheapest = min(req.shop_offers, key=lambda o: o.cost)
        if req.credits >= cheapest.cost:
            return ShopResponse(action="buy", card_index=cheapest.shop_index, reason="Cheapest affordable card")

    # 3) If can't buy anything, reroll
    if req.credits > 0:
        return ShopResponse(action="reroll", reason="No affordable card, reroll")

    # 4) Skip
    return ShopResponse(action="skip", reason="No credits left")
