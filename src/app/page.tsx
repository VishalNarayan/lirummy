'use client';

import { useState, KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'home' | 'join'>('home');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleCreate() {
    if (!playerName.trim() || loading) return;
    setLoading(true);
    sessionStorage.setItem('lirummy-name', playerName.trim());
    sessionStorage.setItem('lirummy-action', 'create');
    router.push(`/game/NEW`);
  }

  function handleJoin() {
    if (!playerName.trim() || !joinCode.trim() || loading) return;
    setLoading(true);
    sessionStorage.setItem('lirummy-name', playerName.trim());
    sessionStorage.setItem('lirummy-action', 'join');
    router.push(`/game/${joinCode.trim().toUpperCase()}`);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key !== 'Enter') return;
    if (mode === 'home') {
      handleCreate();
    } else {
      handleJoin();
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 text-white p-8">
      <h1 className="text-6xl font-bold mb-2">LiRummy</h1>
      <p className="text-xl text-green-300 mb-12">13-Card Indian Rummy</p>

      <div className="bg-green-800 rounded-xl p-8 shadow-2xl max-w-sm w-full">
        <input
          type="text"
          placeholder="Your name"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full bg-green-700 text-white placeholder-green-400 px-4 py-3 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-yellow-400"
          maxLength={20}
        />

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {mode === 'home' && (
          <div className="space-y-3">
            <button
              onClick={handleCreate}
              disabled={!playerName.trim() || loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-green-900 font-bold py-3 px-4 rounded-lg transition-colors text-lg"
            >
              {loading ? 'Creating...' : 'Create Game'}
            </button>
            <button
              onClick={() => setMode('join')}
              disabled={!playerName.trim()}
              className="w-full bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors text-lg"
            >
              Join Game
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Room code (e.g., ABCD)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              className="w-full bg-green-700 text-white placeholder-green-400 px-4 py-3 rounded-lg outline-none focus:ring-2 focus:ring-yellow-400 font-mono text-center text-2xl tracking-widest"
              maxLength={4}
              autoFocus
            />
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim() || loading}
              className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-green-900 font-bold py-3 px-4 rounded-lg transition-colors text-lg"
            >
              {loading ? 'Joining...' : 'Join'}
            </button>
            <button
              onClick={() => setMode('home')}
              className="w-full bg-green-700 hover:bg-green-600 text-white py-2 px-4 rounded-lg transition-colors text-sm"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
