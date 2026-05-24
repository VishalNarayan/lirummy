'use client';

import { useEffect, useRef, useState, KeyboardEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useGame } from '../../../hooks/useGame';
import Lobby from '../../../components/Lobby';
import GameBoard from '../../../components/GameBoard';

export default function GamePage() {
  const params = useParams();
  const roomCodeParam = params.id as string;
  const router = useRouter();
  const {
    gameState,
    error,
    kicked,
    createGame,
    joinGame,
    rejoinGame,
    leaveGame,
    startGame,
    drawCard,
    discardCard,
    declare,
    reorderHand,
    kickPlayer,
    playAgain,
  } = useGame();
  const [needsJoin, setNeedsJoin] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [joining, setJoining] = useState(false);
  const initAttempted = useRef(false);

  useEffect(() => {
    if (kicked) {
      router.push('/');
    }
  }, [kicked, router]);

  useEffect(() => {
    if (initAttempted.current || gameState) return;
    initAttempted.current = true;

    const storedName = sessionStorage.getItem('lirummy-name');
    const action = sessionStorage.getItem('lirummy-action');
    const storedRoom = sessionStorage.getItem('lirummy-room');
    sessionStorage.removeItem('lirummy-action');

    if (roomCodeParam === 'NEW' && action === 'create' && storedName) {
      createGame(storedName).then((code) => {
        window.history.replaceState(null, '', `/game/${code}`);
      });
    } else if (storedRoom && storedRoom === roomCodeParam.toUpperCase()) {
      rejoinGame(roomCodeParam).catch(() => {
        if (storedName) {
          joinGame(roomCodeParam, storedName).catch(() => setNeedsJoin(true));
        } else {
          setNeedsJoin(true);
        }
      });
    } else if (storedName) {
      joinGame(roomCodeParam, storedName).catch(() => setNeedsJoin(true));
    } else {
      setNeedsJoin(true);
    }
  }, [gameState, roomCodeParam, createGame, joinGame, rejoinGame]);

  useEffect(() => {
    if (gameState) setNeedsJoin(false);
  }, [gameState]);

  function handleLeave() {
    leaveGame();
    router.push('/');
  }

  async function handleJoin() {
    if (!playerName.trim()) return;
    setJoining(true);
    try {
      sessionStorage.setItem('lirummy-name', playerName.trim());
      await joinGame(roomCodeParam, playerName.trim());
      setNeedsJoin(false);
    } catch {
      setJoining(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') handleJoin();
  }

  if (needsJoin && !gameState) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-green-900 text-white p-8">
        <h1 className="text-4xl font-bold mb-2">LiRummy</h1>
        <p className="text-lg text-green-300 mb-8">Join Game: {roomCodeParam}</p>

        <div className="bg-green-800 rounded-xl p-8 shadow-2xl max-w-sm w-full">
          {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
          <input
            type="text"
            placeholder="Your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full bg-green-700 text-white placeholder-green-400 px-4 py-3 rounded-lg mb-4 outline-none focus:ring-2 focus:ring-yellow-400"
            maxLength={20}
            autoFocus
          />
          <button
            onClick={handleJoin}
            disabled={!playerName.trim() || joining}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-green-900 font-bold py-3 px-4 rounded-lg transition-colors text-lg"
          >
            {joining ? 'Joining...' : 'Join Game'}
          </button>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-green-900 text-white">
        <p className="text-xl">Connecting...</p>
      </div>
    );
  }

  if (gameState.phase === 'lobby') {
    return <Lobby gameState={gameState} onStart={startGame} onKick={kickPlayer} onLeave={handleLeave} />;
  }

  return (
    <GameBoard
      gameState={gameState}
      onDrawCard={drawCard}
      onDiscardCard={discardCard}
      onDeclare={declare}
      onReorderHand={reorderHand}
      onPlayAgain={playAgain}
      onLeave={handleLeave}
    />
  );
}
