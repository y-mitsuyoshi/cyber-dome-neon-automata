import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Card } from '../types/game';
import { stripInstanceSuffix } from '../utils/cardImage';

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
    deleteCardText: "Delete Card (Free)",
    enterArenaBtn: "Enter the Arena",
    yourDeckCount: "Your Deck ({count} cards)",
    deckEmpty: "Your deck is empty",
    clickToDelete: "Click to delete",
    deckLabel: "Deck",
    viewDeckBtn: "View Deck",
    deckViewerModalTitle: "DECK COMPONENT MATRIX",
    deleteInfoText: "DELETION IS COMPLETELY FREE. REMOVED PERMANENTLY.",
    
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
    returnTitle: "Return to Top Page",
    returnToTop: "Return to Top Page",
    tournamentCompleteLabel: "/// Tournament Complete ///",
    victoryHeader: "VICTORY",
    championDesc: "You are the Champion of the Cyber-Dome!",
    tournamentOverHeader: "TOURNAMENT OVER",
    winnerClaimsThrone: "{name} claims the throne",
    playerFinalRank: "You finished in #{rank} place with {wins} wins and {fans} fans",
    finalRankingsHeader: "◈ Final Rankings ◈",
    playerWins: "{wins}W",
    newGameBtn: "Return to Top Page",
    championAnnounce: "CHAMPION: {name}",
    rankGold: "Gold",
    rankSilver: "Silver",
    rankBronze: "Bronze",
    yourResultSummary: "YOUR FINAL RECORD",
    finalistBadge: "FINALIST",
    championBadge: "CHAMPION",
    rankUp: "▲",
    rankDown: "▼",
    rankSame: "−",
    battleFinished: "BATTLE CONCLUDED",
    battleVictory: "VICTORY",
    battleDefeat: "DEFEAT",
    reasonMemoryOverflow: "Bench overflow",
    reasonDeckEmpty: "Deck exhausted",
    reasonBattleComplete: "All cards played",
    totalPowLabel: "TOTAL {pow} POW",
    drawPlaceholder: "Draw a card",
    waitingPlaceholder: "Waiting...",
    statusYouLabel: "YOU",
    statusDrewCard: '{name} flipped "{card}" (POW {power})!',
    statusDrewCardGeneric: "{name} flipped a card",
    statusFlagTaken: "🚩 {name} took the flag! (Defense POW: {power})",
    statusMemoryOverflow: "⚠️ {name}'s memory overflowed!",
    statusDeckEmpty: "🚫 {name}'s deck ran out!",
    awaitingOpponentCard: "Awaiting {name}'s card",
    drawYourCard: "Flip your card",
    defendingLabel: "{name}: Defending",
    challengingLabel: "{name}: Challenging",
    needMorePow: "{needed} more POW needed",
    flagStolen: "FLAG STOLEN!",
    progressLabel: "Progress:",
    choiceTitleReporter: "REPORTER EFFECT TRIGGERED",
    choiceInstrReporter: "Select 1 card from the top of your deck. The selected card becomes the top of your deck; the other is placed on the bottom.",
    choiceTitleJuggler: "JUGGLER EFFECT TRIGGERED",
    choiceInstrJuggler: "Select the top cards of your deck in the order you want them. The first selected card becomes the top of the deck.",
    choiceTitleSailor: "SAILOR EFFECT TRIGGERED",
    choiceInstrSailor: "Select 1 card from your deck to move to the bottom (to the top for Prophet).",
    choiceTitleButler: "BUTLER EFFECT TRIGGERED",
    choiceInstrButler: "Select up to 2 cards from your bench to banish. (You may select none.)",
    choiceTitleMagician: "MAGICIAN EFFECT TRIGGERED",
    choiceInstrMagician: "Select 1 card with POW 3 or less from your bench to banish.",
    choiceTitleVampire: "VAMPIRE EFFECT TRIGGERED",
    choiceInstrVampire: "Select 1 Deck B card from your bench to return to the top of your deck.",
    choiceTitleMoviestar: "MOVIESTAR EFFECT TRIGGERED",
    choiceInstrMoviestar: "Select up to 2 HoloMedia cards with POW 1 or 2 from your bench to return to the top of your deck.",
    choiceTitleSiren: "SIREN EFFECT TRIGGERED",
    choiceInstrSiren: "Select 1 card from the opponent's bench to send to the banish zone.",
    choiceTitleGeneric: "CARD EFFECT TRIGGERED",
    choiceInstrGeneric: "Select a card.",
    drawBtnDrawOwn: "Flip from your deck",
    drawBtnDefendWait: "Defending — awaiting next challenge",
    drawBtnChallenge: "Challenge! Flip from your deck",
    drawBtnOppDraw: "Flip from {name}'s deck",
    drawBtnOppDefend: "{name} defending — flip next",
    drawBtnOppChallenge: "{name} challenging — flip opponent's deck",
    bannerDrawOwn: ">> Flip a card from your deck <<",
    bannerDefend: ">> You are defending — opponent draws next <<",
    bannerChallenge: ">> Challenge! Flip from your deck <<",
    bannerOppDraw: ">> {name} flips from their deck <<",
    bannerOppDefend: ">> {name} is defending — you flip next <<",
    bannerOppChallenge: ">> {name} is challenging — flips opponent's deck <<",
    effectChoicePending: "EFFECT CHOICE PENDING",
    opponentEffectChoosing: "Awaiting {name}'s choice...",
    shopPoolBand: "CARD TIER: {band}",
    shopPoolNext: "Tier {band} unlocks at Round {round}",
    insufficientBy: "Short {amount}¢",

    // App Screen
    disconnectedMainframe: "DISCONNECTED: You have been kicked from the tournament mainframe.",
    acknowledgeBtn: "Acknowledge",
    matchupsHeader: "Matchups",
    activeEncounters: "Active Encounters",
    Mainframe: "Mainframe",
    Sector: "Sector",
    Orbit: "Orbit",
    HoloMedia: "HoloMedia",
    DeepWeb: "DeepWeb",
    Daemon: "Daemon",
    Matrix: "Matrix",
    None: "None",
    units: "Units",
    initializingArenaLink: "INITIALIZING INTERACTIVE ARENA LINK...",
    drawNextCard: "Draw Card",
    opponentDrawNext: "Draw Opponent",
    nextStep: "Next Step",
    continueToStandings: "View Standings →",
    confirmChoice: "Confirm",
    skipChoice: "Skip",
    pauseLabel: "Pause",
    autoLabel: "Auto",
    speedLabel: "Speed",
    eventsCount: "{count} events",
    stepShort: "Step {step}",
    waitingForOpponents: "Waiting for Opponents",
    waitingForOpponentsDesc: "Waiting for other combatants...",
    finalsLabel: "FINALS",
    confirmBtn: "Confirm",
    systemFooterName: "Antigravity NetLink-982",
    systemFooterSubtitle: "Cyber-Dome Autonomous Grid System",
    modeMultiplayer: "Multiplayer",
    modeSolo: "Solo",
    audioOff: "Audio Off",
    audioOn: "Audio On",
    muteAudio: "Mute Audio",
    unmuteAudio: "Unmute Audio",
    systemManual: "System Manual",
    manualLoading: "Loading Data Archives...",
    manualLoadError: "Failed to load manual data from archives.",
    spectatorMode: "Spectator Mode",
    spectateBtn: "Spectate",
    spectateDesc: "Watch the arena in read-only mode.",
    spectatingSector: "SPECTATING SECTOR",
    loadingSpectator: "Linking to spectator feed...",
    spectateError: "Failed to connect to spectator feed."
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
    deleteCardText: "カード削除 (無料)",
    enterArenaBtn: "アリーナへ突入する",
    yourDeckCount: "あなたのデッキ ({count} 枚)",
    deckEmpty: "デッキが空です",
    clickToDelete: "クリックして削除",
    deckLabel: "デッキ残り",
    viewDeckBtn: "デッキ確認",
    deckViewerModalTitle: "デッキ構成モジュール一覧",
    deleteInfoText: "カードの削除は完全に無料です。永久に削除されます。",
    
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
    returnTitle: "トップページに戻る",
    returnToTop: "トップページに戻る",
    tournamentCompleteLabel: "/// トーナメント集計完了 ///",
    victoryHeader: "完全勝利",
    championDesc: "あなたが電脳ドームの覇者（チャンピオン）です！",
    tournamentOverHeader: "トーナメント終了",
    winnerClaimsThrone: "{name} が王座に君臨しました",
    playerFinalRank: "あなたの最終順位は #{rank} 位です（勝利数: {wins}、ファン数: {fans}）",
    finalRankingsHeader: "◈ 最終順位一覧 ◈",
    playerWins: "{wins}勝",
    newGameBtn: "トップページに戻る",
    championAnnounce: "チャンピオン: {name}",
    rankGold: "金",
    rankSilver: "銀",
    rankBronze: "銅",
    yourResultSummary: "あなたの最終戦績",
    finalistBadge: "決勝進出",
    championBadge: "チャンピオン",
    rankUp: "▲",
    rankDown: "▼",
    rankSame: "−",
    battleFinished: "バトル決着",
    battleVictory: "勝利",
    battleDefeat: "敗北",
    reasonMemoryOverflow: "メモリオーバーフロー",
    reasonDeckEmpty: "山札切れ",
    reasonBattleComplete: "全カードプレイ完了",
    totalPowLabel: "計 {pow} POW",
    drawPlaceholder: "カードをめくる",
    waitingPlaceholder: "待機中",
    statusYouLabel: "あなた",
    statusDrewCard: '{name} が 「{card}」 (POW {power}) をめくりました！',
    statusDrewCardGeneric: "{name} がカードをめくりました",
    statusFlagTaken: "🚩 {name} がフラッグを奪いました！ (防衛パワー: {power})",
    statusMemoryOverflow: "⚠️ {name} のメモリが満杯 (オーバーフロー) になりました！",
    statusDeckEmpty: "🚫 {name} の山札がなくなりました！",
    awaitingOpponentCard: "{name} のカードを待っています",
    drawYourCard: "カードをめくってください",
    defendingLabel: "{name}: 防衛中",
    challengingLabel: "{name}: 挑戦中",
    needMorePow: "あと {needed} POW 必要",
    flagStolen: "フラッグ奪取！",
    progressLabel: "進捗:",
    choiceTitleReporter: "REPORTER DETECTED / リポーター効果発動",
    choiceInstrReporter: "山札の上のカードを1枚選択してください。選択したカードが山札の一番上になり、もう1枚は山札の一番下に置かれます。",
    choiceTitleJuggler: "JUGGLER / バンパーカー効果発動",
    choiceInstrJuggler: "山札の上のカードを並び替えたい順に選択してください。最初に選択したカードが山札の一番上になります。",
    choiceTitleSailor: "SAILOR / 船乗り・予知能力者効果発動",
    choiceInstrSailor: "山札からカードを1枚選択し、山札の底（予知能力者の場合は山札のトップ）に移動します。",
    choiceTitleButler: "BUTLER / 執事・パンプキン効果発動",
    choiceInstrButler: "ベンチから除外するカードを最大2枚選択してください。（選択しなくても構いません）",
    choiceTitleMagician: "MAGICIAN / 魔術師効果発動",
    choiceInstrMagician: "ベンチからパワー3以下のカードを1枚選択して除外してください。",
    choiceTitleVampire: "VAMPIRE / バンパイア効果発動",
    choiceInstrVampire: "ベンチからBデッキのカードを1枚選択し、山札の一番上に戻します。",
    choiceTitleMoviestar: "MOVIESTAR / ムービースター効果発動",
    choiceInstrMoviestar: "ベンチからパワー1または2の映画カードを最大2枚選択し、山札の上に戻します。",
    choiceTitleSiren: "SIREN / サイレン効果発動",
    choiceInstrSiren: "相手のベンチからカードを1枚選択し、除外エリアに送ります。",
    choiceTitleGeneric: "CARD EFFECT TRIGGERED / カード効果選択",
    choiceInstrGeneric: "カードを選択してください。",
    drawBtnDrawOwn: "自分の山札からめくる",
    drawBtnDefendWait: "防衛中 — 次の挑戦を待つ",
    drawBtnChallenge: "挑戦！自分の山札からめくる",
    drawBtnOppDraw: "{name} の山札からめくる",
    drawBtnOppDefend: "{name} 防衛中 — 次をめくる",
    drawBtnOppChallenge: "{name} 挑戦中 — 相手の山札からめくる",
    bannerDrawOwn: ">> あなたの山札からカードをめくります <<",
    bannerDefend: ">> あなたは防衛中 — 相手がカードをめくります <<",
    bannerChallenge: ">> あなたが挑戦！自分の山札からめくります <<",
    bannerOppDraw: ">> {opponent} の山札からカードをめくります <<",
    bannerOppDefend: ">> {opponent} は防衛中 — あなたがめくります <<",
    bannerOppChallenge: ">> {opponent} が挑戦中 — 相手の山札からめくります <<",
    effectChoicePending: "⚡ 効果選択待機中 ⚡",
    opponentEffectChoosing: "⏳ {name} の効果選択中...",
    shopPoolBand: "カード帯: {band}",
    shopPoolNext: "ラウンド {round} で {band} 帯解放",
    insufficientBy: "あと {amount}¢ 不足",

    // App Screen
    disconnectedMainframe: "接続切断：アリーナのメインフレームからキックされました。",
    acknowledgeBtn: "確認",
    matchupsHeader: "対戦カード",
    activeEncounters: "アクティブ戦闘",
    Mainframe: "メインフレーム",
    Sector: "セクター",
    Orbit: "オービット",
    HoloMedia: "ホロメディア",
    DeepWeb: "ディープウェブ",
    Daemon: "デーモン",
    Matrix: "マトリクス",
    None: "なし",
    units: "枚",
    initializingArenaLink: "電脳アリーナ回線を初期化中...",
    drawNextCard: "カードをめくる",
    opponentDrawNext: "相手のカードをめくる",
    nextStep: "次へ進む",
    continueToStandings: "リザルト確認 →",
    confirmChoice: "確定",
    skipChoice: "スキップ",
    pauseLabel: "一時停止",
    autoLabel: "オート",
    speedLabel: "速度",
    eventsCount: "{count} 件",
    stepShort: "ステップ {step}",
    waitingForOpponents: "他のコバタントを待機中",
    waitingForOpponentsDesc: "他の対戦者の準備完了を待っています...",
    finalsLabel: "決勝戦",
    confirmBtn: "確定",
    systemFooterName: "アンチグラビティ・NetLink-982",
    systemFooterSubtitle: "サイバー・ドーム自律グリッドシステム",
    modeMultiplayer: "マルチプレイ",
    modeSolo: "ソロ",
    audioOff: "音声オフ",
    audioOn: "音声オン",
    muteAudio: "ミュート",
    unmuteAudio: "ミュート解除",
    systemManual: "システムマニュアル",
    manualLoading: "データアーカイブを読み込み中...",
    manualLoadError: "マニュアルの読み込みに失敗しました。",
    spectatorMode: "観戦モード",
    spectateBtn: "観戦する",
    spectateDesc: "読み取り専用でアリーナを観戦します。",
    spectatingSector: "観戦中",
    loadingSpectator: "観戦フィードにリンク中...",
    spectateError: "観戦フィードへの接続に失敗しました。"
  }
};

