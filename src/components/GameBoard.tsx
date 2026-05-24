'use client';

import { useState } from 'react';
import { ClientGameState, Card as CardType } from '../lib/types';
import Card from './Card';
import Hand from './Hand';
import DeclareModal from './DeclareModal';

interface GameBoardProps {
  gameState: ClientGameState;
  onDrawCard: (source: 'deck' | 'discard') => void;
  onDiscardCard: (cardId: string) => void;
  onDeclare: (discardCardId: string, sets: CardType[][]) => void;
  onReorderHand: (cardIds: string[]) => void;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export default function GameBoard({
  gameState,
  onDrawCard,
  onDiscardCard,
  onDeclare,
  onReorderHand,
  onPlayAgain,
  onLeave,
}: GameBoardProps) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [showDeclare, setShowDeclare] = useState(false);

  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === gameState.myPlayerId;
  const currentPlayerName = gameState.players[gameState.currentPlayerIndex]?.name || '';
  const me = gameState.players.find(p => p.id === gameState.myPlayerId);

  function handleCardSelect(cardId: string) {
    if (selectedCardId === cardId) {
      setSelectedCardId(null);
    } else {
      setSelectedCardId(cardId);
    }
  }

  function handleDiscard() {
    if (!selectedCardId || !isMyTurn || gameState.turnPhase !== 'discard') return;
    onDiscardCard(selectedCardId);
    setSelectedCardId(null);
  }

  function handleDeclareClick() {
    if (!isMyTurn || gameState.turnPhase !== 'discard') return;
    setShowDeclare(true);
  }

