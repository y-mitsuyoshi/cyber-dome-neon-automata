# 設計書: [フロントエンド] 対戦画面(BattleArena)のカードエリアを左右分割し、自プレイヤー(左)と相手プレイヤー(右)を表示する

## 概要
現在の `BattleArena.tsx` は既に左側に自プレイヤー、右側に対戦相手のカード・フィールド領域を左右2カラムで表示するレイアウトを実装しています。  
この設計では、視認性と左右対称性を高めるために、最小限のCSS調整（左カラムに右境界線、右カラムに左境界線、左右対称なパディング）と各カラムに翻訳対応の見出しを追加します。

## 影響範囲
- `frontend/src/components/BattleArena.tsx` **MODIFY**  
  左右カラムの境界線、パディング、高さの微調整、およびカラム見出しの追加。
- `frontend/src/components/CardDisplay.tsx` **変更なし**  
  既に `side` プロパティ（`'player' | 'opponent'`）を受け取り、相手プレイヤー側のカードに適切なスタイル（透明度・ボーダー色）を適用しているため。

## 設計
### アーキテクチャ／モジュール構成
現在の `BattleArena` の return JSX は「2. Main Dual Board Area」内で grid レイアウトにより左カラム、中央（デュエルアリーナ）、右カラムを横並びにしています。左カラムは自プレイヤー、右カラムは相手プレイヤーの情報を表示しています。  
この設計では、以下の最小限の変更を加えます：

1. 左カラムの `<div>` に `md:border-r border-cyber-border/30 md:pr-6` を追加し、右側に縦線を引く。
2. 右カラムの `<div>` に `md:border-l border-cyber-border/30 md:pl-6` を追加し、左側に縦線を引く（左右対称）。
3. 各カラムの先頭に、翻訳フック `t()` を使用した見出し `<h3>` を追加する（左: `yourCardsLabel`、右: `opponentCardsLabel`）。
4. 既存のデータロジック（`selfActiveCards`, `opponentActiveCards` 等）と残りの UI は一切変更しない。

### データモデル／インターフェース整合
- `BattleArena` 内部で既に計算されている `selfActiveCards` などは変更しない。
- `CardDisplay` の `side` プロパティ、`MemorySlots` の `side` プロパティはそのまま使用する。
- 新たな props や state の追加は行わない。

## 実装計画
1. `frontend/src/components/BattleArena.tsx` を開く。
2. 左カラム（コメント `Left Col: Local Player State`）の `<div>` の `className` に `md:border-r border-cyber-border/30 md:pr-6` を追加する。
3. 右カラム（コメント `Right Col: Opponent State`）の `<div>` の `className` に `md:border-l border-cyber-border/30 md:pl-6` を追加する。
4. 左カラムの先頭（MemorySlots より前）に以下の見出しを挿入する：
   ```tsx
   <h3 className="text-neon-cyan font-bold text-xs uppercase tracking-wider mb-2">
     {t('yourCardsLabel')}
   </h3>
   ```
5. 右カラムの先頭（`opponentActiveCards` の map より前）に以下の見出しを挿入する：
   ```tsx
   <h3 className="text-neon-magenta font-bold text-xs uppercase tracking-wider mb-2">
     {t('opponentCardsLabel')}
   </h3>
   ```
6. `frontend/src/i18n/en.json` と `frontend/src/i18n/ja.json` に翻訳キーを追加する（プロジェクトの実際の場所に合わせて調整）。
7. `npm run lint` を実行し、既存テストがパスすることを確認する。

## 保存すべき既存コード
- `BattleArena` の props（`BattleArenaProps`）の型定義
- すべての `useMemo`, `useEffect` フック（データ取得・再生制御・オーディオ等）
- `CardDisplay` の呼び出し方法（`card`, `side`, `compact` 等の props）
- `MemorySlots` の呼び出し方法（`slots`, `label`, `side` 等の props）
- 中央カラム（`Center: Duel Arena`）の全マークアップ
- フラッグ表示、ターンインジケーター、ドローボタン、オートプレイコントロール、イベントログ

## リスクと緩和策
- **レイアウト崩れ**: `md:` プレフィックスにより中画面以上でのみ境界線が表示されるため、モバイルでの崩れはない。
- **既存機能との干渉**: 見出しは高さを取るだけで、z-index やイベント伝播に影響しない。
- **翻訳キー未追加時のフォールバック**: キーが存在しない場合、`t()` はキー名をそのまま返すため、最低限の動作は維持される。

## テスト方針
- **実行コマンド**: `npm run test -- BattleArena`
- **最小テストケース**:
  1. 左右のカラムがレンダリングされることを既存のスナップショットテストで確認。
  2. 各カラムに見出し（翻訳後の文字列）が表示されていることを `getByText` などで確認。
  3. 既存の全テスト（オーディオ、選択UI、オートプレイ、ログ表示等）がパスすることを確認。
- スナップショットテストが存在する場合は、変更に合わせて更新し、目視レビューする。