// Card Translation Map (80 unique card IDs)
const cardDictJa: Record<string, { name: string; effect: string }> = {
  // === Starter Cards ===
  starter_scout_1a: { name: "スキャンノード", effect: "" },
  starter_scout_1b: { name: "スキャンノード", effect: "" },
  starter_scout_1c: { name: "スキャンノード", effect: "" },
  starter_scout_2a: { name: "プローブノード", effect: "" },
  starter_scout_2b: { name: "プローブノード", effect: "" },
  starter_mascot: { name: "ガードマスコット", effect: "" },

  // === Deck A ===
  a_jester: { name: "データジョーカー", effect: "ベンチにパワー1のカードがあれば、パワー+2" },
  a_hermit: { name: "サンドボックス", effect: "自分の除外エリアにあるカード1枚につき、パワー+1" },
  a_stable_boy: { name: "サブネットヘルパー", effect: "ベンチにあるパワー2のカード1枚につき、パワー+1" },
  a_pig: { name: "データピッグ", effect: "攻撃時：相手のベンチにあるカードの属性の種類数につき、パワー+1" },
  a_talent: { name: "ネットアイドル", effect: "攻撃時：自分の山札の残り枚数が偶数なら、パワー+3" },
  a_reporter: { name: "パケットスニッファ", effect: "山札から2枚見て、1枚を一番下、1枚を一番上に置く。" },
  a_rescue_pod: { name: "バックアップポッド", effect: "このカードがフラッグを失う際、このカードを共有デッキに戻し、Bデッキのカード1枚を自分の除外エリアに置く。" },
  a_ai: { name: "ニューロコア", effect: "このカードがベンチにある場合、自分のパワー2のキャラクターのパワー+1。" },
  a_shapeshifter: { name: "モーフプログラム", effect: "このカードの選択時、自分のデッキのカード1枚を共有デッキに戻すことで、もう1枚追加で選んで良い。" },
  a_cow: { name: "サイバーカウ", effect: "" },
  a_makeup_artist: { name: "アバタースタイリスト", effect: "このカードがベンチにある場合、自分のパワー1のキャラクターの攻撃時、パワー+2" },
  a_gangster: { name: "グリッドレイダー", effect: "攻撃時、パワー+2" },
  a_moviestar: { name: "ネットセレブリティ", effect: "ベンチにパワー1か2のホロメディア（HoloMedia）カードがあれば、2枚まで山札の一番上に戻して良い。" },
  a_cat: { name: "ネコAI", effect: "" },
  a_merman: { name: "DeepWebエンティティ", effect: "ベンチにディープウェブ（DeepWeb）属性のカードが2枚以上あれば、パワー+4" },
  a_treasure: { name: "デクリプトコア", effect: "このカードがフラッグを手に入れたら、パワー+2" },
  a_sailor: { name: "ネットナビゲーター", effect: "山札を見て、好きなカードを一番下に移動させて良い。" },
  a_parrot: { name: "データパロット", effect: "" },
  a_butler: { name: "メモリークリーナー", effect: "ベンチにあるカードを最大2枚まで除外エリアに置いて良い。" },
  a_skeleton: { name: "スケルトンキー", effect: "このカードがフラッグを手に入れたら、パワー+1。" },
  a_spider: { name: "ウェブクロウラー", effect: "" },
  a_clown: { name: "データクラウン", effect: "このカードがフラッグを手に入れたら、★+2" },
  a_juggler: { name: "タスクスケジューラー", effect: "自分の山札の上から3枚見て、好きな順で戻して良い。" },
  a_vendor: { name: "ポートスキャナー", effect: "このカードがベンチにある場合、マトリクス（Matrix）属性のパワー+1" },
  a_pony: { name: "サイバーポニー", effect: "" },

  // === Deck B ===
  b_knight: { name: "コアガード", effect: "攻撃時：相手のトロフィーの数だけパワー+1" },
  b_blacksmith: { name: "コードオプティマイザ", effect: "このカードがベンチにある場合、セクター（Sector）属性のパワー+1" },
  b_magician: { name: "魔術師プログラム", effect: "ベンチにパワー3以下のカードがあれば、1枚を除外エリアに置いても良い。" },
  b_horse: { name: "サイバーホース", effect: "" },
  b_mascot: { name: "デーモンマスコット", effect: "ベンチにいる属性の種類の数だけパワー+1" },
  b_dog: { name: "サイバードッグ", effect: "" },
  b_ufo: { name: "ボイドキャリア", effect: "Aデッキの山札から2枚のカードを見ないで、自分の山札の一番下に追加する。" },
  b_band: { name: "シナプスバンド", effect: "このカードがベンチにある場合、オービット（Orbit）属性のパワー+1" },
  b_clone: { name: "レプリカエージェント", effect: "このカードの選択時、★1を得る。" },
  b_alien: { name: "ゼノウイルス", effect: "" },
  b_cowboy: { name: "データバガボンド", effect: "このカードがフラッグを手に入れたら、相手のベンチにある最もパワーの高いカード1枚を除外エリアに送る。" },
  b_comic: { name: "ホロヒーロー", effect: "このカードがフラッグを失う際、次のキャラクターの攻撃時、パワー+2" },
  b_director: { name: "シスオペ", effect: "このカードがベンチにある場合、ホロメディア（HoloMedia）属性の攻撃時のパワー+1" },
  b_lion: { name: "サイバーライオン", effect: "" },
  b_cook: { name: "システムプロキシ", effect: "このカードがベンチにある場合、フラッグを持っている自分のキャラクターのパワー+1" },
  b_navigator: { name: "グリッドマッパー", effect: "このカードがフラッグを失う際、山札から2枚見て、1枚を一番下、1枚を一番上に置く。" },
  b_lifeguard: { name: "システムリカバリー", effect: "このカードが出たとき、山札の残り枚数が3枚以下なら、パワー+4" },
  b_shark: { name: "サイバーシャーク", effect: "" },
  b_ghost: { name: "ファントムスヌープ", effect: "相手の山札の一番上のカードを相手の除外エリアに置く。" },
  b_teenager: { name: "スクリプトキディ", effect: "ベンチにあるデーモン（Daemon）属性のカード1枚につき、パワー+2" },
  b_necromancer: { name: "リサイクルビン", effect: "ベンチにある最もパワーの低いカード1枚を自分の山札の一番上に戻す。" },
  b_bat: { name: "サイバーバット", effect: "" },
  b_mime: { name: "ミラープログラム", effect: "ベンチの空きの数だけ、パワー+2" },
  b_pyrotechnist: { name: "バッファオーバーロード", effect: "このカードが出たとき、ベンチが満杯（6スロットすべて埋まっている）なら、★+3" },
  b_fortune_teller: { name: "予測モデル", effect: "このカードがフラッグを失う際、山札を見て、好きなカードを一番上に移動させて良い。" },
  b_duck: { name: "サイバーダック", effect: "" },

  // === Deck C ===
  c_bard: { name: "シグナルブースター", effect: "このカードがベンチにある場合、自分のキャラクターの攻撃時、パワー+1" },
  c_prince: { name: "ダミーノード", effect: "このカードがフラッグを失う際、ベンチには置かれず、除外エリアに置かれる。" },
  c_dragon: { name: "コーポドラゴン", effect: "" },
  c_champion: { name: "エリートグラディエーター", effect: "" },
  c_fanbus: { name: "データストリーマー", effect: "自分のトロフィーが3個以下なら★+2" },
  c_hologram: { name: "ホログラムデコイ", effect: "このカードを出したら、Bデッキの山札から1枚のカードを見ないで、相手の山札の一番上に置く。" },
  c_geek: { name: "軌道ハッカー", effect: "このカードの選択時、自分のデッキのオービット（Orbit）属性 2枚を共有デッキに戻すことで、もう1枚追加で選んで良い。" },
  c_slime: { name: "電脳スライム", effect: "" },
  c_hero: { name: "サイバーヒーロー", effect: "このカードがフラッグを手に入れたら、★+2" },
  c_trex: { name: "Tウイルスレックス", effect: "" },
  c_villain: { name: "ヴィランプログラム", effect: "このカードを出したら、Aデッキのカードを1枚見ないで、自分の山札の一番上に置く。" },
  c_siren: { name: "フィッシングプログラム", effect: "相手のベンチにある最もパワーの高いカード1枚を相手の除外エリアに送る。" },
  c_kraken: { name: "クラーケンICE", effect: "" },
  c_submarine: { name: "サブネットダイバー", effect: "自分の山札の一番下のカードを自分の除外エリアに置く。" },
  c_vampire: { name: "ヴァンパイアICE", effect: "自分のベンチにBデッキのカードがあれば、1枚を山札の一番上に戻して良い。" },
  c_pumpkin: { name: "ジャックオーランタン", effect: "ベンチにあるカードを最大2枚まで、自分の除外エリアに置いて良い。" },
  c_werewolf: { name: "電脳ワーウルフ", effect: "" },
  c_illusionist: { name: "イリュージョニストICE", effect: "このカードがフラッグを手に入れたら、ベンチの空きの数だけ、パワー+1" },
  c_bumper_car: { name: "トラフィックシェイパー", effect: "自分の山札の上から3枚見て、好きな順で戻して良い。" },
  c_teddybear: { name: "電脳テディベア", effect: "" }
};

