import random

def decide(req: dict) -> dict:
    """
    Rule-based decision for NPC shop actions.
    req corresponds to ShopRequest schema.
    Returns dict with action, card_index, reason.
    """
    credits = req.get("credits", 0)
    offers = req.get("shop_offers", [])
    owned = req.get("owned_cards", [])

    # Try to buy the cheapest affordable card
    affordable = [o for o in offers if o["cost"] <= credits]
    if affordable:
        # Buy the cheapest
        best = min(affordable, key=lambda o: o["cost"])
        return {"version": "1.0", "action": "buy", "card_index": best["shop_index"], "reason": "cheapest affordable"}

    # No affordable card: if we have many cards and low credits, delete a weak card
    if owned and credits < 3 and len(owned) > 3:
        return {"version": "1.0", "action": "delete", "card_index": owned[0]["owned_index"], "reason": "delete weakest"}

    # Sometimes reroll
    if offers and random.random() < 0.5:
        return {"version": "1.0", "action": "reroll", "reason": "reroll for better options"}

    return {"version": "1.0", "action": "skip", "reason": "no good action"}