  if (gameState.phase === 'roundEnd' && gameState.roundResults) {
    const results = gameState.roundResults;
    const declarer = gameState.players.find(p => p.id === results.declarerId);
    const declarerScore = results.playerScores.find(ps => ps.playerId === results.declarerId);
    const losers = results.playerScores.filter(ps => ps.playerId !== results.declarerId);

    return (
      <div className="flex flex-col items-center min-h-screen bg-green-900 text-white p-8 overflow-y-auto">
        <h2 className="text-3xl font-bold mb-4">Round Over!</h2>
        <p className="text-xl mb-6">
          {declarer?.name} declared — {results.isValid ? 'Valid declaration!' : 'Invalid declaration!'}
        </p>

        {/* Declarer result */}
        <div className="bg-green-800 rounded-xl p-6 max-w-lg w-full mb-4">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-lg">{declarer?.name} (declared)</span>
            <span className={`font-bold text-lg ${(declarerScore?.points ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {(declarerScore?.points ?? 0) >= 0 ? '+' : ''}{declarerScore?.points} pts
            </span>
          </div>
          {results.isValid && results.declaredSets.length > 0 && (
            <div className="space-y-1">
              {results.declaredSets.map((set, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-green-400 w-16 shrink-0">Set {i + 1}:</span>
                  <div className="flex gap-0.5">
                    {set.map(card => <Card key={card.id} card={card} size="sm" />)}
                  </div>
                </div>
              ))}
            </div>
          )}
          {!results.isValid && (
            <div className="mt-2">
              <p className="text-sm text-red-400 font-medium">Invalid declaration: -100 penalty</p>
              {results.invalidReason && (
                <p className="text-sm text-red-300 mt-1">Reason: {results.invalidReason}</p>
              )}
              {results.declaredSets.length > 0 && (
                <div className="space-y-1 mt-2">
                  {results.declaredSets.map((set, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-red-400 w-16 shrink-0">Set {i + 1}:</span>
                      <div className="flex gap-0.5">
                        {set.map(card => <Card key={card.id} card={card} size="sm" />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <p className="text-xs text-green-400 mt-2">Total score: {declarer?.score}</p>
        </div>

        {/* Losers breakdown */}
        {results.isValid && losers.map((ps) => {
          const player = gameState.players.find(p => p.id === ps.playerId);
          return (
            <div key={ps.playerId} className="bg-green-800 rounded-xl p-6 max-w-lg w-full mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold">{player?.name}</span>
                <span className="text-yellow-400 font-bold">
                  Contributes {ps.points} pts to {declarer?.name}
                </span>
              </div>

              {!ps.hasNatural && (
                <p className="text-sm text-red-400 mb-2">No natural run — full 100 points</p>
              )}

              {ps.hasNatural && ps.validSets && ps.validSets.length > 0 && (
                <div className="space-y-1 mb-2">
                  {ps.validSets.map((set, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs text-green-400 w-16 shrink-0">
                        {i === 0 ? 'Natural:' : `Set ${i + 1}:`}
                      </span>
                      <div className="flex gap-0.5">
                        {set.map(card => <Card key={card.id} card={card} size="sm" />)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {ps.hasNatural && ps.ungroupedCards && ps.ungroupedCards.length > 0 && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs text-red-400 w-16 shrink-0">Loose:</span>
                  <div className="flex gap-0.5">
                    {ps.ungroupedCards.map(card => <Card key={card.id} card={card} size="sm" />)}
                  </div>
                  <span className="text-xs text-red-400 ml-1">= {ps.points} pts</span>
                </div>
              )}

              <p className="text-xs text-green-400 mt-2">Total score: {player?.score}</p>
            </div>
          );
        })}

        {/* Invalid declaration: show everyone's hands */}
        {!results.isValid && losers.map((ps) => {
          const player = gameState.players.find(p => p.id === ps.playerId);
          return (
            <div key={ps.playerId} className="bg-green-800 rounded-xl p-4 max-w-lg w-full mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">{player?.name}</span>
                <span className="text-green-400 text-sm">Unaffected</span>
              </div>
              <div className="flex gap-0.5 flex-wrap">
                {ps.hand.map(card => <Card key={card.id} card={card} size="sm" />)}
              </div>
            </div>
          );
        })}

        {me?.isHost && (
          <button
            onClick={onPlayAgain}
            className="mt-4 bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold py-3 px-8 rounded-lg text-lg"
          >
            Play Again
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-green-900 text-white">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-green-950">
        <div className="flex items-center gap-3">
          <span className="font-mono text-green-400">Room: {gameState.roomCode}</span>
          <button
            onClick={onLeave}
            className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 px-2 py-1 rounded transition-colors"
          >
            Leave
          </button>
        </div>
        <span className={`text-sm ${isMyTurn ? 'text-yellow-400 font-bold' : 'text-green-400'}`}>
          {isMyTurn ? 'Your turn' : `${currentPlayerName}'s turn`}
          {isMyTurn && ` — ${gameState.turnPhase === 'draw' ? 'Draw a card' : 'Discard a card'}`}
        </span>
        <span className="text-sm text-green-400">Score: {me?.score || 0}</span>
      </div>

      {/* Opponents */}
      <div className="flex justify-center gap-6 py-4 flex-wrap">
        {gameState.players
          .filter(p => p.id !== gameState.myPlayerId)
          .map((p) => {
            const isCurrentTurn = gameState.players[gameState.currentPlayerIndex]?.id === p.id;
            return (
              <div
                key={p.id}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg ${isCurrentTurn ? 'bg-yellow-900/50 ring-2 ring-yellow-400' : 'bg-green-800'}`}
              >
                <span className="text-sm font-medium">{p.name}</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(p.cardCount, 13) }).map((_, i) => (
                    <div key={i} className="w-4 h-6 bg-blue-700 rounded border border-blue-500" />
                  ))}
                </div>
                <span className="text-xs text-green-400">{p.cardCount} cards • {p.score} pts</span>
              </div>
            );
          })}
      </div>

      {/* Center area: joker, deck, discard */}
      <div className="flex-1 flex items-center justify-center gap-6">
        {/* Joker indicator */}
        {gameState.jokerCard && (
          <div className="flex flex-col items-center gap-1">
            <Card card={gameState.jokerCard} size="lg" />
            <span className="text-xs text-yellow-400 font-bold">Joker</span>
          </div>
        )}

        {/* Deck */}
        <div className="flex flex-col items-center gap-2">
          <Card
            isBack
            onClick={isMyTurn && gameState.turnPhase === 'draw' ? () => onDrawCard('deck') : undefined}
            size="lg"
            className={isMyTurn && gameState.turnPhase === 'draw' ? 'ring-2 ring-yellow-400 cursor-pointer' : 'cursor-default'}
          />
          <span className="text-xs text-green-400">Deck ({gameState.deckCount})</span>
        </div>

        {/* Discard pile */}
        <div className="flex flex-col items-center gap-2">
          {gameState.discardTop ? (
            <Card
              card={gameState.discardTop}
              onClick={isMyTurn && gameState.turnPhase === 'draw' ? () => onDrawCard('discard') : undefined}
              size="lg"
              className={isMyTurn && gameState.turnPhase === 'draw' ? 'ring-2 ring-yellow-400 cursor-pointer' : ''}
            />
          ) : (
            <div className="w-18 h-24 rounded-lg border-2 border-dashed border-green-600 flex items-center justify-center text-green-600 text-xs">
              Empty
            </div>
          )}
          <span className="text-xs text-green-400">Discard ({gameState.discardCount})</span>
        </div>
      </div>

      {/* Action buttons */}
      {isMyTurn && gameState.turnPhase === 'discard' && (
        <div className="flex justify-center gap-4 py-2">
          <button
            onClick={handleDiscard}
            disabled={!selectedCardId}
            className="bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Discard Selected
          </button>
          <button
            onClick={handleDeclareClick}
            className="bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Declare
          </button>
        </div>
      )}

      {/* Player's hand */}
      <div className={`border-t-2 ${isMyTurn ? 'border-yellow-400' : 'border-green-700'} bg-green-950`}>
        <Hand
          cards={gameState.myHand}
          selectedCardId={selectedCardId}
          onSelectCard={handleCardSelect}
          onReorder={onReorderHand}
        />
      </div>

      {/* Declare modal */}
      {showDeclare && (
        <DeclareModal
          hand={gameState.myHand}
          onDeclare={(discardCardId, sets) => {
            onDeclare(discardCardId, sets);
            setShowDeclare(false);
          }}
          onCancel={() => setShowDeclare(false)}
        />
      )}
    </div>
  );
}