// Card English Map for locale === 'en'
const cardDictEn: Record<string, { name: string; effect: string }> = {
  // === Starter Cards ===
  starter_scout_1a: { name: "Discovery Node", effect: "" },
  starter_scout_1b: { name: "Discovery Node", effect: "" },
  starter_scout_1c: { name: "Discovery Node", effect: "" },
  starter_scout_2a: { name: "Discovery Node", effect: "" },
  starter_scout_2b: { name: "Discovery Node", effect: "" },
  starter_mascot: { name: "Daemon Mascot", effect: "" },

  // === Deck A ===
  a_jester: { name: "Data Joker", effect: "If there is a card with Power 1 on the bench, Power +2" },
  a_hermit: { name: "Sandbox", effect: "Power +1 for each card in your memory (discard) area." },
  a_stable_boy: { name: "Subnet Helper", effect: "For each card with Power 2 on the bench, Power +1" },
  a_pig: { name: "Data Pig", effect: "When attacking, Power +1 for each unique attribute on the opponent's bench." },
  a_talent: { name: "Net Idol", effect: "When attacking, Power +3 if your remaining deck size is even." },
  a_reporter: { name: "Packet Sniffer", effect: "Look at the top 2 cards of your deck, put 1 on the bottom and 1 on the top." },
  a_rescue_pod: { name: "Backup Pod", effect: "When this card loses the flag, return it to the shared deck and put 1 Deck B card into your memory." },
  a_ai: { name: "Neuro Core", effect: "If this card is on the bench, your Power 2 characters gain Power +1." },
  a_shapeshifter: { name: "Morph Program", effect: "When choosing this card, you may return 1 card from your deck to the shared deck to choose 1 more." },
  a_cow: { name: "Cyber Cow", effect: "" },
  a_makeup_artist: { name: "Avatar Stylist", effect: "If this card is on the bench, your Power 1 characters gain Power +2 when attacking." },
  a_gangster: { name: "Grid Raider", effect: "When attacking, Power +2" },
  a_moviestar: { name: "Net Celebrity", effect: "If there is a Power 1 or 2 HoloMedia card on the bench, you may return up to 2 cards to the top of your deck." },
  a_cat: { name: "Cat AI", effect: "" },
  a_merman: { name: "DeepWeb Entity", effect: "If there are 2 or more DeepWeb cards on the bench, Power +4" },
  a_treasure: { name: "Decrypt Core", effect: "When this card claims the flag, Power +2" },
  a_sailor: { name: "Net Navigator", effect: "Look through your deck and you may move any card to the bottom." },
  a_parrot: { name: "Data Parrot", effect: "" },
  a_butler: { name: "Memory Cleaner", effect: "You may place up to 2 cards from your bench into the memory (discard) area." },
  a_skeleton: { name: "Skeleton Key", effect: "When this card claims the flag, Power +1." },
  a_spider: { name: "Web Crawler", effect: "" },
  a_clown: { name: "Data Clown", effect: "When this card claims the flag, Stars +2" },
  a_juggler: { name: "Task Scheduler", effect: "Look at the top 3 cards of your deck and return them in any order." },
  a_vendor: { name: "Port Scanner", effect: "If this card is on the bench, Matrix cards gain Power +1." },
  a_pony: { name: "Cyber Pony", effect: "" },

  // === Deck B ===
  b_knight: { name: "Core Guard", effect: "When attacking, Power +1 for each opponent trophy." },
  b_blacksmith: { name: "Code Optimizer", effect: "If this card is on the bench, Sector cards gain Power +1." },
  b_magician: { name: "Magician Program", effect: "If there is a card with Power 3 or less on the bench, you may place 1 card into the memory area." },
  b_horse: { name: "Cyber Horse", effect: "" },
  b_mascot: { name: "Daemon Mascot", effect: "Power +1 for each unique attribute on the bench." },
  b_dog: { name: "Cyber Dog", effect: "" },
  b_ufo: { name: "Void Carrier", effect: "Look at the top 2 cards of Deck A without revealing, and add them to the bottom of your deck." },
  b_band: { name: "Synapse Band", effect: "If this card is on the bench, Orbit cards gain Power +1." },
  b_clone: { name: "Replica Agent", effect: "When choosing this card, gain 1 Star." },
  b_alien: { name: "Xenovirus", effect: "" },
  b_cowboy: { name: "Data Vagabond", effect: "When this card claims the flag, banish the highest power card from the opponent's bench." },
  b_comic: { name: "Holo Hero", effect: "When this card loses the flag, the next character gains Power +2 on attack." },
  b_director: { name: "SysOp", effect: "If this card is on the bench, HoloMedia cards gain Power +1 on attack." },
  b_lion: { name: "Cyber Lion", effect: "" },
  b_cook: { name: "System Proxy", effect: "If this card is on the bench, your flag holder gains Power +1." },
  b_navigator: { name: "Grid Mapper", effect: "When this card loses the flag, look at the top 2 cards of your deck, put 1 on the bottom and 1 on the top." },
  b_lifeguard: { name: "System Recovery", effect: "When played, if your deck has 3 or fewer cards, Power +4." },
  b_shark: { name: "Cyber Shark", effect: "" },
  b_ghost: { name: "Phantom Snoop", effect: "Place the opponent's top deck card into their memory area." },
  b_teenager: { name: "Script Kiddie", effect: "For each Daemon card on the bench, Power +2." },
  b_necromancer: { name: "Recycle Bin", effect: "Return the lowest power card on your bench to the top of your deck." },
  b_bat: { name: "Cyber Bat", effect: "" },
  b_mime: { name: "Mirror Program", effect: "Power +2 for each empty slot on the bench." },
  b_pyrotechnist: { name: "Buffer Overload", effect: "When played, if your bench is full (all 6 slots filled), Stars +3." },
  b_fortune_teller: { name: "Predictive Model", effect: "When this card loses the flag, look through your deck and you may move any card to the top." },
  b_duck: { name: "Cyber Duck", effect: "" },

  // === Deck C ===
  c_bard: { name: "Signal Booster", effect: "If this card is on the bench, your characters gain Power +1 when attacking." },
  c_prince: { name: "Dummy Node", effect: "When this card loses the flag, it is sent to the memory area instead of the bench." },
  c_dragon: { name: "Corpo Dragon", effect: "" },
  c_champion: { name: "Elite Gladiator", effect: "" },
  c_fanbus: { name: "Data Streamer", effect: "If you have 3 or fewer trophies, Stars +2." },
  c_hologram: { name: "Hologram Decoy", effect: "When played, place 1 random card from Deck B onto the top of the opponent's deck." },
  c_geek: { name: "Orbital Hacker", effect: "When choosing this card, you may return 2 Orbit cards from your deck to the shared deck to choose 1 more." },
  c_slime: { name: "Cyber Slime", effect: "" },
  c_hero: { name: "Cyber Hero", effect: "When this card claims the flag, Stars +2." },
  c_trex: { name: "T-Virus Rex", effect: "" },
  c_villain: { name: "Villain Program", effect: "When played, place 1 random card from Deck A onto the top of your deck." },
  c_siren: { name: "Phishing Program", effect: "Banish the highest power card from the opponent's bench." },
  c_kraken: { name: "Kraken ICE", effect: "" },
  c_submarine: { name: "Subnet Diver", effect: "Place the bottom card of your deck into your memory area." },
  c_vampire: { name: "Vampire ICE", effect: "If there is a Deck B card on your bench, you may return 1 card to the top of your deck." },
  c_pumpkin: { name: "Jack-o'-Lantern", effect: "You may place up to 2 cards from your bench into your memory area." },
  c_werewolf: { name: "Cyber Werewolf", effect: "" },
  c_illusionist: { name: "Illusionist ICE", effect: "When this card claims the flag, Power +1 for each empty slot on the bench." },
  c_bumper_car: { name: "Traffic Shaper", effect: "Look at the top 3 cards of your deck and return them in any order." },
  c_teddybear: { name: "Cyber Teddybear", effect: "" }
};

