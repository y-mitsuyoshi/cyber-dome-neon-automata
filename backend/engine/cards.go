package engine

import (
	"backend/models"
	"fmt"
)

// AllCards returns the full card pool of 71 unique cards based on the Challengers deck list.
// The list excludes the starter cards (which are assigned directly).
func AllCards() []models.Card {
	return []models.Card{
		// === DECK A ===
		// Castle
		{ID: "a_jester", Name: "道化師", Attribute: "Castle", Power: 1, Rarity: "Common", Effect: "ベンチにパワー1のカードがあれば、パワー+3", EffectType: "jester", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_hermit", Name: "隠者", Attribute: "Castle", Power: 2, Rarity: "Common", Effect: "ベンチにシティ属性のカードがなければ、パワー+2", EffectType: "hermit", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_stable_boy", Name: "馬小屋少年", Attribute: "Castle", Power: 2, Rarity: "Common", Effect: "ベンチにあるパワー３のカード1枚につき、パワー+1", EffectType: "stable_boy", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_pig", Name: "ブタ", Attribute: "Castle", Power: 3, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 4, Deck: "A", Quantity: 3},
		
		// City
		{ID: "a_talent", Name: "タレント", Attribute: "City", Power: 2, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 4, Deck: "A", Quantity: 3},
		{ID: "a_reporter", Name: "リポーター", Attribute: "City", Power: 2, Rarity: "Common", Effect: "山札から2枚見て、1枚を一番下、1枚を一番上に置く。", EffectType: "reporter", Cost: 2, Deck: "A", Quantity: 4},
		
		// Space
		{ID: "a_rescue_pod", Name: "レスキューポッド", Attribute: "Space", Power: 1, Rarity: "Common", Effect: "このカードがフラッグを失う際、このカードを共有デッキに戻し、Bデッキのカード1枚を自分の除外エリアに置く。", EffectType: "rescue_pod", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_ai", Name: "AI", Attribute: "Space", Power: 2, Rarity: "Rare", Effect: "このカードがベンチにある場合、自分のパワー2のキャラクターのパワー+1。", EffectType: "ai", Cost: 4, Deck: "A", Quantity: 3},
		{ID: "a_shapeshifter", Name: "シェイプシフター", Attribute: "Space", Power: 2, Rarity: "Common", Effect: "このカードの選択時、自分のデッキのカード1枚を共有デッキに戻すことで、もう1枚追加で選んで良い。", EffectType: "shapeshifter", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_cow", Name: "牛", Attribute: "Space", Power: 3, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 4, Deck: "A", Quantity: 3},
		
		// Movie
		{ID: "a_makeup_artist", Name: "メイクアップアーティスト", Attribute: "Movie", Power: 1, Rarity: "Common", Effect: "このカードがベンチにある場合、自分のパワー1のキャラクターの攻撃時、パワー+2", EffectType: "makeup_artist", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_gangster", Name: "ギャングスター", Attribute: "Movie", Power: 2, Rarity: "Common", Effect: "攻撃時、パワー+2", EffectType: "gangster", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_moviestar", Name: "ムービースター", Attribute: "Movie", Power: 2, Rarity: "Common", Effect: "ベンチにパワー1か2の映画カードがあれば、2枚まで山札の一番上に戻して良い。", EffectType: "moviestar", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_cat", Name: "ネコ", Attribute: "Movie", Power: 3, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 4, Deck: "A", Quantity: 3},
		
		// Shipwreck
		{ID: "a_merman", Name: "マーマン", Attribute: "Shipwreck", Power: 1, Rarity: "Common", Effect: "ベンチに難破船属性のカードがあれば、パワー+3", EffectType: "merman", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_treasure", Name: "トレジャー", Attribute: "Shipwreck", Power: 2, Rarity: "Common", Effect: "このカードがフラッグを手に入れたら、パワー+2", EffectType: "treasure", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_sailor", Name: "船乗り", Attribute: "Shipwreck", Power: 2, Rarity: "Common", Effect: "山札を見て、好きなカードを一番下に移動させて良い。", EffectType: "sailor", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_parrot", Name: "オウム", Attribute: "Shipwreck", Power: 3, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 4, Deck: "A", Quantity: 3},
		
		// Ghost
		{ID: "a_butler", Name: "執事", Attribute: "Ghost", Power: 1, Rarity: "Common", Effect: "ベンチにあるカードを最大2枚まで除外エリアに置いて良い。", EffectType: "butler", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_skeleton", Name: "スケルトン", Attribute: "Ghost", Power: 2, Rarity: "Common", Effect: "このカードがフラッグを手に入れたら、パワー+1。", EffectType: "skeleton", Cost: 2, Deck: "A", Quantity: 8},
		{ID: "a_spider", Name: "クモ", Attribute: "Ghost", Power: 3, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 4, Deck: "A", Quantity: 3},
		
		// Fairground
		{ID: "a_clown", Name: "ピエロ", Attribute: "Fairground", Power: 1, Rarity: "Common", Effect: "このカードがフラッグを手に入れたら、★+2", EffectType: "clown", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_juggler", Name: "ジャグラー", Attribute: "Fairground", Power: 2, Rarity: "Common", Effect: "自分の山札の上から3枚見て、好きな順で戻して良い。", EffectType: "juggler", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_vendor", Name: "売り子", Attribute: "Fairground", Power: 2, Rarity: "Common", Effect: "このカードがベンチにある場合、遊園地属性のパワー+1", EffectType: "vendor", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_pony", Name: "ポニー", Attribute: "Fairground", Power: 3, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 4, Deck: "A", Quantity: 3},

		// === DECK B ===
		// Castle
		{ID: "b_knight", Name: "ナイト", Attribute: "Castle", Power: 3, Rarity: "Common", Effect: "攻撃時：相手のトロフィーの数だけパワー+1", EffectType: "knight", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_blacksmith", Name: "鍛冶屋", Attribute: "Castle", Power: 3, Rarity: "Common", Effect: "このカードがベンチにある場合、シティ属性のパワー+1", EffectType: "blacksmith", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_magician", Name: "魔術師", Attribute: "Castle", Power: 4, Rarity: "Common", Effect: "ベンチにパワー3以下のカードがあれば、1枚を除外エリアに置いても良い。", EffectType: "magician", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_horse", Name: "馬", Attribute: "Castle", Power: 5, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},
		
		// City
		{ID: "b_mascot", Name: "マスコット", Attribute: "City", Power: 2, Rarity: "Common", Effect: "ベンチにいる属性の種類の数だけパワー+1", EffectType: "mascot", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_dog", Name: "ドッグ", Attribute: "City", Power: 3, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},
		
		// Space
		{ID: "b_ufo", Name: "UFO", Attribute: "Space", Power: 3, Rarity: "Common", Effect: "Aデッキの山札から2枚のカードを見ないで、自分の山札の一番下に追加する。", EffectType: "ufo", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_band", Name: "バンド", Attribute: "Space", Power: 3, Rarity: "Common", Effect: "このカードがベンチにある場合、宇宙属性のパワー+1", EffectType: "band", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_clone", Name: "クローン", Attribute: "Space", Power: 4, Rarity: "Common", Effect: "このカードの選択時、★1を得る。", EffectType: "clone", Cost: 4, Deck: "B", Quantity: 5},
		{ID: "b_alien", Name: "エイリアン", Attribute: "Space", Power: 5, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},
		
		// Movie
		{ID: "b_cowboy", Name: "カウボーイ", Attribute: "Movie", Power: 3, Rarity: "Common", Effect: "このカードがフラッグを手に入れたら、相手の山札の一番上のカードをベンチに送る。", EffectType: "cowboy", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_comic", Name: "コミックキャラクター", Attribute: "Movie", Power: 4, Rarity: "Common", Effect: "このカードがフラッグを失う際、次のキャラクターの攻撃時、パワー+2", EffectType: "comic", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_director", Name: "ディレクター", Attribute: "Movie", Power: 4, Rarity: "Common", Effect: "このカードがベンチにある場合、映画属性の攻撃時のパワー+1", EffectType: "director", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_lion", Name: "ライオン", Attribute: "Movie", Power: 5, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},
		
		// Shipwreck
		{ID: "b_cook", Name: "コック", Attribute: "Shipwreck", Power: 2, Rarity: "Common", Effect: "このカードがベンチにある場合、フラッグを持っている自分のキャラクターのパワー+1", EffectType: "cook", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_navigator", Name: "ナビゲーター", Attribute: "Shipwreck", Power: 4, Rarity: "Common", Effect: "このカードがフラッグを失う際、山札から2枚見て、1枚を一番下、1枚を一番上に置く。", EffectType: "navigator", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_lifeguard", Name: "ライフガード", Attribute: "Shipwreck", Power: 4, Rarity: "Common", Effect: "このカードが出たとき、山札の残り枚数が1枚以下なら、パワー+2", EffectType: "lifeguard", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_shark", Name: "サメ", Attribute: "Shipwreck", Power: 5, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},
		
		// Ghost
		{ID: "b_ghost", Name: "ゴースト", Attribute: "Ghost", Power: 1, Rarity: "Common", Effect: "相手の山札の一番上のカードを相手の除外エリアに置く。", EffectType: "ghost", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_teenager", Name: "ティーンエイジャー", Attribute: "Ghost", Power: 2, Rarity: "Common", Effect: "ベンチにある幽霊属性のカード1枚につき、パワー+1", EffectType: "teenager", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_necromancer", Name: "ネクロマンサー", Attribute: "Ghost", Power: 3, Rarity: "Common", Effect: "ベンチにパワー2のカードがあれば、1枚を山札の一番上に戻して良い。", EffectType: "necromancer", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_bat", Name: "バット", Attribute: "Ghost", Power: 5, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},
		
		// Fairground
		{ID: "b_mime", Name: "物真似師", Attribute: "Fairground", Power: 1, Rarity: "Common", Effect: "ベンチの空きの数だけ、パワー+1", EffectType: "mime", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_pyrotechnist", Name: "花火師", Attribute: "Fairground", Power: 4, Rarity: "Common", Effect: "このカードが出たとき、山札の残り枚数が1枚以下なら、★+2", EffectType: "pyrotechnist", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_fortune_teller", Name: "予知能力者", Attribute: "Fairground", Power: 4, Rarity: "Common", Effect: "このカードがフラッグを失う際、山札を見て、好きなカードを一番上に移動させて良い。", EffectType: "fortune_teller", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_duck", Name: "アヒル", Attribute: "Fairground", Power: 5, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},

		// === DECK C ===
		// Castle
		{ID: "c_bard", Name: "吟遊詩人", Attribute: "Castle", Power: 4, Rarity: "Common", Effect: "このカードがベンチにある場合、自分のキャラクターの攻撃時、パワー+1", EffectType: "bard", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_prince", Name: "プリンス", Attribute: "Castle", Power: 5, Rarity: "Common", Effect: "このカードがフラッグを失う際、ベンチには置かれず、除外エリアに置かれる。", EffectType: "prince", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_dragon", Name: "ドラゴン", Attribute: "Castle", Power: 7, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 2},
		
		// City
		{ID: "c_champion", Name: "チャンピオン", Attribute: "City", Power: 4, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 3},
		{ID: "c_fanbus", Name: "ファンバス", Attribute: "City", Power: 6, Rarity: "Common", Effect: "自分のトロフィーが3個以下なら★+2", EffectType: "fanbus", Cost: 7, Deck: "C", Quantity: 4},
		
		// Space
		{ID: "c_hologram", Name: "ホログラム", Attribute: "Space", Power: 4, Rarity: "Common", Effect: "このカードを出したら、Bデッキの山札から1枚のカードを見ないで、相手の山札の一番上に置く。", EffectType: "hologram", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_geek", Name: "SFオタク", Attribute: "Space", Power: 6, Rarity: "Common", Effect: "このカードの選択時、自分のデッキの宇宙属性 of player's cards 2枚を共有デッキに戻すことで、もう1枚追加で選んで良い。", EffectType: "geek", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_slime", Name: "スライム", Attribute: "Space", Power: 7, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 2},
		
		// Movie
		{ID: "c_hero", Name: "ヒーロー", Attribute: "Movie", Power: 5, Rarity: "Common", Effect: "このカードがフラッグを手に入れたら、★+3", EffectType: "hero", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_trex", Name: "Tレックス", Attribute: "Movie", Power: 7, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 2},
		{ID: "c_villain", Name: "ヴィラン", Attribute: "Movie", Power: 10, Rarity: "Common", Effect: "このカードを出したら、Aデッキのカードを1枚見ないで、自分の山札の一番上に置く。", EffectType: "villain", Cost: 7, Deck: "C", Quantity: 4},
		
		// Shipwreck
		{ID: "c_siren", Name: "サイレン", Attribute: "Shipwreck", Power: 6, Rarity: "Common", Effect: "相手のベンチのカード1枚を相手の除外エリアに置いても良い。", EffectType: "siren", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_kraken", Name: "クラーケン", Attribute: "Shipwreck", Power: 7, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 2},
		{ID: "c_submarine", Name: "サブマリン", Attribute: "Shipwreck", Power: 9, Rarity: "Common", Effect: "自分の山札の一番下のカードを自分の除外エリアに置く。", EffectType: "submarine", Cost: 7, Deck: "C", Quantity: 4},
		
		// Ghost
		{ID: "c_vampire", Name: "バンパイア", Attribute: "Ghost", Power: 4, Rarity: "Common", Effect: "自分のベンチにBデッキのカードがあれば、1枚を山札の一番上に戻して良い。", EffectType: "vampire", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_pumpkin", Name: "パンプキン", Attribute: "Ghost", Power: 5, Rarity: "Common", Effect: "ベンチにあるカードを最大2枚まで、自分の除外エリアに置いて良い。", EffectType: "pumpkin", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_werewolf", Name: "人狼", Attribute: "Ghost", Power: 7, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 2},
		
		// Fairground
		{ID: "c_illusionist", Name: "イリュージョニスト", Attribute: "Fairground", Power: 5, Rarity: "Common", Effect: "このカードがフラッグを手に入れたら、ベンチの空きの数だけ、パワー+1", EffectType: "illusionist", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_bumper_car", Name: "バンパーカー", Attribute: "Fairground", Power: 6, Rarity: "Common", Effect: "自分の山札の上から3枚見て、好きな順で戻して良い。", EffectType: "bumper_car", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_teddybear", Name: "テディベア", Attribute: "Fairground", Power: 7, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 2},
	}
}

// StarterDeck returns the symmetrical 6-card starting deck for all players.
func StarterDeck() []models.Card {
	return []models.Card{
		{ID: "starter_scout_1a", Name: "スカウト", Attribute: "None", Power: 1, Rarity: "Common", Effect: "", EffectType: "none", Cost: 0, Deck: "Starter", Quantity: 0},
		{ID: "starter_scout_1b", Name: "スカウト", Attribute: "None", Power: 1, Rarity: "Common", Effect: "", EffectType: "none", Cost: 0, Deck: "Starter", Quantity: 0},
		{ID: "starter_scout_1c", Name: "スカウト", Attribute: "None", Power: 1, Rarity: "Common", Effect: "", EffectType: "none", Cost: 0, Deck: "Starter", Quantity: 0},
		{ID: "starter_scout_2a", Name: "スカウト", Attribute: "None", Power: 2, Rarity: "Common", Effect: "", EffectType: "none", Cost: 0, Deck: "Starter", Quantity: 0},
		{ID: "starter_scout_2b", Name: "スカウト", Attribute: "None", Power: 2, Rarity: "Common", Effect: "", EffectType: "none", Cost: 0, Deck: "Starter", Quantity: 0},
		{ID: "starter_mascot", Name: "マスコット", Attribute: "None", Power: 2, Rarity: "Common", Effect: "", EffectType: "none", Cost: 0, Deck: "Starter", Quantity: 0},
	}
}

// CardsByAttribute filters cards by attribute.
func CardsByAttribute(attr string) []models.Card {
	var result []models.Card
	for _, c := range AllCards() {
		if c.Attribute == attr {
			result = append(result, c.Clone())
		}
	}
	return result
}

// CardsByArchetype filters cards by archetype.
func CardsByArchetype(arch string) []models.Card {
	var result []models.Card
	for _, c := range AllCards() {
		if c.Archetype == arch {
			result = append(result, c.Clone())
		}
	}
	return result
}

// GenerateDeckPools returns the three pools A, B, C populated according to card quantities.
func GenerateDeckPools() ([]models.Card, []models.Card, []models.Card) {
	var a, b, c []models.Card
	for _, card := range AllCards() {
		for i := 0; i < card.Quantity; i++ {
			inst := card.Clone()
			inst.ID = fmt.Sprintf("%s_%d", card.ID, i)
			if card.Deck == "A" {
				a = append(a, inst)
			} else if card.Deck == "B" {
				b = append(b, inst)
			} else if card.Deck == "C" {
				c = append(c, inst)
			}
		}
	}
	return a, b, c
}
