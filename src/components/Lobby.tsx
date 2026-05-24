'use client';

import { ClientGameState } from '../lib/types';

interface LobbyProps {
  gameState: ClientGameState;
  onStart: () => void;
  onKick: (playerId: string) => void;
  onLeave: () => void;
}

export default function Lobby({ gameState, onStart, onKick, onLeave }: LobbyProps) {
  const isHost = gameState.players.find(p => p.id === gameState.myPlayerId)?.isHost;
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/game/${gameState.roomCode}` : '';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 text-white p-8">
      <h1 className="text-4xl font-bold mb-2">LiRummy</h1>
      <p className="text-lg mb-8 text-green-300">13-Card Indian Rummy</p>

      <div className="bg-green-800 rounded-xl p-8 shadow-2xl max-w-md w-full">
        <div className="text-center mb-6">
          <p className="text-sm text-green-300 mb-1">Room Code</p>
          <p className="text-5xl font-mono font-bold tracking-widest">{gameState.roomCode}</p>
        </div>

        <div className="mb-6">
          <button
            onClick={() => navigator.clipboard.writeText(shareUrl)}
            className="w-full bg-green-600 hover:bg-green-500 text-white py-2 px-4 rounded-lg transition-colors text-sm"
          >
            Copy Invite Link
          </button>
        </div>

        <div className="mb-6">
          <p className="text-sm text-green-300 mb-2">Players ({gameState.players.length}/8)</p>
          <div className="space-y-2">
            {gameState.players.map((p) => (
              <div key={p.id} className="flex items-center gap-2 bg-green-700 rounded-lg px-4 py-2">
                <span className={`w-2 h-2 rounded-full ${p.connected ? 'bg-green-400' : 'bg-gray-500'}`} />
                <span className="flex-1">{p.name}</span>
                {p.isHost && <span className="text-xs bg-yellow-600 px-2 py-0.5 rounded-full">Host</span>}
                {p.id === gameState.myPlayerId && <span className="text-xs text-green-400">(you)</span>}
                {isHost && p.id !== gameState.myPlayerId && (
                  <button
                    onClick={() => onKick(p.id)}
                    className="text-xs text-red-400 hover:text-red-300 hover:bg-red-900/30 px-2 py-0.5 rounded transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {isHost && (
          <button
            onClick={onStart}
            disabled={gameState.players.length < 2}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-green-900 font-bold py-3 px-4 rounded-lg transition-colors text-lg mb-3"
          >
            {gameState.players.length < 2 ? 'Waiting for players...' : 'Start Game'}
          </button>
        )}
        {!isHost && (
          <p className="text-center text-green-300 mb-3">Waiting for host to start...</p>
        )}

        <button
          onClick={onLeave}
          className="w-full bg-red-800 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors text-sm"
        >
          Leave Game
        </button>
      </div>
    </div>
  );
}
