import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Card } from '../types/game';

export type Locale = 'en' | 'ja';

export interface LocalizedCard extends Omit<Card, 'attribute' | 'archetype' | 'rarity'> {
  attribute: string;
  archetype: string;
  rarity: string;
}

interface TranslationContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  translateCard: (card: Card) => LocalizedCard;
  translateCardName: (name: string) => string;
  translateBattleDetail: (detail: string) => string;
  translateBattleResult: (text: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// UI translation dictionary
const uiDict: Record<Locale, Record<string, string>> = {
  en: {
    // Title Screen
    title: "CYBER-DOME",
    subtitle: "NEON AUTOMATA",
    cyberDeck: "NEURAL CORE INTERFACE",
    combatName: "COMBATANT NAME",
    soloMode: "INITIALIZE SOLO ARENA",
    soloDesc: "Train against 7 AI combatants in a standard tournament loop.",
    createLobby: "CREATE NET ARENA",
    createDesc: "Create an online lobby and invite human or AI combatants.",
    joinLobby: "CONNECT TO ARENA",
    joinDesc: "Enter a 6-character sector code to join a net lobby.",
    soloBtn: "START SOLO MODE",
    createBtn: "GENERATE SECTOR",
    joinBtn: "LINK SECTOR",
    joinModalTitle: "ESTABLISH GRID CONNECT",
    enterSectorCode: "ENTER SECTOR CODE",
    enterName: "ENTER COMBAT NAME",
    cancel: "TERMINATE",
    connect: "ESTABLISH",
    systemOnline: "/// SYSTEM ONLINE ///",
    cyber: "CYBER",
    dome: "DOME",
    neonAutomata: "Neon Automata",
    injectCombatantId: "Inject Combatant ID (Display Name)",
    combatantPlaceholder: "COMBATANT_ONE",
    jackInSolo: "Jack In (Solo Mode)",
    multiplayerMatrix: "Multiplayer Matrix",
    createArena: "Create Arena",
    joinArena: "Join Arena",
    multiplayerActive: "MULTIPLAYER GRID LAYER ACTIVE",
    connectToArenaKey: "Connect to Arena Key",
    enter6CharSectorCode: "Enter 6-Character Arena Code",
    cancelBtn: "Cancel",
    connectBtn: "Connect",
    
    // Lobby Screen
    arenaSector: "ARENA SECTOR",
    hostBadge: "HOST",
    ready: "READY",
    standby: "STANDBY",
    activeComms: "ACTIVE NET COMMS",
    sendPrompt: "SEND TRANSACTION DATA...",
    addNpcBtn: "DEPLOY NPC BOT",
    npcRosterLimit: "NPC DEPLOY LIMIT REACHED (MAX 8)",
    startTournament: "INITIALIZE TOURNAMENT",
    waitingForHost: "AWAITING SYNC FROM MAIN MAINBOARD...",
    playersConnected: "COMBATANTS SYNCHRONIZED",
    minPlayersNeeded: "MINIMUM 3 COMBATANTS REQUIRED",
    lobbyStatusWaiting: "Waiting for combatants...",
    lobbyStatusPlaying: "Active game in progress.",
    establishingLink: "Establishing Link to Cyber-Dome...",
    arenaLobby: "ARENA LOBBY",
    syncLinkEstablished: "Sync Link Established",
    syncOffline: "Sync Offline",
    lobbyKey: "Lobby Key:",
    copied: "Copied",
    copyKey: "Copy Key",
    combatantRoster: "Combatant Roster ({count}/8)",
    min3Required: "Min 3 Required",
    youBadge: "You",
    purgeBtn: "Purge",
    emptySlot: "[EMPTY COMBATANT SLOT]",
    deployNpcBtn: "DEPLOY NPC BOT IN ARENA",
    commsChannel: "Comms Channel",
    commsInitialized: "Comms terminal initialized. Secure sub-layer active.",
    chatPlaceholder: "Inject comms message...",
    gridLockError: "Grid lock: Roster size must be between 3 and 8 combatants to sync matrix.",
    awaitingHostSignal: "Awaiting host transmission signal...",
    
    // Shop Screen
    round: "ROUND",
    shopHeader: "BLACK MARKET SHUNT",
    credits: "CREDITS",
    deckSize: "DECK STACK SIZE",
    reroll: "REROLL GRID",
    rerollCost: "COST 1 CREDIT",
    deleteMode: "TRIM COMPONENT",
    deleteCost: "COST 2 CREDITS",
    readyForBattle: "READY FOR BATTLE",
    deckDraw: "DECK DRAW",
    power: "POW",
    cost: "COST",
    rarity: "RARITY",
    attr: "TYPE",
    arch: "ARCH",
    blackMarketHeader: "◈ Black Market ◈",
    shopSubtitle: "Select your augmentations wisely",
    buyBtn: "Buy {cost}¢",
    insufficientCredits: "Insufficient ¢",
    noCardsAvailable: "No cards available",
    tryRerolling: "Try rerolling for new stock",
    rerollText: "Reroll (1¢)",
    cancelDelete: "Cancel Delete",
    deleteCardText: "Delete Card",
    enterArenaBtn: "Enter the Arena",
    yourDeckCount: "Your Deck ({count} cards)",
    deckEmpty: "Your deck is empty",
    clickToDelete: "Click to delete",
    deckLabel: "Deck",
    viewDeckBtn: "View Deck",
    deckViewerModalTitle: "DECK COMPONENT MATRIX",
    deleteInfoText: "EACH DELETION COSTS 2 CREDITS. REMOVED PERMANENTLY.",
    
    // CardDisplay / MemorySlots
    memoryLabel: "MEMORY: {filled}/{max}",
    emptySlotLabel: "Empty",

    // Battle Screen
    battleStep: "SIMULATION STEP",
    claimsFlag: "claims the flag",
    flagHolderPower: "Flag Holder Power",
    benchedMemory: "BENCHED MEMORY SLOTS",
    emptyMemory: "MEMORY BANK INACTIVE",
    skipSim: "FAST-FORWARD BATTLE",
    completeSim: "TERMINATE SIMULATION",
    cumulativePower: "Cumulative Power:",
    npcMemoryLabel: "{opponent} Memory",
    resetBtnTitle: "Reset",
    nextStepBtnTitle: "Next Step",
    continueBtn: "Continue →",
    combatLogHeader: "▸ Combat Log",
    playerSelf: "Player",
    combatProtocolReady: "Combat Protocol Ready",
    combatProtocolDesc: "Ready to initialize neural battle loop. Standby while other combatants complete deck adjustments...",
    advancingSector: "Advancing Tournament Sector",
    advancingSectorDesc: "Standby while other combatants acknowledge standings. Awaiting sync trigger from neural mainframe...",
    battleArenaHeader: "⟁ Battle Arena ⟁",
    youSelf: "YOU",
    yourMemory: "Your Memory",
    deckRemaining: "Deck",
    stepLabel: "Step",
    accessLabel: "Access: ",
    noneLabel: "None",
    yourPlay: "◆ Your Play",
    enemyPlay: "◆ Enemy Play",
    awaitingCombatData: "Awaiting combat data...",
    powerLabel: "Power",
    syncingNeuralMatrix: "Syncing Neural Matrix",
    awaitingOpponentDecision: "Awaiting decisions from {name}...",
    discardBtn: "Discard",
    selectCardPrompt: "Select an Augmentation Card from Hand below",
    gridSimTerminated: "Grid Simulation Terminated",
    gridSimDesc: "All neural card components played. Dominance established over Sector.",
    discardMatrix: "Discard Matrix",
    handModules: "Hand Modules",
    yourAugmentationHand: "Your Augmentation Hand ({count} Modules Remaining)",
    noDrawAdvice: "Draw 1 card each step. Play or Discard wisely.",
    noHandRemaining: "No Augmentations Remaining in Hand Matrix.",
    viewManual: "System Manual",
    
    // Standings Screen
    standingsHeader: "MAIN MAINBOARD RANKINGS",
    wins: "WINS",
    fans: "FANS",
    nextRound: "INITIALIZE NEXT ROUND",
    endTournament: "CALCULATE FINAL STANDINGS",
    roundOf: "Round {round} of {maxRounds}",
    rankHeader: "Rank",
    combatantHeader: "Combatant",
    winsHeader: "Wins",
    fansHeader: "Fans",
    finalResultsBtn: "Final Results",
    nextRoundBtn: "Next Round",
    
    // Game Over Screen
    tournamentComplete: "TOURNAMENT MAINBOARD TERMINATED",
    champion: "ARENA CHAMPION",
    finalResults: "FINAL SYNAPSE RANKINGS",
    returnTitle: "RETURN TO CORE MAINBOARD",
    tournamentCompleteLabel: "/// Tournament Complete ///",
    victoryHeader: "VICTORY",
    championDesc: "You are the Champion of the Cyber-Dome!",
    tournamentOverHeader: "TOURNAMENT OVER",
    winnerClaimsThrone: "{name} claims the throne",
    playerFinalRank: "You finished in #{rank} place with {wins} wins and {fans} fans",
    finalRankingsHeader: "◈ Final Rankings ◈",
    playerWins: "{wins}W",
    newGameBtn: "New Game",

    // App Screen
    disconnectedMainframe: "DISCONNECTED: You have been kicked from the tournament mainframe.",
    acknowledgeBtn: "Acknowledge",
    Virus: "Virus",
    AI: "AI",
    Hardware: "Hardware",
    Netrunner: "Netrunner"
  },
  ja: {
    // Title Screen
    title: "電脳ドーム",
    subtitle: "ネオン・オートマタ",
    cyberDeck: "神経コア・インターフェース",
    combatName: "コバタント名 (プレイヤー名)",
    soloMode: "ソロ・アリーナ起動",
    soloDesc: "7人のAIボットを相手に、標準的なトーナメント形式で訓練を行います。",
    createLobby: "ネット・アリーナ作成",
    createDesc: "オンラインロビーを作成し、実在の人やAIコバタントを招待します。",
    joinLobby: "アリーナへ接続",
    joinDesc: "6桁のセクターコードを入力して、ロビーに接続します。",
    soloBtn: "ソロモード開始",
    createBtn: "セクター生成",
    joinBtn: "セクター接続",
    joinModalTitle: "グリッド接続確立",
    enterSectorCode: "セクターコードを入力してください",
    enterName: "名前を入力してください",
    cancel: "接続中断",
    connect: "接続確立",
    systemOnline: "/// システムオンライン ///",
    cyber: "電脳",
    dome: "ドーム",
    neonAutomata: "ネオン・オートマタ",
    injectCombatantId: "コバタントID注入 (表示名)",
    combatantPlaceholder: "プレイヤー名",
    jackInSolo: "ジャックイン (ソロモード)",
    multiplayerMatrix: "マルチプレイヤーマトリクス",
    createArena: "アリーナ生成",
    joinArena: "アリーナ参戦",
    multiplayerActive: "マルチプレイヤー接続有効化",
    connectToArenaKey: "アリーナキーに接続",
    enter6CharSectorCode: "6桁のアリーナコードを入力してください",
    cancelBtn: "キャンセル",
    connectBtn: "接続確立",
    
    // Lobby Screen
    arenaSector: "アリーナセクター",
    hostBadge: "ホスト",
    ready: "準備完了",
    standby: "待機中",
    activeComms: "通信ログ",
    sendPrompt: "メッセージを送信...",
    addNpcBtn: "NPCボットを配備",
    npcRosterLimit: "最大配備数に達しました (最大8スロット)",
    startTournament: "トーナメント初期化",
    waitingForHost: "メインボードからの同期を待機中...",
    playersConnected: "同期中のコバタント",
    minPlayersNeeded: "最低3名のコバタントが必要です",
    lobbyStatusWaiting: "参加者を待機中...",
    lobbyStatusPlaying: "現在対戦中...",
    establishingLink: "電脳ドームへのリンクを確立中...",
    arenaLobby: "アリーナロビー",
    syncLinkEstablished: "同期リンク確立完了",
    syncOffline: "同期リンク切断",
    lobbyKey: "ロビーキー:",
    copied: "コピー完了",
    copyKey: "キーをコピー",
    combatantRoster: "コバタント名簿 ({count}/8)",
    min3Required: "最低3名必要",
    youBadge: "あなた",
    purgeBtn: "除外",
    emptySlot: "[ 空きコバタントスロット ]",
    deployNpcBtn: "NPCボットを配備する",
    commsChannel: "通信チャンネル",
    commsInitialized: "通信ターミナルが初期化されました。セキュアサブレイヤー有効。",
    chatPlaceholder: "通信メッセージを注入...",
    gridLockError: "グリッドロック：マトリクス同期にはコバタント数が3人から8人である必要があります。",
    awaitingHostSignal: "ホストからの送信シグナルを待機中...",
    
    // Shop Screen
    round: "ラウンド",
    shopHeader: "闇マーケット接続中",
    credits: "クレジット",
    deckSize: "デッキスタックサイズ",
    reroll: "グリッド再ロール",
    rerollCost: "コスト: 1クレジット",
    deleteMode: "カード削除モード",
    deleteCost: "コスト: 2クレジット",
    readyForBattle: "戦闘準備完了",
    deckDraw: "デッキ内容",
    power: "パワー",
    cost: "コスト",
    rarity: "レア度",
    attr: "属性",
    arch: "スタイル",
    blackMarketHeader: "◈ 闇マーケット接続中 ◈",
    shopSubtitle: "インプラントの選択は慎重に行え",
    buyBtn: "購入 {cost}¢",
    insufficientCredits: "クレジット不足",
    noCardsAvailable: "カードがありません",
    tryRerolling: "リロールして在庫を更新してください",
    rerollText: "グリッド再ロール (1¢)",
    cancelDelete: "削除キャンセル",
    deleteCardText: "カード削除 (2¢)",
    enterArenaBtn: "アリーナへ突入する",
    yourDeckCount: "あなたのデッキ ({count} 枚)",
    deckEmpty: "デッキが空です",
    clickToDelete: "クリックして削除",
    deckLabel: "デッキ残り",
    viewDeckBtn: "デッキ確認",
    deckViewerModalTitle: "デッキ構成モジュール一覧",
    deleteInfoText: "1回の削除につき2クレジットを消費します。永久に削除されます。",
    
    // CardDisplay / MemorySlots
    memoryLabel: "メモリ容量: {filled}/{max}",
    emptySlotLabel: "空スロット",

    // Battle Screen
    battleStep: "シミュレーションステップ",
    claimsFlag: "がフラグを確保しました",
    flagHolderPower: "フラグホルダーのパワー",
    benchedMemory: "ベンチメモリ（待機スロット）",
    emptyMemory: "空のメモリバンク",
    skipSim: "バトル早送り",
    completeSim: "シミュレーション完了",
    cumulativePower: "累積パワー:",
    npcMemoryLabel: "{opponent} のメモリ",
    resetBtnTitle: "最初に戻る",
    nextStepBtnTitle: "次のステップ",
    continueBtn: "次へ進む →",
    combatLogHeader: "▸ 対戦ログフィード",
    playerSelf: "あなた",
    combatProtocolReady: "戦闘プロトコル初期化完了",
    combatProtocolDesc: "神経バトルループを初期化する準備ができました。他の対戦者がデッキ調整を完了するまで待機してください...",
    advancingSector: "トーナメントセクター進行中",
    advancingSectorDesc: "他の対戦者が順位を確認するまで待機してください。メインフレームからの同期トリガーを待っています...",
    battleArenaHeader: "⟁ バトルアリーナ ⟁",
    youSelf: "あなた",
    yourMemory: "あなたのメモリ",
    deckRemaining: "デッキ残り",
    stepLabel: "ステップ",
    accessLabel: "アクセス権取得：",
    noneLabel: "なし",
    yourPlay: "◆ あなたの送信",
    enemyPlay: "◆ 敵の送信",
    awaitingCombatData: "同期データを待機中...",
    powerLabel: "パワー",
    syncingNeuralMatrix: "神経同調中",
    awaitingOpponentDecision: "{name} の意思決定を待機中...",
    discardBtn: "廃棄",
    selectCardPrompt: "下のハンドからオーグメンテーションカードを選択してください",
    gridSimTerminated: "グリッドシミュレーション終了",
    gridSimDesc: "すべての神経カードコンポーネントが使用されました。セクターの支配権が確立されました。",
    discardMatrix: "廃棄マトリクス",
    handModules: "ハンドモジュール",
    yourAugmentationHand: "あなたのオーグメンテーションハンド（残り {count} モジュール）",
    noDrawAdvice: "毎ターン1枚ドローします。手札から慎重にプレイまたは廃棄してください。",
    noHandRemaining: "ハンドマトリクスに残りオーグメンテーションがありません。",
    viewManual: "システムマニュアル",
    
    // Standings Screen
    standingsHeader: "メインボード ランキング",
    wins: "勝利数",
    fans: "ファン数",
    nextRound: "次ラウンドに進む",
    endTournament: "最終結果を集計する",
    roundOf: "ラウンド {round} / {maxRounds}",
    rankHeader: "順位",
    combatantHeader: "コバタント",
    winsHeader: "勝利数",
    fansHeader: "ファン数",
    finalResultsBtn: "最終成績の集計",
    nextRoundBtn: "次のラウンドへ",
    
    // Game Over Screen
    tournamentComplete: "トーナメント終了",
    champion: "アリーナチャンピオン",
    finalResults: "最終ランキング一覧",
    returnTitle: "メインフレームに戻る",
    tournamentCompleteLabel: "/// トーナメント集計完了 ///",
    victoryHeader: "完全勝利",
    championDesc: "あなたが電脳ドームの覇者（チャンピオン）です！",
    tournamentOverHeader: "トーナメント終了",
    winnerClaimsThrone: "{name} が王座に君臨しました",
    playerFinalRank: "あなたの最終順位は #{rank} 位です（勝利数: {wins}、ファン数: {fans}）",
    finalRankingsHeader: "◈ 最終順位一覧 ◈",
    playerWins: "{wins}勝",
    newGameBtn: "メインコアへ戻る",

    // App Screen
    disconnectedMainframe: "接続切断：アリーナのメインフレームからキックされました。",
    acknowledgeBtn: "確認",
    Virus: "ウイルス",
    AI: "AI",
    Hardware: "ハードウェア",
    Netrunner: "ネットランナー"
  }
};

// Card Translation Map (80 unique card IDs)
const cardDictJa: Record<string, { name: string; effect: string }> = {
  // === Starter Cards ===
  starter_virus_1: { name: "グリッチワーム・ジュニア", effect: "シンプルな攻撃コード（効果なし）" },
  starter_virus_2: { name: "バッファオーバーフロー・ジュニア", effect: "シンプルな攻撃コード（効果なし）" },
  starter_ai_1: { name: "線形回帰モデル", effect: "シンプルな学習モデル（効果なし）" },
  starter_ai_2: { name: "ヒューリスティック・ヘルパー", effect: "シンプルな学習モデル（効果なし）" },
  starter_hw_1: { name: "銅製バスバー", effect: "シンプルな熱伝導体（効果なし）" },
  starter_hw_2: { name: "標準シールド", effect: "シンプルな物理シールド（効果なし）" },
  starter_nr_1: { name: "グリッド・ルーキー", effect: "シンプルなネットワークトレース（効果なし）" },
  starter_nr_2: { name: "プロキシ・ノード", effect: "シンプルなルーティングホップ（効果なし）" },
  starter_net_1: { name: "データ・パイプライン", effect: "シンプルな情報転送ライン（効果なし）" },
  starter_ai_3: { name: "ロジック・ノード", effect: "シンプルな決定木（効果なし）" },

  // === Virus (virus_001 to virus_020) ===
  virus_001: { name: "グリッチワーム", effect: "公開時：敵の先頭カードパワーを -2" },
  virus_002: { name: "データリーチ", effect: "勝利時：敵のデッキからトップカードを永久に削除" },
  virus_003: { name: "トロジャンスパイク", effect: "公開時：敵の次のカード効果を無効化する" },
  virus_004: { name: "ワームクラスター", effect: "公開時：敵の先頭カードパワーを -2" },
  virus_005: { name: "バイトシュレッダー", effect: "勝利時：敵のデッキからトップカードを永久に削除" },
  virus_006: { name: "プラグパケット", effect: "公開時：敵の次のカード効果を無効化する" },
  virus_007: { name: "オーバークロックグリッチ", effect: "公開時：自身のデッキトップを削除しパワー +5" },
  virus_008: { name: "メモリブリード", effect: "公開時：敵の先頭カードパワーを -3" },
  virus_009: { name: "ランサムウェアプロ", effect: "公開時：敵の先頭カードパワーを -4" },
  virus_010: { name: "バッファオーバーフロー", effect: "メモリ内の「ウイルス」属性1枚につきパワー +2" },
  virus_011: { name: "フォーク爆弾", effect: "メモリ内の「ウイルス」属性1枚につきパワー +2" },
  virus_012: { name: "ロジック爆弾", effect: "メモリ内の「ウイルス」属性1枚につきパワー +2" },
  virus_013: { name: "ゼロデイ・スパイク", effect: "勝利時：敵のデッキからトップカードを2枚削除" },
  virus_014: { name: "スパム急流", effect: "直前のカードが「ウイルス」属性だった場合パワー +3" },
  virus_015: { name: "スパイウェア・ベクタ", effect: "直前のカードが「ウイルス」属性だった場合パワー +3" },
  virus_016: { name: "ルートキットカーネル", effect: "公開時：自身のデッキトップを削除しパワー +5" },
  virus_017: { name: "アドウェアポップ", effect: "メモリを占有しているカード1枚につきパワー +1" },
  virus_018: { name: "フィッシングベイト", effect: "公開時：敵の次のカードをのぞき見る" },
  virus_019: { name: "シェルコードインジェクタ", effect: "公開時：敵の次のカードをのぞき見る" },
  virus_020: { name: "マルウェアエンジン", effect: "純粋な高パワー攻撃用プログラム（効果なし）" },

  // === AI (ai_001 to ai_020) ===
  ai_001: { name: "ニューラルスタック", effect: "メモリ内の「AI」属性1枚につきパワー +2" },
  ai_002: { name: "ディープラーニング", effect: "メモリ内に同名カードがある場合パワーが2倍" },
  ai_003: { name: "シナプス・クラスター", effect: "直前のカードが「AI」属性だった場合パワー +3" },
  ai_004: { name: "帰納的マインド", effect: "メモリ内に同名カードがある場合パワーが2倍" },
  ai_005: { name: "テンサーコア", effect: "メモリ内の「AI」属性1枚につきパワー +2" },
  ai_006: { name: "ロジックゲート", effect: "直前のカードが「AI」属性だった場合パワー +3" },
  ai_007: { name: "ヒューリスティック解法", effect: "メモリ内に同名カードがある場合パワーが2倍" },
  ai_008: { name: "量子ニューラル", effect: "メモリ内に同名カードがある場合パワーが2倍" },
  ai_009: { name: "シグモイドノード", effect: "直前のカードが「AI」属性だった場合パワー +3" },
  ai_010: { name: "勾配降下法", effect: "直前のカードが「AI」属性だった場合パワー +3" },
  ai_011: { name: "誤差逆伝播エージェント", effect: "メモリ内の「AI」属性1枚につきパワー +2" },
  ai_012: { name: "GPTエージェント v1", effect: "メモリを占有しているカード1枚につきパワー +1" },
  ai_013: { name: "GPTエージェント v2", effect: "メモリを占有しているカード1枚につきパワー +1" },
  ai_014: { name: "AGIメインフレーム", effect: "メモリを占有しているカード1枚につきパワー +2" },
  ai_015: { name: "パターン認識プログラム", effect: "敵の直前のカードが「AI」属性ならパワー +4" },
  ai_016: { name: "ボットネット制御機構", effect: "敵の直前のカードが「ウイルス」属性ならパワー +4" },
  ai_017: { name: "マシンビジョン", effect: "敵の直前のカードが「ネットランナー」属性ならパワー +4" },
  ai_018: { name: "強化学習エージェント", effect: "自身のデッキ枚数が敵より少ない場合パワー +3" },
  ai_019: { name: "監視ネットワーク", effect: "公開時：敵の次のカードをのぞき見る" },
  ai_020: { name: "特異点コア", effect: "巨大なAIデータベースプログラム（効果なし）" },

  // === Hardware (hw_001 to hw_020) ===
  hw_001: { name: "ファイアウォール・プライム", effect: "メモリに置かれた際、20%の確率でスロットを消費しない" },
  hw_002: { name: "ICEバリア", effect: "防衛時：敵デッキの最高パワーカードを1ターンロック" },
  hw_003: { name: "RAM最適化ツール", effect: "メモリに置かれた際、消費スロット数を1減少させる" },
  hw_004: { name: "量子コア", effect: "メモリに置かれた際、20%の確率でスロットを消費しない" },
  hw_005: { name: "シリコンシールド", effect: "メモリに置かれた際、消費スロット数を1減少させる" },
  hw_006: { name: "フラックス・コンデンサ", effect: "防衛時：敵デッキの最高パワーカードを1ターンロック" },
  hw_007: { name: "RAM拡張パーツ", effect: "メモリに置かれた際、50%の確率でスロットを消費しない" },
  hw_008: { name: "ソリッドステート・ドライブ", effect: "メモリに置かれた際、50%の確率でスロットを消費しない" },
  hw_009: { name: "仮想メモリ", effect: "メモリに置かれた際、100%スロットを消費しない" },
  hw_010: { name: "液体冷却システム", effect: "メモリ内の「ハードウェア」1枚につきパワー +2" },
  hw_011: { name: "銅製ヒートパイプ", effect: "メモリ内の「ハードウェア」1枚につきパワー +2" },
  hw_012: { name: "グラフェンヒートシンク", effect: "メモリ内の「ハードウェア」1枚につきパワー +2" },
  hw_013: { name: "グリッド安定化装置", effect: "直前のカードが「ハードウェア」属性だった場合パワー +3" },
  hw_014: { name: "マザーボードノード", effect: "直前のカードが「ハードウェア」属性だった場合パワー +3" },
  hw_015: { name: "ファラデーケージ", effect: "敵の直前のカードが「ハードウェア」属性ならパワー +4" },
  hw_016: { name: "デコイサーバー", effect: "防衛時：敵デッキの最低パワーカードを1ターンロック" },
  hw_017: { name: "ハニーポット", effect: "防衛時：敵デッキの最高パワーカードを2ターンロック" },
  hw_018: { name: "非常用ジェネレータ", effect: "自身のデッキ枚数が敵より多い場合パワー +3" },
  hw_019: { name: "静的ガード回路", effect: "メモリを占有しているカード1枚につきパワー +1" },
  hw_020: { name: "メインフレーム筐体", effect: "物理防衛用の超頑丈なシャーシ（効果なし）" },

  // === Netrunner (nr_001 to nr_020) ===
  nr_001: { name: "ゴーストランナー", effect: "公開時：敵の次のカードをのぞき見る" },
  nr_002: { name: "暗号化エージェント", effect: "防衛時：30%の確率で攻撃をリダイレクト（フラグホルダーを戻す）" },
  nr_003: { name: "プロキシシールド", effect: "メモリ内にある間、自身のすべてのカードのパワー +1" },
  nr_004: { name: "ネオン・ファントム", effect: "公開時：敵の次のカードをのぞき見る" },
  nr_005: { name: "シャドーブローカー", effect: "防衛時：30%の確率で攻撃をリダイレクト（フラグホルダーを戻す）" },
  nr_006: { name: "データベール", effect: "メモリ内にある間、自身のすべてのカードのパワー +1" },
  nr_007: { name: "リダイレクトゲートウェイ", effect: "防衛時：50%の確率で攻撃をリダイレクト（フラグホルダーを戻す）" },
  nr_008: { name: "暗号化ノード", effect: "メモリ内の「ネットランナー」1枚につきパワー +2" },
  nr_009: { name: "ダークウェブプロキシ", effect: "メモリ内の「ネットランナー」1枚につきパワー +2" },
  nr_010: { name: "メインフレームジャック", effect: "メモリ内の「ネットランナー」1枚につきパワー +2" },
  nr_011: { name: "グリッドウォーク", effect: "直前のカードが「ネットランナー」だった場合パワー +3" },
  nr_012: { name: "サブネットハッカー", effect: "直前のカードが「ネットランナー」だった場合パワー +3" },
  nr_013: { name: "シグナルブースター", effect: "メモリ内にある間、自身のすべてのカードのパワー +1" },
  nr_014: { name: "データブローカー", effect: "メモリ内にある間、自身のすべてのカードのパワー +2" },
  nr_015: { name: "デッキリサイクラー", effect: "メモリに置かれた際、自身の複製カードをデッキ底に追加" },
  nr_016: { name: "メモリリーカー", effect: "メモリに置かれた際、自身の複製カードをデッキ底に追加" },
  nr_017: { name: "デフラグメンタ", effect: "メモリに置かれた際、自身の複製カードをデッキ底に追加" },
  nr_018: { name: "イントルーダーエージェント", effect: "敵の直前のカードが「ネットランナー」ならパワー +4" },
  nr_019: { name: "トレースバスター", effect: "敵の直前のカードが「ハードウェア」ならパワー +4" },
  nr_020: { name: "エリート・オペレータ", effect: "アリーナを支配する凄腕ネットランナー（効果なし）" }
};

// Attribute, Archetype, Rarity translations
const attributeJa: Record<string, string> = {
  Virus: "ウイルス",
  AI: "AI",
  Hardware: "ハードウェア",
  Netrunner: "ネットランナー"
};

const archetypeJa: Record<string, string> = {
  Aggro: "アグロ",
  Combo: "コンボ",
  Control: "コントロール"
};

const rarityJa: Record<string, string> = {
  Common: "コモン",
  Rare: "レア",
  Epic: "エピック"
};

// English Card Name to Japanese Card Name mapping (80 unique cards)
const enCardNameToJa: Record<string, string> = {
  // Starter Cards
  "Glitch Worm Jr.": "グリッチワーム・ジュニア",
  "Buffer Overflow Jr.": "バッファオーバーフロー・ジュニア",
  "Linear Regressor": "線形回帰モデル",
  "Heuristic Helper": "ヒューリスティック・ヘルパー",
  "Copper Busbar": "銅製バスバー",
  "Standard Shield": "標準シールド",
  "Grid Rookie": "グリッド・ルーキー",
  "Proxy Node": "プロキシ・ノード",
  "Data Pipeline": "データ・パイプライン",
  "Logic Node": "ロジック・ノード",

  // Virus
  "Glitch Worm": "グリッチワーム",
  "Data Leech": "データリーチ",
  "Trojan Spike": "トロジャンスパイク",
  "Worm Cluster": "ワームクラスター",
  "Byte Shredder": "バイトシュレッダー",
  "Plague Packet": "プラグパケット",
  "Overclock Glitch": "オーバークロックグリッチ",
  "Memory Bleed": "メモリブリード",
  "Ransomware Pro": "ランサムウェアプロ",
  "Buffer Overflow": "バッファオーバーフロー",
  "Fork Bomb": "フォーク爆弾",
  "Logic Bomb": "ロジック爆弾",
  "Zero Day Spike": "ゼロデイ・スパイク",
  "Spam Torrent": "スパム急流",
  "Spyware Vector": "スパイウェア・ベクタ",
  "Rootkit Kernel": "ルートキットカーネル",
  "Adware Pop": "アドウェアポップ",
  "Phishing Bait": "フィッシングベイト",
  "Shellcode Injector": "シェルコードインジェクタ",
  "Malware Engine": "マルウェアエンジン",

  // AI
  "Neural Stack": "ニューラルスタック",
  "Deep Learning": "ディープラーニング",
  "Synapse Cluster": "シナプス・クラスター",
  "Recursive Mind": "帰納的マインド",
  "Tensor Core": "テンサーコア",
  "Logic Gate": "ロジックゲート",
  "Heuristic Solver": "ヒューリスティック解法",
  "Quantum Neural": "量子ニューラル",
  "Sigmoid Node": "シグモイドノード",
  "Gradient Descent": "勾配降下法",
  "Backprop Agent": "誤差逆伝播エージェント",
  "GPT Agent v1": "GPTエージェント v1",
  "GPT Agent v2": "GPTエージェント v2",
  "AGI Mainframe": "AGIメインフレーム",
  "Pattern Recognizer": "パターン認識プログラム",
  "Botnet Controller": "ボットネット制御機構",
  "Machine Vision": "マシンビジョン",
  "Reinforcement Learner": "強化学習エージェント",
  "Supervised Net": "監視ネットワーク",
  "Singularity Core": "特異点コア",

  // Hardware
  "Firewall Prime": "ファイアウォール・プライム",
  "ICE Barrier": "ICEバリア",
  "RAM Optimizer": "RAM最適化ツール",
  "Quantum Core": "量子コア",
  "Silicon Shield": "シリコンシールド",
  "Flux Capacitor": "フラックス・コンデンサ",
  "RAM Expander": "RAM拡張パーツ",
  "Solid State Drive": "ソリッドステート・ドライブ",
  "Virtual Memory": "仮想メモリ",
  "Liquid Cooler": "液体冷却システム",
  "Copper Heatpipe": "銅製ヒートパイプ",
  "Graphene Heatsink": "グラフェンヒートシンク",
  "Grid Stabilizer": "グリッド安定化装置",
  "Motherboard Node": "マザーボードノード",
  "Faraday Cage": "ファラデーケージ",
  "Decoy Server": "デコイサーバー",
  "Honey Pot": "ハニーポット",
  "Backup Generator": "非常用ジェネレータ",
  "Static Guard": "静的ガード回路",
  "Mainframe Chassis": "メインフレーム筐体",

  // Netrunner
  "Ghost Runner": "ゴーストランナー",
  "Cipher Agent": "暗号化エージェント",
  "Proxy Shield": "プロキシシールド",
  "Neon Phantom": "ネオン・ファントム",
  "Shadow Broker": "シャドーブローカー",
  "Data Veil": "データベール",
  "Redirect Gateway": "リダイレクトゲートウェイ",
  "Encrypted Node": "暗号化ノード",
  "Dark Web Proxy": "ダークウェブプロキシ",
  "Mainframe Jack": "メインフレームジャック",
  "Grid Walk": "グリッドウォーク",
  "Subnet Hacker": "サブネットハッカー",
  "Signal Booster": "シグナルブースター",
  "Data Broker": "データブローカー",
  "Deck Recycler": "デッキリサイクラー",
  "Memory Leaker": "メモリリーカー",
  "Defragmenter": "デフラグメンタ",
  "Intruder Agent": "イントルーダーエージェント",
  "Trace Buster": "トレースバスター",
  "Elite Operative": "エリート・オペレータ"
};

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(() => {
    const saved = localStorage.getItem('cyber_dome_locale');
    if (saved === 'ja' || saved === 'en') {
      return saved;
    }
    // Fallback to browser language if Japanese
    return navigator.language.startsWith('ja') ? 'ja' : 'en';
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('cyber_dome_locale', newLocale);
  }, []);

  const t = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    let text = uiDict[locale][key] || key;
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
      });
    }
    return text;
  }, [locale]);

  // Localizes a card on-the-fly without casting as any
  const translateCard = useCallback((card: Card): LocalizedCard => {
    if (locale === 'en') {
      return {
        ...card,
        attribute: card.attribute,
        archetype: card.archetype,
        rarity: card.rarity
      };
    }
    const jaInfo = cardDictJa[card.id];
    return {
      ...card,
      name: jaInfo ? jaInfo.name : card.name,
      effect: jaInfo ? jaInfo.effect : card.effect,
      attribute: attributeJa[card.attribute] || card.attribute,
      archetype: archetypeJa[card.archetype] || card.archetype,
      rarity: rarityJa[card.rarity] || card.rarity
    };
  }, [locale]);

  const translateCardName = useCallback((name: string): string => {
    if (locale === 'en' || !name) return name;
    return enCardNameToJa[name] || name;
  }, [locale]);

  // Translates complex backend battle detail strings to Japanese
  const translateBattleDetail = useCallback((detail: string): string => {
    if (locale === 'en' || !detail) return detail;
    let translated = detail;

    // Apply translations recursively based on phrases
    const phrases = [
      // Hand play interactive logs
      { en: "Clash! (.*) \\((\\d+) POW\\) vs (.*) \\((\\d+) POW\\)", ja: "アリーナ激突：$1 ($2 POW) vs $3 ($4 POW)" },
      { en: "(.*) played (.*) \\((\\d+) POW\\)\\. (.*) discarded\\.", ja: "$1 が $2 ($3 POW) をアリーナに展開。$4 は手札を廃棄。" },
      { en: "Both players chose to discard\\. Grid matrix is stagnant\\.", ja: "双方とも手札を廃棄。電脳アリーナのエネルギーは膠着しています。" },
      { en: "Memory Overflow! (.*) has exhausted unique memory capacity limit\\.", ja: "メモリオーバーフロー！$1 はユニークメモリの許容限界に達しました。" },
      { en: "Tournament Grid Exhausted\\. (.*) claims absolute dominance!", ja: "電脳グリッド完全消費。$1 がアリーナの支配権を掌握しました！" },

      { en: "claims the flag", ja: "がフラグを確保しました" },
      { en: "Challenger cumulative power:", ja: "挑戦者の累積パワー：" },
      { en: "vs flag:", ja: "対 フラグパワー：" },
      { en: "cannot draw", ja: "がカードを引けません" },
      { en: "No cards left", ja: "残りカードがありません" },
      { en: "ran out of cards", ja: "のカードが尽きました" },
      { en: "Card sent to memory", ja: "カードがメモリに送られました" },
      { en: "benched to", ja: "がベンチメモリに送られました" },
      { en: "memory overflow", ja: "メモリがオーバーフローしました" },
      { en: "recycled: appended to owner's deck", ja: "が再利用され、オーナーのデッキに追加されました" },
      { en: "On-win effect triggered", ja: "勝利時効果が発動" },
      { en: "Defend effect from memory", ja: "メモリからの防衛効果が発動" },
      { en: "Flag redirected!", ja: "フラグがリダイレクトされました！" },
      { en: "Redirect successful", ja: "リダイレクト成功" },
      { en: "Flag claimed by", ja: "フラグ確保：" },
      { en: "now holds the flag with power", ja: "がパワーでフラグを保持しています：" },
      { en: "wins — both decks exhausted", ja: "が勝利しました（両者のデッキ切れ）" },
      { en: "Player wins — CPU has no cards to challenge", ja: "プレイヤーの勝利（CPUの挑戦カード不足）" },
      { en: "CPU wins — Player has no cards to challenge", ja: "CPUの勝利（プレイヤーの挑戦カード不足）" },
      { en: "Battle ended due to step limit", ja: "ステップ数上限に達したため戦闘を終了します" },
      { en: "No opponent matched this round (Bye)", ja: "このラウンドは対戦相手がいません（不戦勝）" },
      { en: "received a bye in this round.", ja: "はこのラウンド不戦勝（BYE）となりました。" },
      { en: "received a bye.", ja: "は不戦勝となりました。" },

      // Card reveal phrases
      { en: "reduces flag holder power by 2 \\(now (\\d+)\\)", ja: "がフラグホルダーのパワーを2減少させました（現在：$1）" },
      { en: "reduces flag holder power by 3 \\(now (\\d+)\\)", ja: "がフラグホルダーのパワーを3減少させました（現在：$1）" },
      { en: "reduces flag holder power by 4 \\(now (\\d+)\\)", ja: "がフラグホルダーのパワーを4減少させました（現在：$1）" },
      { en: "nullifies the next enemy card effect", ja: "が敵の次のカード効果を無効化しました" },
      { en: "gains \\+(\\d+) power \\((\\d+) AI in memory\\)", ja: "がパワー +$1 を獲得しました（メモリ内のAIカード数：$2）" },
      { en: "gains \\+(\\d+) power \\((\\d+) Virus in memory\\)", ja: "がパワー +$1 を獲得しました（メモリ内のウイルスカード数：$2）" },
      { en: "gains \\+(\\d+) power \\((\\d+) Hardware in memory\\)", ja: "がパワー +$1 を獲得しました（メモリ内のハードウェアカード数：$2）" },
      { en: "gains \\+(\\d+) power \\((\\d+) Netrunner in memory\\)", ja: "がパワー +$1 を獲得しました（メモリ内のネットランナーカード数：$2）" },
      { en: "gains \\+(\\d+) power \\((\\d+) total cards benched\\)", ja: "がパワー +$1 を獲得しました（ベンチメモリの合計カード数：$2）" },
      { en: "power doubled \\(same name in memory\\) -> (\\d+)", ja: "のパワーが2倍になりました（メモリに同名カードあり）：$1" },
      { en: "No same-name card in memory", ja: "メモリに同名カードがありません" },
      { en: "gains \\+3 power \\(previous card was AI\\)", ja: "がパワー +3 を獲得しました（前のカードがAI属性）" },
      { en: "gains \\+3 power \\(previous card was Virus\\)", ja: "がパワー +3 を獲得しました（前のカードがウイルス属性）" },
      { en: "gains \\+3 power \\(previous card was Hardware\\)", ja: "がパワー +3 を獲得しました（前のカードがハードウェア属性）" },
      { en: "gains \\+3 power \\(previous card was Netrunner\\)", ja: "がパワー +3 を獲得しました（前のカードがネットランナー属性）" },
      { en: "Previous card was not", ja: "前のカードが以下ではありませんでした：" },
      { en: "gains \\+4 power vs AI flag holder", ja: "がパワー +4 を獲得しました（敵フラグホルダーがAI属性）" },
      { en: "gains \\+4 power vs Virus flag holder", ja: "がパワー +4 を獲得しました（敵フラグホルダーがウイルス属性）" },
      { en: "gains \\+4 power vs Hardware flag holder", ja: "がパワー +4 を獲得しました（敵フラグホルダーがハードウェア属性）" },
      { en: "gains \\+4 power vs Netrunner flag holder", ja: "がパワー +4 を獲得しました（敵フラグホルダーがネットランナー属性）" },
      { en: "Enemy flag holder is not", ja: "敵フラグホルダーが以下ではありませんでした：" },
      { en: "gains \\+3 power \\(own deck (\\d+) vs enemy (\\d+)\\)", ja: "がパワー +3 を獲得しました（自身デッキ $1枚 vs 敵 $2枚）" },
      { en: "is not smaller than enemy's", ja: "は敵デッキより少なくありません" },
      { en: "is not larger than enemy's", ja: "は敵デッキより多くありません" },
      { en: "deleted own card (\\S+) to gain \\+5 power \\(total (\\d+)\\)", ja: "が自身のカード $1 を削除してパワー +5 を獲得しました（合計パワー：$2）" },
      { en: "found own deck empty, no card to delete", ja: "のデッキが空のため、削除するカードがありませんでした" },
      { en: "peeks: enemy next card is (\\S+) \\(power (\\d+)\\)", ja: "が敵デッキトップをのぞき見しました：$1（パワー $2）" },
      { en: "peeks: enemy deck is empty", ja: "が敵デッキトップをのぞき見しました：デッキは空です" },
      { en: "Bench bonus applied: \\+(\\d+) power", ja: "ベンチボーナス適用：パワー +$1" },
      { en: "No effect on reveal", ja: "公開時効果はありません" },
      { en: "No effect", ja: "効果なし" },

      // Defend / Win Card details
      { en: "locks enemy card (\\S+) \\(power (\\d+)\\) with double security", ja: "が敵のカード $1（パワー $2）を強力にロックしました" },
      { en: "locks enemy card (\\S+) \\(power (\\d+)\\)", ja: "が敵のカード $1（パワー $2）をロックしました" },
      { en: "No enemy card to lock", ja: "ロックする敵カードがありません" },
      { en: "REDIRECTED! Flag holder swaps back", ja: "リダイレクト発動！フラグホルダーが攻撃元に引き戻されました" },
      { en: "redirect failed", ja: "リダイレクト失敗" },
      { en: "deleted enemy card: (\\S+)", ja: "が敵デッキからカード $1 を永久に削除しました" },
      { en: "deleted enemy cards: \\[(.*)\\]", ja: "が敵デッキからカード $1 を永久に削除しました" }
    ];

    // Localize card names dynamically inside logs too using enCardNameToJa mapping
    Object.keys(enCardNameToJa).forEach(enName => {
      const escaped = enName.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
      const nameRegex = new RegExp(`\\b${escaped}\\b`, 'g');
      translated = translated.replace(nameRegex, enCardNameToJa[enName]);
    });

    for (const phrase of phrases) {
      const regex = new RegExp(phrase.en, 'g');
      translated = translated.replace(regex, phrase.ja);
    }

    return translated;
  }, [locale]);

  // Translates results summaries
  const translateBattleResult = useCallback((text: string): string => {
    if (locale === 'en' || !text) return text;
    if (text.startsWith("BYE:")) {
      return "BYE: 不戦勝！(+1 ファン)";
    }
    if (text.startsWith("VICTORY:")) {
      const match = text.match(/VICTORY: Decrypted (.*)'s defense grid. \(\+(\d+) Fans\)/);
      if (match) {
        return `勝利：${match[1]}の防衛グリッドをデコードしました。(+${match[2]} ファン)`;
      }
    }
    if (text.startsWith("DEFEAT:")) {
      const match = text.match(/DEFEAT: Synaptic link hijacked by (.*). \(No fans gained\)/);
      if (match) {
        return `敗北：${match[1]}にシナプス・リンクをハックされました。(ファン獲得なし)`;
      }
    }
    return text;
  }, [locale]);

  return (
    <TranslationContext.Provider value={{ locale, setLocale, t, translateCard, translateCardName, translateBattleDetail, translateBattleResult }}>
      {children}
    </TranslationContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
