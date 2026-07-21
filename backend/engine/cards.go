package engine

import (
	"backend/models"
	"fmt"
)

// AllCards returns the full card pool of 71 unique cards adapted to the cyberpunk setting.
// The list excludes the starter cards (which are assigned directly).
func AllCards() []models.Card {
	return []models.Card{
		// === DECK A ===
		// Mainframe (old Castle)
		{ID: "a_jester", Name: "データジョーカー", Attribute: "Mainframe", Power: 1, Rarity: "Common", Effect: "ベンチにパワー1のカードがあれば、パワー+3", EffectType: "jester", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_hermit", Name: "サンドボックス", Attribute: "Mainframe", Power: 2, Rarity: "Common", Effect: "自分の除外エリアにあるカード1枚につき、パワー+1", EffectType: "hermit", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_stable_boy", Name: "サブネットヘルパー", Attribute: "Mainframe", Power: 2, Rarity: "Common", Effect: "ベンチにあるパワー2のカード1枚につき、パワー+1", EffectType: "stable_boy", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_pig", Name: "データピッグ", Attribute: "Mainframe", Power: 3, Rarity: "Rare", Effect: "攻撃時：相手のベンチにあるカードの属性の種類数につき、パワー+1", EffectType: "pig", Cost: 4, Deck: "A", Quantity: 3},

		// Sector (old City)
		{ID: "a_talent", Name: "ネットアイドル", Attribute: "Sector", Power: 2, Rarity: "Rare", Effect: "攻撃時：自分の山札の残り枚数が偶数なら、パワー+3", EffectType: "talent", Cost: 4, Deck: "A", Quantity: 3},
		{ID: "a_reporter", Name: "パケットスニッファ", Attribute: "Sector", Power: 2, Rarity: "Common", Effect: "山札から2枚見て、1枚を一番下、1枚を一番上に置く。", EffectType: "reporter", Cost: 2, Deck: "A", Quantity: 4},

		// Orbit (old Space)
		{ID: "a_rescue_pod", Name: "バックアップポッド", Attribute: "Orbit", Power: 1, Rarity: "Common", Effect: "このカードがフラッグを失う際、このカードを共有デッキに戻し、Bデッキのカード1枚を自分の除外エリアに置く。", EffectType: "rescue_pod", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_ai", Name: "ニューロコア", Attribute: "Orbit", Power: 2, Rarity: "Rare", Effect: "このカードがベンチにある場合、自分のパワー2のキャラクターのパワー+1。", EffectType: "ai", Cost: 4, Deck: "A", Quantity: 3},
		{ID: "a_shapeshifter", Name: "モーフプログラム", Attribute: "Orbit", Power: 2, Rarity: "Common", Effect: "このカードの選択時、自分のデッキのカード1枚を共有デッキに戻すことで、もう1枚追加で選んで良い。", EffectType: "shapeshifter", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_cow", Name: "サイバーカウ", Attribute: "Orbit", Power: 4, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 4, Deck: "A", Quantity: 3},

		// HoloMedia (old Movie)
		{ID: "a_makeup_artist", Name: "アバタースタイリスト", Attribute: "HoloMedia", Power: 1, Rarity: "Common", Effect: "このカードがベンチにある場合、自分のパワー1のキャラクターの攻撃時、パワー+2", EffectType: "makeup_artist", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_gangster", Name: "グリッドレイダー", Attribute: "HoloMedia", Power: 2, Rarity: "Common", Effect: "攻撃時、パワー+2", EffectType: "gangster", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_moviestar", Name: "ネットセレブリティ", Attribute: "HoloMedia", Power: 2, Rarity: "Common", Effect: "ベンチにパワー1か2のホロメディア（HoloMedia）カードがあれば、2枚まで山札の一番上に戻して良い。", EffectType: "moviestar", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_cat", Name: "ネコAI", Attribute: "HoloMedia", Power: 4, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 4, Deck: "A", Quantity: 3},

		// DeepWeb (old Shipwreck)
		{ID: "a_merman", Name: "DeepWebエンティティ", Attribute: "DeepWeb", Power: 1, Rarity: "Common", Effect: "ベンチにディープウェブ（DeepWeb）属性のカードが2枚以上あれば、パワー+4", EffectType: "merman", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_treasure", Name: "デクリプトコア", Attribute: "DeepWeb", Power: 2, Rarity: "Common", Effect: "このカードがフラッグを手に入れたら、パワー+2", EffectType: "treasure", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_sailor", Name: "ネットナビゲーター", Attribute: "DeepWeb", Power: 2, Rarity: "Common", Effect: "山札を見て、好きなカードを一番下に移動させて良い。", EffectType: "sailor", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_parrot", Name: "データパロット", Attribute: "DeepWeb", Power: 4, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 4, Deck: "A", Quantity: 3},

		// Daemon (old Ghost)
		{ID: "a_butler", Name: "メモリークリーナー", Attribute: "Daemon", Power: 1, Rarity: "Common", Effect: "ベンチにあるカードを最大2枚まで除外エリアに置いて良い。", EffectType: "butler", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_skeleton", Name: "スケルトンキー", Attribute: "Daemon", Power: 2, Rarity: "Common", Effect: "このカードがフラッグを手に入れたら、パワー+1。", EffectType: "skeleton", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_spider", Name: "ウェブクロウラー", Attribute: "Daemon", Power: 4, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 4, Deck: "A", Quantity: 3},

		// Matrix (old Fairground)
		{ID: "a_clown", Name: "データクラウン", Attribute: "Matrix", Power: 1, Rarity: "Common", Effect: "このカードがフラッグを手に入れたら、★+2", EffectType: "clown", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_juggler", Name: "タスクスケジューラー", Attribute: "Matrix", Power: 2, Rarity: "Common", Effect: "自分の山札の上から3枚見て、好きな順で戻して良い。", EffectType: "juggler", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_vendor", Name: "ポートスキャナー", Attribute: "Matrix", Power: 2, Rarity: "Common", Effect: "このカードがベンチにある場合、マトリクス（Matrix）属性のパワー+1", EffectType: "vendor", Cost: 2, Deck: "A", Quantity: 4},
		{ID: "a_pony", Name: "サイバーポニー", Attribute: "Matrix", Power: 4, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 4, Deck: "A", Quantity: 3},

		// === DECK B ===
		// Mainframe (old Castle)
		{ID: "b_knight", Name: "コアガード", Attribute: "Mainframe", Power: 3, Rarity: "Common", Effect: "攻撃時：相手のトロフィーの数だけパワー+1", EffectType: "knight", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_blacksmith", Name: "コードオプティマイザ", Attribute: "Mainframe", Power: 3, Rarity: "Common", Effect: "このカードがベンチにある場合、セクター（Sector）属性のパワー+1", EffectType: "blacksmith", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_magician", Name: "魔術師プログラム", Attribute: "Mainframe", Power: 4, Rarity: "Common", Effect: "ベンチにパワー3以下のカードがあれば、1枚を除外エリアに置いても良い。", EffectType: "magician", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_horse", Name: "サイバーホース", Attribute: "Mainframe", Power: 7, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},

		// Sector (old City)
		{ID: "b_mascot", Name: "デーモンマスコット", Attribute: "Sector", Power: 2, Rarity: "Common", Effect: "ベンチにいる属性の種類の数だけパワー+1", EffectType: "mascot", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_dog", Name: "サイバードッグ", Attribute: "Sector", Power: 7, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},

		// Orbit (old Space)
		{ID: "b_ufo", Name: "ボイドキャリア", Attribute: "Orbit", Power: 3, Rarity: "Common", Effect: "Aデッキの山札から2枚のカードを見ないで、自分の山札の一番下に追加する。", EffectType: "ufo", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_band", Name: "シナプスバンド", Attribute: "Orbit", Power: 3, Rarity: "Common", Effect: "このカードがベンチにある場合、オービット（Orbit）属性のパワー+1", EffectType: "band", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_clone", Name: "レプリカエージェント", Attribute: "Orbit", Power: 4, Rarity: "Common", Effect: "このカードの選択時、★1を得る。", EffectType: "clone", Cost: 4, Deck: "B", Quantity: 5},
		{ID: "b_alien", Name: "ゼノウイルス", Attribute: "Orbit", Power: 7, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},

		// HoloMedia (old Movie)
		{ID: "b_cowboy", Name: "データバガボンド", Attribute: "HoloMedia", Power: 3, Rarity: "Common", Effect: "このカードがフラッグを手に入れたら、相手のベンチにある最もパワーの高いカード1枚を除外エリアに送る。", EffectType: "cowboy", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_comic", Name: "ホロヒーロー", Attribute: "HoloMedia", Power: 4, Rarity: "Common", Effect: "このカードがフラッグを失う際、次のキャラクターの攻撃時、パワー+2", EffectType: "comic", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_director", Name: "シスオペ", Attribute: "HoloMedia", Power: 4, Rarity: "Common", Effect: "このカードがベンチにある場合、ホロメディア（HoloMedia）属性の攻撃時のパワー+1", EffectType: "director", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_lion", Name: "サイバーライオン", Attribute: "HoloMedia", Power: 7, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},

		// DeepWeb (old Shipwreck)
		{ID: "b_cook", Name: "システムプロキシ", Attribute: "DeepWeb", Power: 2, Rarity: "Common", Effect: "このカードがベンチにある場合、フラッグを持っている自分のキャラクターのパワー+1", EffectType: "cook", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_navigator", Name: "グリッドマッパー", Attribute: "DeepWeb", Power: 4, Rarity: "Common", Effect: "このカードがフラッグを失う際、山札から2枚見て、1枚を一番下、1枚を一番上に置く。", EffectType: "navigator", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_lifeguard", Name: "システムリカバリー", Attribute: "DeepWeb", Power: 5, Rarity: "Common", Effect: "このカードが出たとき、山札の残り枚数が3枚以下なら、パワー+4", EffectType: "lifeguard", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_shark", Name: "サイバーシャーク", Attribute: "DeepWeb", Power: 7, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},

		// Daemon (old Ghost)
		{ID: "b_ghost", Name: "ファントムスヌープ", Attribute: "Daemon", Power: 1, Rarity: "Common", Effect: "相手の山札の一番上のカードを相手の除外エリアに置く。", EffectType: "ghost", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_teenager", Name: "スクリプトキディ", Attribute: "Daemon", Power: 2, Rarity: "Common", Effect: "ベンチにあるデーモン（Daemon）属性のカード1枚につき、パワー+2", EffectType: "teenager", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_necromancer", Name: "リサイクルビン", Attribute: "Daemon", Power: 3, Rarity: "Common", Effect: "ベンチにある最もパワーの低いカード1枚を自分の山札の一番上に戻す。", EffectType: "necromancer", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_bat", Name: "サイバーバット", Attribute: "Daemon", Power: 7, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},

		// Matrix (old Fairground)
		{ID: "b_mime", Name: "ミラープログラム", Attribute: "Matrix", Power: 2, Rarity: "Common", Effect: "ベンチの空きの数だけ、パワー+2", EffectType: "mime", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_pyrotechnist", Name: "バッファオーバーロード", Attribute: "Matrix", Power: 4, Rarity: "Common", Effect: "このカードが出たとき、ベンチが満杯（6スロットすべて埋まっている）なら、★+3", EffectType: "pyrotechnist", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_fortune_teller", Name: "予測モデル", Attribute: "Matrix", Power: 4, Rarity: "Common", Effect: "このカードがフラッグを失う際、山札を見て、好きなカードを一番上に移動させて良い。", EffectType: "fortune_teller", Cost: 4, Deck: "B", Quantity: 4},
		{ID: "b_duck", Name: "サイバーダック", Attribute: "Matrix", Power: 7, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "B", Quantity: 3},

		// === DECK C ===
		// Mainframe (old Castle)
		{ID: "c_bard", Name: "シグナルブースター", Attribute: "Mainframe", Power: 4, Rarity: "Common", Effect: "このカードがベンチにある場合、自分のキャラクターの攻撃時、パワー+1", EffectType: "bard", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_prince", Name: "ダミーノード", Attribute: "Mainframe", Power: 5, Rarity: "Common", Effect: "このカードがフラッグを失う際、ベンチには置かれず、除外エリアに置かれる。", EffectType: "prince", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_dragon", Name: "コーポドラゴン", Attribute: "Mainframe", Power: 9, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 2},

		// Sector (old City)
		{ID: "c_champion", Name: "エリートグラディエーター", Attribute: "Sector", Power: 9, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 3},
		{ID: "c_fanbus", Name: "データストリーマー", Attribute: "Sector", Power: 6, Rarity: "Common", Effect: "自分のトロフィーが3個以下なら★+2", EffectType: "fanbus", Cost: 7, Deck: "C", Quantity: 4},

		// Orbit (old Space)
		{ID: "c_hologram", Name: "ホログラムデコイ", Attribute: "Orbit", Power: 4, Rarity: "Common", Effect: "このカードを出したら、Bデッキの山札から1枚のカード見ないで、相手の山札の一番上に置く。", EffectType: "hologram", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_geek", Name: "軌道ハッカー", Attribute: "Orbit", Power: 6, Rarity: "Common", Effect: "このカードの選択時、自分のデッキのオービット（Orbit）属性 2枚を共有デッキに戻すことで、もう1枚追加で選んで良い。", EffectType: "geek", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_slime", Name: "電脳スライム", Attribute: "Orbit", Power: 9, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 2},

		// HoloMedia (old Movie)
		{ID: "c_hero", Name: "サイバーヒーロー", Attribute: "HoloMedia", Power: 5, Rarity: "Common", Effect: "このカードがフラッグを手に入れたら、★+2", EffectType: "hero", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_trex", Name: "Tウイルスレックス", Attribute: "HoloMedia", Power: 9, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 2},
		{ID: "c_villain", Name: "ヴィランプログラム", Attribute: "HoloMedia", Power: 9, Rarity: "Common", Effect: "このカードを出したら、Aデッキのカードを1枚見ないで、自分の山札の一番上に置く。", EffectType: "villain", Cost: 7, Deck: "C", Quantity: 4},

		// DeepWeb (old Shipwreck)
		{ID: "c_siren", Name: "フィッシングプログラム", Attribute: "DeepWeb", Power: 6, Rarity: "Common", Effect: "相手のベンチにある最もパワーの高いカード1枚を相手の除外エリアに送る。", EffectType: "siren", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_kraken", Name: "クラーケンICE", Attribute: "DeepWeb", Power: 9, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 2},
		{ID: "c_submarine", Name: "サブネットダイバー", Attribute: "DeepWeb", Power: 9, Rarity: "Common", Effect: "自分の山札の一番下のカードを自分の除外エリアに置く。", EffectType: "submarine", Cost: 7, Deck: "C", Quantity: 4},

		// Daemon (old Ghost)
		{ID: "c_vampire", Name: "ヴァンパイアICE", Attribute: "Daemon", Power: 4, Rarity: "Common", Effect: "自分のベンチにBデッキのカードがあれば、1枚を山札の一番上に戻して良い。", EffectType: "vampire", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_pumpkin", Name: "ジャックオーランタン", Attribute: "Daemon", Power: 5, Rarity: "Common", Effect: "ベンチにあるカードを最大2枚まで、自分の除外エリアに置いて良い。", EffectType: "pumpkin", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_werewolf", Name: "電脳ワーウルフ", Attribute: "Daemon", Power: 9, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 2},

		// Matrix (old Fairground)
		{ID: "c_illusionist", Name: "イリュージョニストICE", Attribute: "Matrix", Power: 5, Rarity: "Common", Effect: "このカードがフラッグを手に入れたら、ベンチの空きの数だけ、パワー+1", EffectType: "illusionist", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_bumper_car", Name: "トラフィックシェイパー", Attribute: "Matrix", Power: 6, Rarity: "Common", Effect: "自分の山札の上から3枚見て、好きな順で戻して良い。", EffectType: "bumper_car", Cost: 7, Deck: "C", Quantity: 4},
		{ID: "c_teddybear", Name: "電脳テディベア", Attribute: "Matrix", Power: 9, Rarity: "Rare", Effect: "", EffectType: "none", Cost: 7, Deck: "C", Quantity: 2},
	}
}

// StarterDeck returns the symmetrical 6-card starting deck for all players.
func StarterDeck() []models.Card {
	return []models.Card{
		{ID: "starter_scout_1a", Name: "スキャンノード", Attribute: "None", Power: 1, Rarity: "Common", Effect: "", EffectType: "none", Cost: 0, Deck: "Starter", Quantity: 0},
		{ID: "starter_scout_1b", Name: "スキャンノード", Attribute: "None", Power: 1, Rarity: "Common", Effect: "", EffectType: "none", Cost: 0, Deck: "Starter", Quantity: 0},
		{ID: "starter_scout_1c", Name: "スキャンノード", Attribute: "None", Power: 1, Rarity: "Common", Effect: "", EffectType: "none", Cost: 0, Deck: "Starter", Quantity: 0},
		{ID: "starter_scout_2a", Name: "プローブノード", Attribute: "None", Power: 2, Rarity: "Common", Effect: "", EffectType: "none", Cost: 0, Deck: "Starter", Quantity: 0},
		{ID: "starter_scout_2b", Name: "プローブノード", Attribute: "None", Power: 2, Rarity: "Common", Effect: "", EffectType: "none", Cost: 0, Deck: "Starter", Quantity: 0},
		{ID: "starter_mascot", Name: "ガードマスコット", Attribute: "None", Power: 2, Rarity: "Common", Effect: "", EffectType: "none", Cost: 0, Deck: "Starter", Quantity: 0},
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
