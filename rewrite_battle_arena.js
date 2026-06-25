const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/components/BattleArena.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// The main dual board area replacement
// We will replace step 1 to step 7 all at once since they all happen inside the main React component return.

// Find the beginning of the return statement
const returnIndex = content.indexOf('return (\n    <div className="min-h-screen');

// We will recreate the return statement body
let newReturnBody = `  return (
    <div className="min-h-screen bg-cyber-dark relative overflow-hidden flex flex-col justify-between p-4 select-none">
      {/* Background gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 20%, rgba(0,240,255,0.03) 0%, transparent 60%), radial-gradient(ellipse at 50% 80%, rgba(255,0,255,0.03) 0%, transparent 60%)',
        }}
      />
      <div className="absolute inset-0 cyber-grid pointer-events-none" />

      {/* 1. Header Layer */}
      <div className="relative z-10 max-w-7xl mx-auto w-full text-center">
        <h2 className="text-xl font-black tracking-[0.3em] uppercase text-neon-magenta text-glow-magenta font-mono animate-slide-in">
          {t('battleArenaHeader')}
        </h2>
        <div className="flex items-center justify-center gap-6 mt-1 font-mono text-xs">
          <div className="flex items-center gap-1.5">
            <User size={12} className="text-neon-cyan" />
            <span className="text-neon-cyan font-bold">{playerName}</span>
          </div>
          <span className="text-neon-red font-black text-sm">VS</span>
          <div className="flex items-center gap-1.5">
            <Cpu size={12} className="text-neon-magenta" />
            <span className="text-neon-magenta font-bold">{opponent}</span>
          </div>
        </div>
      </div>

      {/* [NEW] ステータスバー */}
      <div className="relative z-10 max-w-7xl mx-auto w-full my-2 text-center">
        {/* Top Step Counter */}
        <div className="text-[10px] text-cyber-text-dim uppercase tracking-widest font-mono z-10">
          {t('battleStep')} / 進捗: {isLiveMode ? activeLog.length : currentLogIndex + 1} {isLiveMode ? '' : \`/ \${battleLog.length}\`}
        </div>

        {/* Active Turn Indicator Banner */}
        <div className="my-2 w-full max-w-md mx-auto z-10">
          {isReplayFinished ? (
            <div className="text-neon-green text-glow-green text-xs font-bold font-mono tracking-widest uppercase border border-neon-green/30 bg-green-950/15 py-1.5 rounded animate-pulse">
              SYS_STATUS: CLASH RESOLVED / バトル決着
            </div>
          ) : isMyDrawTurn ? (
            <div className="text-neon-cyan text-glow-cyan text-xs font-bold font-mono tracking-widest uppercase border border-neon-cyan/30 bg-cyan-950/15 py-1.5 rounded animate-pulse">
              &gt;&gt; PLAYER DRAW TURN / あなたのめくり番 &lt;&lt;
            </div>
          ) : isOpponentDrawTurn ? (
            <div className="text-neon-magenta text-glow-magenta text-xs font-bold font-mono tracking-widest uppercase border border-neon-magenta/30 bg-purple-950/15 py-1.5 rounded animate-pulse">
              &gt;&gt; OPPONENT DRAW TURN / 相手のめくり番 &lt;&lt;
            </div>
          ) : showChoiceUI ? (
            <div className="text-neon-magenta text-glow-magenta text-xs font-bold font-mono tracking-widest uppercase border border-neon-magenta/40 bg-purple-950/30 py-1.5 rounded animate-pulse">
              ⚡ AWAITING YOUR CARD CHOICE / 効果選択待機中 ⚡
            </div>
          ) : isLiveMode && battleSession.requiredAction !== 'DRAW' && battleSession.pendingActionPlayer !== playerName ? (
            <div className="text-neon-magenta text-glow-magenta text-xs font-bold font-mono tracking-widest uppercase border border-neon-magenta/20 bg-purple-950/10 py-1.5 rounded animate-pulse">
              AWAITING OPPONENT DECISION / 相手の効果選択中...
            </div>
          ) : (
            <div className="text-cyber-text-dim text-xs font-bold font-mono tracking-widest uppercase border border-cyber-border/20 bg-cyber-surface/10 py-1.5 rounded">
              STANDBY PROTOCOL / 分析同調中
            </div>
          )}
        </div>

        {flagHolderName !== playerName && flagHolderName !== opponent && (
          <div className="text-[10px] text-cyber-text-dim/60 border border-dashed border-cyber-border/30 rounded px-2 py-1 mt-1 font-mono uppercase tracking-widest inline-block">
            FLAG UNCLAIMED / フラグなし
          </div>
        )}
      </div>

      {/* [NEW] arena-area Container */}
      <div className="relative z-10 max-w-7xl mx-auto w-full flex-1 my-4 min-h-[460px] border border-cyber-border/20 rounded-xl bg-cyber-surface/10 backdrop-blur-sm p-4 lg:p-6 overflow-hidden">

        {/* Symmetrical Flash Overlays */}
        {flashState === 'cyan' && (
          <div className="absolute inset-0 bg-neon-cyan/20 border border-neon-cyan shadow-[inset_0_0_40px_rgba(0,240,255,0.3)] rounded-xl pointer-events-none z-30 animate-fade-in" style={{ animationDuration: '100ms' }} />
        )}
        {flashState === 'magenta' && (
          <div className="absolute inset-0 bg-neon-magenta/20 border border-neon-magenta shadow-[inset_0_0_40px_rgba(255,0,255,0.3)] rounded-xl pointer-events-none z-30 animate-fade-in" style={{ animationDuration: '100ms' }} />
        )}

        {/* Interactive Choice Overlay Panel */}
        {showChoiceUI && choiceConfig && (
          <div className="absolute inset-0 z-40 bg-cyber-darker/95 backdrop-blur-md flex flex-col items-center justify-center p-6 border-2 border-neon-magenta/40 rounded-xl animate-fade-in">
            <div className="text-neon-magenta text-glow-magenta font-black tracking-widest text-xs uppercase mb-1 animate-pulse">
              ⚡ {choiceConfig.title} ⚡
            </div>
            <p className="text-[10px] text-cyber-text-dim uppercase tracking-wider mb-4 text-center max-w-sm">
              {choiceConfig.instructions}
            </p>

            {/* Action Options Grid */}
            <div className="flex gap-4 flex-wrap justify-center my-3 overflow-y-auto max-h-[220px] p-2">
              {battleSession.actionOptions.map((optCard) => {
                const fullCard = convertToFullCard(optCard);
                const isSelected = selectedCards.includes(optCard.id);
                const selectIdx = selectedCards.indexOf(optCard.id);
                return (
                  <div
                    key={optCard.id}
                    onClick={() => handleSelectCard(optCard.id)}
                    className={\`relative cursor-pointer transition-all duration-150 transform hover:scale-105 active:scale-95 \${
                      isSelected ? 'ring-2 ring-neon-magenta scale-102 opacity-100 z-10' : 'opacity-70 hover:opacity-100'
                    }\`}
                  >
                    <CardDisplay card={fullCard} disabled={false} />
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-neon-magenta text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-lg border border-white/20">
                        {selectIdx + 1}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Controls */}
            <div className="flex gap-4 mt-2">
              <button
                onClick={handleConfirmChoice}
                disabled={!isSelectionValid}
                className="px-6 py-2 border-2 border-neon-magenta text-neon-magenta font-bold uppercase tracking-widest rounded bg-purple-950/20 hover:bg-purple-950/40 text-[10px] shadow-[0_0_10px_rgba(255,0,255,0.2)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {t('confirmChoice') || 'CONFIRM / 確定'}
              </button>
              {choiceConfig.isOptional && (
                <button
                  onClick={handleSkipChoice}
                  className="px-6 py-2 border border-cyber-border text-cyber-text-dim hover:text-white hover:border-white uppercase tracking-wider rounded bg-cyber-surface/10 hover:bg-cyber-surface/30 text-[10px] cursor-pointer"
                >
                  {t('skipChoice') || 'SKIP / スキップ'}
                </button>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">

          {/* Left Col: Local Player State */}
          <div className="font-mono flex flex-col gap-3 self-start h-full">
            <MemorySlots slots={myMemSlots} label={t('yourMemory')} side="left" />
            <div className="border border-cyber-border/30 rounded p-2.5 bg-cyber-surface/30 flex justify-between items-center">
              <div>
                <div className="text-[9px] text-cyber-text-dim uppercase tracking-wider">{t('deckLabel') || 'DECK MODULES'}</div>
                <div className="text-sm font-bold text-neon-cyan">{myDeckCount} {t('units') || 'Units'}</div>
              </div>
              <Layers size={18} className="text-neon-cyan/50" />
            </div>

            <button
              onClick={() => setShowDeckModal(true)}
              className="flex items-center justify-center gap-2 border border-neon-cyan/45 hover:border-neon-cyan rounded p-2 bg-cyber-surface/30 text-neon-cyan font-bold hover:bg-neon-cyan/10 transition-all text-xs cursor-pointer uppercase tracking-wider font-mono shadow-[0_0_8px_rgba(0,240,255,0.1)]"
            >
              <Layers size={14} className="text-neon-cyan" />
              {t('viewDeckBtn')}
            </button>

            <div className="flex-1 w-full flex flex-col justify-center gap-4 my-2">
              {flagHolderName === playerName ? (
                <div className="flex flex-col items-center p-3 border border-cyber-border/20 rounded-lg bg-cyber-surface/5">
                  <div
                    className={\`flex items-center gap-1.5 px-4 py-1.5 rounded border text-[10px] font-mono font-bold transition-all \${
                      flagHolderName === playerName
                        ? 'border-neon-cyan text-neon-cyan bg-cyan-950/10 text-glow-cyan shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                        : flagHolderName === opponent
                        ? 'border-neon-magenta text-neon-magenta bg-purple-950/10 text-glow-magenta shadow-[0_0_15px_rgba(255,0,255,0.15)]'
                        : 'border-cyber-border text-cyber-text-dim bg-cyber-dark/50'
                    }\`}
                  >
                    <Flag size={12} className={flagHolderName === playerName ? 'animate-pulse text-neon-cyan animate-neon-pulse' : flagHolderName === opponent ? 'text-neon-magenta animate-pulse' : ''} />
                    <span className="uppercase">
                      {flagHolderName === playerName
                        ? 'DEFENDING / あなたが支配中'
                        : flagHolderName === opponent
                        ? \`DEFENDING / \${opponent} が支配中\`
                        : 'FLAG UNCLAIMED / フラグなし'}
                    </span>
                    {flagPowerValue > 0 && <span className="ml-2 font-black border-l border-cyber-border/40 pl-2 text-white">{flagPowerValue} POW</span>}
                  </div>

                  <div className="mt-3 flex items-center justify-center min-h-[140px]">
                    {currentFlagCard ? (
                      <div key={currentFlagCard.id + '_' + currentFlagCard.power} className="transform scale-90 transition-all animate-card-reveal shadow-[0_0_20px_rgba(0,240,255,0.25)]">
                        <CardDisplay card={currentFlagCard} disabled />
                      </div>
                    ) : (
                      <div className="text-[10px] text-cyber-text-dim/40 border border-dashed border-cyber-border/30 rounded p-6 font-mono text-center">
                        NO DEFENSIVE GRID INTRUSION / 支配中のプログラムはありません
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center p-3 border border-cyber-border/20 rounded-lg bg-cyber-surface/5">
                  <div className="text-[9px] font-mono text-cyber-text-dim/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span>ACTIVE CHALLENGE AUGMENTATIONS / 挑戦者めくりカード</span>
                    {challengerPower > 0 && (
                      <span className="text-neon-green font-black px-1.5 border border-neon-green/35 rounded bg-green-950/10">
                        計 {challengerPower} POW
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 flex-wrap min-h-[140px] w-full px-2">
                    {currentClashCards.length > 0 ? (
                      currentClashCards.map((cCard, idx) => {
                        const isLatest = idx === currentClashCards.length - 1;
                        return (
                          <div
                            key={cCard.id + '_' + idx}
                            className={\`transform scale-75 -mx-4 first:ml-0 last:mr-0 transition-all duration-300 \${
                              isLatest
                                ? 'animate-card-reveal z-10 shadow-[0_0_15px_rgba(0,240,255,0.3)] scale-80'
                                : 'opacity-70 scale-75'
                            }\`}
                          >
                            <CardDisplay card={cCard} disabled />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-[10px] text-cyber-text-dim/40 border border-dashed border-cyber-border/30 rounded p-6 font-mono text-center w-full">
                        AWAITING DECK DRAW INTRUSION / ドローされるのを待っています
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Main Interactive Draw Button */}
            <div className="w-full mt-auto z-10 flex flex-col items-center gap-2">
              {!isReplayFinished ? (
                <button
                  disabled={isLiveMode && (battleSession.requiredAction !== 'DRAW' || (battleSession.turnOwner === opponent && !opponentIsNPC))}
                  onClick={() => {
                    playSE('click');
                    if (isLiveMode) {
                      onStep();
                    } else {
                      setCurrentLogIndex((prev) => Math.min(prev + 1, battleLog.length - 1));
                    }
                  }}
                  className={\`w-full max-w-xs py-2.5 px-5 rounded border-2 font-mono font-bold text-xs uppercase tracking-widest cursor-pointer transition-all duration-150 transform active:scale-95 shadow-md flex items-center justify-center gap-2 \${
                    isMyDrawTurn
                      ? 'border-neon-cyan text-neon-cyan bg-cyan-950/20 hover:bg-cyan-950/40 text-glow-cyan shadow-[0_0_15px_rgba(0,240,255,0.2)] animate-pulse'
                      : isOpponentDrawTurn
                      ? 'border-neon-magenta text-neon-magenta bg-purple-950/20 hover:bg-purple-950/40 text-glow-magenta shadow-[0_0_15px_rgba(255,0,255,0.2)]'
                      : 'border-cyber-border text-cyber-text bg-cyber-surface/30 hover:bg-cyber-surface/50 font-medium disabled:opacity-40 disabled:cursor-not-allowed'
                  }\`}
                >
                  <Play size={14} className={isMyDrawTurn ? 'animate-bounce' : (isOpponentDrawTurn ? '' : '')} />
                  {isMyDrawTurn ? (
                    <span>{t('drawNextCard') || 'DRAW CARD / カードをめくる'}</span>
                  ) : isOpponentDrawTurn ? (
                    <span>{t('opponentDrawNext') || 'DRAW OPPONENT / 相手のカードをめくる'}</span>
                  ) : (
                    <span>{t('nextStep') || 'NEXT STEP / 進む'}</span>
                  )}
                </button>
              ) : (
                <button
                  onClick={onComplete}
                  className="w-full max-w-xs py-2.5 px-5 rounded border-2 border-neon-green text-neon-green bg-green-950/20 hover:bg-green-950/40 text-glow-green font-bold text-xs uppercase tracking-widest cursor-pointer transition-all duration-150 transform active:scale-95 shadow-[0_0_15px_rgba(0,255,102,0.25)] animate-pulse animate-neon-pulse"
                >
                  <span>{t('continueToStandings') || 'VIEW STANDINGS / リザルト確認 →'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Right Col: Opponent State */}
          <div className="font-mono flex flex-col gap-3 self-start h-full">
            <MemorySlots slots={opponentMemSlots} label={t('npcMemoryLabel', { opponent })} side="right" />
            <div className="border border-cyber-border/30 rounded p-2.5 bg-cyber-surface/30 text-right flex justify-between items-center">
              <Layers size={18} className="text-neon-magenta/50" />
              <div>
                <div className="text-[9px] text-cyber-text-dim uppercase tracking-wider">{t('deckLabel') || 'DECK MODULES'}</div>
                <div className="text-sm font-bold text-neon-magenta">{opponentDeckCount} {t('units') || 'Units'}</div>
              </div>
            </div>

            <div className="flex-1 w-full flex flex-col justify-center gap-4 my-2">
              {flagHolderName === opponent ? (
                <div className="flex flex-col items-center p-3 border border-cyber-border/20 rounded-lg bg-cyber-surface/5">
                  <div
                    className={\`flex items-center gap-1.5 px-4 py-1.5 rounded border text-[10px] font-mono font-bold transition-all \${
                      flagHolderName === playerName
                        ? 'border-neon-cyan text-neon-cyan bg-cyan-950/10 text-glow-cyan shadow-[0_0_15px_rgba(0,240,255,0.15)]'
                        : flagHolderName === opponent
                        ? 'border-neon-magenta text-neon-magenta bg-purple-950/10 text-glow-magenta shadow-[0_0_15px_rgba(255,0,255,0.15)]'
                        : 'border-cyber-border text-cyber-text-dim bg-cyber-dark/50'
                    }\`}
                  >
                    <Flag size={12} className={flagHolderName === playerName ? 'animate-pulse text-neon-cyan animate-neon-pulse' : flagHolderName === opponent ? 'text-neon-magenta animate-pulse' : ''} />
                    <span className="uppercase">
                      {flagHolderName === playerName
                        ? 'DEFENDING / あなたが支配中'
                        : flagHolderName === opponent
                        ? \`DEFENDING / \${opponent} が支配中\`
                        : 'FLAG UNCLAIMED / フラグなし'}
                    </span>
                    {flagPowerValue > 0 && <span className="ml-2 font-black border-l border-cyber-border/40 pl-2 text-white">{flagPowerValue} POW</span>}
                  </div>

                  <div className="mt-3 flex items-center justify-center min-h-[140px]">
                    {currentFlagCard ? (
                      <div key={currentFlagCard.id + '_' + currentFlagCard.power} className="transform scale-90 transition-all animate-card-reveal shadow-[0_0_20px_rgba(0,240,255,0.25)]">
                        <CardDisplay card={currentFlagCard} disabled />
                      </div>
                    ) : (
                      <div className="text-[10px] text-cyber-text-dim/40 border border-dashed border-cyber-border/30 rounded p-6 font-mono text-center">
                        NO DEFENSIVE GRID INTRUSION / 支配中のプログラムはありません
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center p-3 border border-cyber-border/20 rounded-lg bg-cyber-surface/5">
                  <div className="text-[9px] font-mono text-cyber-text-dim/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <span>ACTIVE CHALLENGE AUGMENTATIONS / 挑戦者めくりカード</span>
                    {challengerPower > 0 && (
                      <span className="text-neon-green font-black px-1.5 border border-neon-green/35 rounded bg-green-950/10">
                        計 {challengerPower} POW
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-center gap-2 flex-wrap min-h-[140px] w-full px-2">
                    {currentClashCards.length > 0 ? (
                      currentClashCards.map((cCard, idx) => {
                        const isLatest = idx === currentClashCards.length - 1;
                        return (
                          <div
                            key={cCard.id + '_' + idx}
                            className={\`transform scale-75 -mx-4 first:ml-0 last:mr-0 transition-all duration-300 \${
                              isLatest
                                ? 'animate-card-reveal z-10 shadow-[0_0_15px_rgba(0,240,255,0.3)] scale-80'
                                : 'opacity-70 scale-75'
                            }\`}
                          >
                            <CardDisplay card={cCard} disabled />
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-[10px] text-cyber-text-dim/40 border border-dashed border-cyber-border/30 rounded p-6 font-mono text-center w-full">
                        AWAITING DECK DRAW INTRUSION / ドローされるのを待っています
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* [NEW] アクション詳細バー */}
      <div className="relative z-10 max-w-7xl mx-auto w-full my-2 border border-cyber-border/10 rounded p-2 bg-cyber-dark/40 text-center min-h-[50px] flex items-center justify-center">
        <p className="text-[10px] font-mono text-cyber-text leading-relaxed">
          {activeLog.length > 0
            ? translateBattleDetail(activeLog[activeLog.length - 1].details)
            : t('initializingArenaLink') || 'INITIALIZING INTERACTIVE ARENA LINK...'}
          {activeLog.length > 0 && activeLog[activeLog.length - 1].effectTriggered && activeLog[activeLog.length - 1].effectTriggered !== 'None' && activeLog[activeLog.length - 1].effectTriggered !== '' && (
            <span className="text-neon-green block font-bold mt-1 text-[9px] animate-pulse">
              ⚡ {translateBattleDetail(activeLog[activeLog.length - 1].effectTriggered)}
            </span>
          )}
        </p>
      </div>`;

// Keep the rest of the code (3. Replay Controllers, 4. Event Log, Modal)
const replayIndex = content.indexOf('{/* 3. Replay / Speed / Auto Controllers */}');
const restOfCode = content.substring(replayIndex);

const finalContent = content.substring(0, returnIndex) + newReturnBody + '\n\n      ' + restOfCode;

fs.writeFileSync(filePath, finalContent);
console.log('BattleArena.tsx rewritten.');