// Attribute, Archetype, Rarity translations
const attributeJa: Record<string, string> = {
  Mainframe: "メインフレーム",
  Sector: "セクター",
  Orbit: "オービット",
  HoloMedia: "ホロメディア",
  DeepWeb: "ディープウェブ",
  Daemon: "デーモン",
  Matrix: "マトリクス",
  None: "なし"
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

// Japanese Card Name to English mapping for logs and display names
const jaCardNameToEn: Record<string, string> = {
  "スキャンノード": "Scan Node",
  "プローブノード": "Probe Node",
  "ガードマスコット": "Guard Mascot",
  "デーモンマスコット": "Daemon Mascot",
  "データジョーカー": "Data Joker",
  "サンドボックス": "Sandbox",
  "サブネットヘルパー": "Subnet Helper",
  "データピッグ": "Data Pig",
  "ネットアイドル": "Net Idol",
  "パケットスニッファ": "Packet Sniffer",
  "バックアップポッド": "Backup Pod",
  "ニューロコア": "Neuro Core",
  "モーフプログラム": "Morph Program",
  "サイバーカウ": "Cyber Cow",
  "アバタースタイリスト": "Avatar Stylist",
  "グリッドレイダー": "Grid Raider",
  "ネットセレブリティ": "Net Celebrity",
  "ネコAI": "Cat AI",
  "DeepWebエンティティ": "DeepWeb Entity",
  "デクリプトコア": "Decrypt Core",
  "ネットナビゲーター": "Net Navigator",
  "データパロット": "Data Parrot",
  "メモリークリーナー": "Memory Cleaner",
  "スケルトンキー": "Skeleton Key",
  "ウェブクロウラー": "Web Crawler",
  "データクラウン": "Data Clown",
  "タスクスケジューラー": "Task Scheduler",
  "ポートスキャナー": "Port Scanner",
  "サイバーポニー": "Cyber Pony",
  "コアガード": "Core Guard",
  "コードオプティマイザ": "Code Optimizer",
  "魔術師プログラム": "Magician Program",
  "サイバーホース": "Cyber Horse",
  "サイバードッグ": "Cyber Dog",
  "ボイドキャリア": "Void Carrier",
  "シナプスバンド": "Synapse Band",
  "レプリカエージェント": "Replica Agent",
  "ゼノウイルス": "Xenovirus",
  "データバガボンド": "Data Vagabond",
  "ホロヒーロー": "Holo Hero",
  "シスオペ": "SysOp",
  "サイバーライオン": "Cyber Lion",
  "システムプロキシ": "System Proxy",
  "グリッドマッパー": "Grid Mapper",
  "システムリカバリー": "System Recovery",
  "サイバーシャーク": "Cyber Shark",
  "ファントムスヌープ": "Phantom Snoop",
  "スクリプトキディ": "Script Kiddie",
  "リサイクルビン": "Recycle Bin",
  "サイバーバット": "Cyber Bat",
  "ミラープログラム": "Mirror Program",
  "バッファオーバーロード": "Buffer Overload",
  "予測モデル": "Predictive Model",
  "サイバーダック": "Cyber Duck",
  "シグナルブースター": "Signal Booster",
  "ダミーノード": "Dummy Node",
  "コーポドラゴン": "Corpo Dragon",
  "エリートグラディエーター": "Elite Gladiator",
  "データストリーマー": "Data Streamer",
  "ホログラムデコイ": "Hologram Decoy",
  "軌道ハッカー": "Orbital Hacker",
  "電脳スライム": "Cyber Slime",
  "サイバーヒーロー": "Cyber Hero",
  "Tウイルスレックス": "T-Virus Rex",
  "ヴィランプログラム": "Villain Program",
  "フィッシングプログラム": "Phishing Program",
  "クラーケンICE": "Kraken ICE",
  "サブネットダイバー": "Subnet Diver",
  "ヴァンパイアICE": "Vampire ICE",
  "ジャックオーランタン": "Jack-o'-Lantern",
  "電脳ワーウルフ": "Cyber Werewolf",
  "イリュージョニストICE": "Illusionist ICE",
  "トラフィックシェイパー": "Traffic Shaper",
  "電脳テディベア": "Cyber Teddybear"
};

// English Card Name to Japanese mapping (derived automatically)
const enCardNameToJa: Record<string, string> = {};
Object.entries(jaCardNameToEn).forEach(([jaName, enName]) => {
  enCardNameToJa[enName] = jaName;
});

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
    // Primary card content is managed by backend (card.name, card.effect).
    // Fall back to dictionary only if backend values are absent/empty.
    const baseId = stripInstanceSuffix(card.id || '');
    if (locale === 'en') {
      const enInfo = cardDictEn[baseId] || cardDictEn[card.id];
      return {
        ...card,
        name: enInfo ? enInfo.name : (card.name || card.id),
        effect: card.effect !== undefined && card.effect !== '' ? card.effect : (enInfo ? enInfo.effect : ''),
        attribute: card.attribute,
        archetype: card.archetype || '',
        rarity: card.rarity
      };
    }
    const jaInfo = cardDictJa[baseId] || cardDictJa[card.id];
    return {
      ...card,
      name: card.name || (jaInfo ? jaInfo.name : card.id),
      effect: card.effect !== undefined && card.effect !== '' ? card.effect : (jaInfo ? jaInfo.effect : ''),
      attribute: attributeJa[card.attribute] || card.attribute,
      archetype: card.archetype ? (archetypeJa[card.archetype] || card.archetype) : '',
      rarity: rarityJa[card.rarity] || card.rarity
    };
  }, [locale]);

  const translateCardName = useCallback((name: string): string => {
    if (!name) return name;
    if (locale === 'en') {
      return jaCardNameToEn[name] || name;
    }
    return name;
  }, [locale]);

  // Translates complex backend battle detail strings to English / Japanese
  const translateBattleDetail = useCallback((detail: string): string => {
    if (!detail) return detail;
    let translated = detail;

    if (locale === 'en') {
      // 1. Replace all Japanese card names with English
      Object.entries(jaCardNameToEn).forEach(([jaName, enName]) => {
        translated = translated.replace(new RegExp(jaName, 'g'), enName);
      });

      // 2. Apply translations for battle log patterns
      const phrasesEn = [
        { pattern: /ベンチのパワー3カード数 \((\d+)\) 分パワー\+(\d+)/, replacement: "Power +$2 for $1 Power 3 cards on bench" },
        { pattern: /ベンチのデーモン属性数 \((\d+)\) 分パワー\+(\d+)/, replacement: "Power +$2 for $1 Daemon cards on bench" },
        { pattern: /ベンチの空き数 \((\d+)\) 分パワー\+(\d+)/, replacement: "Power +$2 for $1 empty slots on bench" },
        { pattern: /相手の山札から (.*) を除外エリアへ送りました/, replacement: "Sent opponent's top card $1 to the banish zone" },
        { pattern: /Bデッキから1枚、相手の山札の上に置きました/, replacement: "Placed 1 card from Deck B onto opponent's deck" },
        { pattern: /Aデッキから1枚、自分の山札の上に置きました/, replacement: "Placed 1 card from Deck A onto your deck" },
        { pattern: /自分の山札の底から (.*) を除外エリアへ送りました/, replacement: "Sent $1 from the bottom of your deck to the banish zone" },
        { pattern: /(.*) は (.*) を山札の上に、(.*) を山札の下に置きました/, replacement: "$1 placed $2 on top of the deck, and $3 on the bottom" },
        { pattern: /(.*) は山札の上3枚を並び替えました/, replacement: "$1 reordered the top 3 cards of the deck" },
        { pattern: /(.*) は (.*) を山札の一番下に移動しました/, replacement: "$1 moved $2 to the bottom of the deck" },
        { pattern: /(.*) はベンチから (.*) を除外エリアへ送りました/, replacement: "$1 banished $2 from the bench" },
        { pattern: /(.*) は魔術師の効果でベンチから (.*) を除外しました/, replacement: "$1 banished $2 from the bench via Magician's effect" },
        { pattern: /(.*) はバンパイアの効果でベンチから (.*) を山札の上に戻しました/, replacement: "$1 returned $2 from the bench to the top of the deck via Vampire's effect" },
        { pattern: /(.*) はムービースターの効果でベンチから映画カード (.*) を山札の上に戻しました/, replacement: "$1 returned HoloMedia card $2 from the bench to the top of the deck via MovieStar's effect" },
        { pattern: /(.*) はサイレンの効果で相手のベンチから (.*) を除外しました/, replacement: "$1 banished $2 from the opponent's bench via Siren's effect" },
        { pattern: /プリンスがフラッグを失ったため、ベンチではなく除外エリアに送られました/, replacement: "Since Dummy Node lost the flag, it was sent to the banish zone instead of the bench" },
        { pattern: /レスキューポッドがフラッグを失い、除外されました/, replacement: "Backup Pod lost the flag and was banished" },
        { pattern: /メモリ上限超過！ (.*) のベンチが満杯になり敗北しました/, replacement: "Memory capacity exceeded! $1's bench is full, resulting in defeat" },
        { pattern: /カウボーイの効果でベンチへ送られたカードにより、(.*) のベンチが溢れて敗北しました/, replacement: "Opponent's bench overflowed and defeated due to Data Vagabond's effect" },
        { pattern: /カウボーイの効果で相手の山札の上の (.*) をベンチに送りました/, replacement: "Sent opponent's top card $1 to the bench via Data Vagabond's effect" },
        { pattern: / \(イリュージョニスト効果でパワー\+(\d+)\)/, replacement: " (Power +$1 via Illusionist effect)" },
        { pattern: /(.*) がフラッグを奪いました！防衛パワー: (\d+)/, replacement: "$1 claimed the flag! Defense Power: $2" },
        { pattern: /対戦相手 (.*) の山札がなくなりました。(.*) の勝利です！/, replacement: "Opponent $1 has no cards left. $2 wins!" },
      ];

      phrasesEn.forEach(({ pattern, replacement }) => {
        translated = translated.replace(pattern, replacement);
      });

    } else {
      // locale === 'ja'
      // 1. Replace all English card names with Japanese
      Object.entries(enCardNameToJa).forEach(([enName, jaName]) => {
        translated = translated.replace(new RegExp(enName, 'g'), jaName);
      });

      // 2. Apply translations for battle log patterns
      const phrasesJa = [
        // Side/identity replacements
        { pattern: /\bplayer\b/gi, replacement: "あなた" },
        { pattern: /\bcpu\b/gi, replacement: "対戦相手" },

        // Logs
        { pattern: /(.*) has no cards left in deck\. (.*) wins!/, replacement: "$1 の山札がなくなりました。$2 の勝利です！" },
        { pattern: /(.*) \(AI\) has no cards left in deck\. (.*) wins!/, replacement: "$1 (AI) の山札がなくなりました。$2 の勝利です！" },
        { pattern: /Deck empty\. (.*) wins!/, replacement: "デッキが空になりました。$1 の勝利です！" },
        { pattern: /Both decks empty\. (.*) wins by flag holding/, replacement: "両者のデッキが空になりました。フラグを保持している $1 の勝利です！" },
        { pattern: /Opponent (.*) deck empty\. (.*) wins/, replacement: "対戦相手 $1 の山札がなくなりました。$2 の勝利です！" },
        { pattern: /Your deck empty\. (.*) wins/, replacement: "あなたの山札がなくなりました。$1 の勝利です！" },
        { pattern: /Max steps reached\. (.*) wins!/, replacement: "規定ステップ数に達しました。$1 の勝利です！" },
        { pattern: /Max steps reached\. Flag holder (.*) wins/, replacement: "規定ステップ数に達しました。フラグホルダー $1 の勝利です！" },
        { pattern: /Bench overflow\. (.*) wins!/, replacement: "ベンチ容量超過！$1 の勝利です！" },
        { pattern: /Memory capacity exceeded\. (.*) wins!/, replacement: "メモリ上限超過！$1 の勝利です！" },
        { pattern: /Memory Overflow: (.*) lost/, replacement: "メモリ上限超過：$1 の敗北" },
        { pattern: /(.*) claims the flag/, replacement: "$1 がフラグを確保しました" },
        { pattern: /Claims flag! Defense power: (\d+)/, replacement: "フラグ奪取！防衛パワー: $1" },
        { pattern: /(.*) played (.*) \(Power: (\d+)\)/, replacement: "$1 が $2 (パワー: $3) をプレイしました" },
        { pattern: /(.*) was benched/, replacement: "$1 はベンチへ送られました" },
        { pattern: /No cards left/, replacement: "山札がありません" },
        { pattern: /(.*) triggered\. Active power: (\d+) \(illusionist effect: \+(\d+)\)/, replacement: "$1 がトリガーされました。現在のパワー: $2 (イリュージョニスト効果: +$3)" },
        { pattern: /(.*) triggered\. Active power: (\d+)/, replacement: "$1 がトリガーされました。現在のパワー: $2" },
        { pattern: /(.*) triggered\. Banner redirected!/, replacement: "$1 がトリガーされました。フラグがリダイレクトされました！" },
        { pattern: /(.*) triggered/, replacement: "$1 がトリガーされました" },
      ];

      phrasesJa.forEach(({ pattern, replacement }) => {
        translated = translated.replace(pattern, replacement);
      });
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
