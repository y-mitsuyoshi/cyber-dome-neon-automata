import urllib.request
import json
import sys

BASE_URL = "http://localhost:8080"

def request(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    req_data = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=req_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as res:
            body = res.read().decode("utf-8")
            return json.loads(body)
    except Exception as e:
        print(f"ERROR requesting {method} {path}: {e}")
        if hasattr(e, "read"):
            print("Response error body:", e.read().decode("utf-8"))
        sys.exit(1)

def main():
    print("=== STARTING CYBER-DOME INTEGRATION TEST ===")
    
    # 1. Start a new game
    print("\n1. Testing POST /api/game/new")
    new_game = request("/api/game/new", method="POST")
    game_id = new_game.get("gameId")
    if not game_id:
        print("FAIL: gameId is missing from response")
        sys.exit(1)
    
    player = new_game.get("player", {})
    shop = new_game.get("shop", {})
    shop_cards = shop.get("cards", [])
    
    print(f"SUCCESS: New game initialized. ID: {game_id}")
    print(f"Current state: Round={new_game.get('currentRound')}, Credits={player.get('credits')}¢, Deck count={len(player.get('deck'))}, Shop cards count={len(shop_cards)}")
    
    # 2. Get state
    print("\n2. Testing GET /api/game/state")
    state = request(f"/api/game/state?gameId={game_id}")
    print(f"SUCCESS: Game state retrieved. Round={state.get('currentRound')}, Phase={state.get('phase')}")
    
    # 3. Get shop
    print("\n3. Testing GET /api/shop")
    shop_data = request(f"/api/shop?gameId={game_id}")
    print(f"SUCCESS: Shop retrieved. Credits={shop_data.get('credits')}¢, Cards: {[c['name'] for c in shop_data.get('cards')]}")
    
    # 4. Reroll shop (costs 1 credit)
    old_credits = state.get("player", {}).get("credits")
    print(f"\n4. Testing POST /api/shop/reroll (old credits: {old_credits}¢)")
    rerolled = request("/api/shop/reroll", method="POST", data={"gameId": game_id})
    rerolled_player = rerolled.get("player", {})
    rerolled_shop = rerolled.get("shop", {})
    print(f"SUCCESS: Shop rerolled. New credits={rerolled_player.get('credits')}¢, New Cards: {[c['name'] for c in rerolled_shop.get('cards')]}")
    if rerolled_player.get("credits") != old_credits - 1:
        print("FAIL: Credit deduction incorrect after reroll")
        sys.exit(1)

    # 5. Buy card
    old_deck_len = len(rerolled_player.get("deck"))
    first_card = rerolled_shop.get("cards")[0]
    print(f"\n5. Testing POST /api/shop/buy for index 0 (Card: {first_card['name']}, Cost: {first_card['power']}¢)")
    bought = request("/api/shop/buy", method="POST", data={"gameId": game_id, "cardIndex": 0})
    bought_player = bought.get("player", {})
    print(f"SUCCESS: Card bought. New credits={bought_player.get('credits')}¢, New Deck count={len(bought_player.get('deck'))}")
    if len(bought_player.get("deck")) != old_deck_len + 1:
        print("FAIL: Deck count didn't increase")
        sys.exit(1)
        
    # 6. Delete card (costs 2 credits)
    old_credits = bought_player.get("credits")
    old_deck_len = len(bought_player.get("deck"))
    print(f"\n6. Testing POST /api/shop/delete for index 0 (old credits: {old_credits}¢, deck: {old_deck_len})")
    deleted = request("/api/shop/delete", method="POST", data={"gameId": game_id, "cardIndex": 0})
    deleted_player = deleted.get("player", {})
    print(f"SUCCESS: Card deleted. New credits={deleted_player.get('credits')}¢, New Deck count={len(deleted_player.get('deck'))}")
    if len(deleted_player.get("deck")) != old_deck_len - 1:
        print("FAIL: Deck count didn't decrease")
        sys.exit(1)
    if deleted_player.get("credits") != old_credits - 2:
        print("FAIL: Credit deduction incorrect after delete")
        sys.exit(1)

    # 7. Start Battle Simulation
    print("\n7. Testing POST /api/tournament/battle")
    battle = request("/api/tournament/battle", method="POST", data={"gameId": game_id})
    battle_log = battle.get("battleLog", [])
    last_res = battle.get("lastResult", {})
    print(f"SUCCESS: Battle simulated. Winner declared in {len(battle_log)} logs steps.")
    print(f"Battle Winner: {last_res.get('winner')}, Loser: {last_res.get('loser')}, Reason: {last_res.get('reason')}")
    print("Timeline sample:")
    for step in battle_log[:5]:
        card_name = step.get('card', {}).get('name') if step.get('card') else 'None'
        print(f"  Step {step.get('step')}: Action={step.get('action')}, Player={step.get('player')}, Card={card_name}, CurrentPower={step.get('currentPower')}, EffectTriggered='{step.get('effectTriggered')}'")
        print(f"    Player slots: {step.get('playerMemSlots')}, CPU slots: {step.get('cpuMemSlots')}")
        
    # 8. Next Round
    print("\n8. Testing POST /api/tournament/next-round")
    next_state = request("/api/tournament/next-round", method="POST", data={"gameId": game_id})
    print(f"SUCCESS: Advanced to next round. New round={next_state.get('currentRound')}, New Phase={next_state.get('phase')}")
    
    print("\n=== ALL CYBER-DOME CORE INTEGRATION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    main()
