'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSocket, getPlayerId } from '../lib/socket';
import { ClientGameState, Card } from '../lib/types';

export function useGame() {
  const [gameState, setGameState] = useState<ClientGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kicked, setKicked] = useState(false);
  const socket = getSocket();
  const localHandRef = useRef<Card[] | null>(null);

  useEffect(() => {
    socket.on('game-state', (state: ClientGameState) => {
      if (localHandRef.current) {
        state.myHand = localHandRef.current;
        localHandRef.current = null;
      }
      setGameState(state);
      setError(null);
    });

    socket.on('error-msg', (msg: string) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    });

    socket.on('kicked', () => {
      setGameState(null);
      setKicked(true);
      sessionStorage.removeItem('lirummy-room');
      setError('You were removed from the game');
    });

    socket.on('left-game', () => {
      setGameState(null);
      sessionStorage.removeItem('lirummy-room');
    });

    return () => {
      socket.off('game-state');
      socket.off('error-msg');
      socket.off('kicked');
      socket.off('left-game');
    };
  }, [socket]);

  const createGame = useCallback((playerName: string) => {
    return new Promise<string>((resolve) => {
      socket.once('game-created', (roomCode: string) => {
        sessionStorage.setItem('lirummy-room', roomCode);
        resolve(roomCode);
      });
      socket.emit('create-game', { playerName, playerId: getPlayerId() });
    });
  }, [socket]);

  const joinGame = useCallback((roomCode: string, playerName: string) => {
    return new Promise<string>((resolve, reject) => {
      const onJoined = (code: string) => {
        socket.off('error-msg', onError);
        sessionStorage.setItem('lirummy-room', code);
        resolve(code);
      };
      const onError = (msg: string) => {
        socket.off('game-joined', onJoined);
        reject(new Error(msg));
      };
      socket.once('game-joined', onJoined);
      socket.once('error-msg', onError);
      socket.emit('join-game', { roomCode, playerName, playerId: getPlayerId() });
    });
  }, [socket]);

  const rejoinGame = useCallback((roomCode: string) => {
    return new Promise<string>((resolve, reject) => {
      const onRejoined = (code: string) => {
        socket.off('error-msg', onError);
        resolve(code);
      };
      const onError = (msg: string) => {
        socket.off('game-rejoined', onRejoined);
        reject(new Error(msg));
      };
      socket.once('game-rejoined', onRejoined);
      socket.once('error-msg', onError);
      socket.emit('rejoin', { playerId: getPlayerId(), roomCode });
    });
  }, [socket]);

  const leaveGame = useCallback(() => {
    socket.emit('leave-game');
    sessionStorage.removeItem('lirummy-room');
  }, [socket]);

  const startGame = useCallback(() => {
    socket.emit('start-game');
  }, [socket]);

  const drawCard = useCallback((source: 'deck' | 'discard') => {
    socket.emit('draw-card', source);
  }, [socket]);

  const discardCard = useCallback((cardId: string) => {
    socket.emit('discard-card', cardId);
  }, [socket]);

  const declare = useCallback((discardCardId: string, sets: Card[][]) => {
    socket.emit('declare', { discardCardId, sets });
  }, [socket]);

  const reorderHand = useCallback((cardIds: string[]) => {
    if (!gameState) return;
    const cardMap = new Map(gameState.myHand.map(c => [c.id, c]));
    const reordered = cardIds.map(id => cardMap.get(id)!).filter(Boolean);
    if (reordered.length === gameState.myHand.length) {
      localHandRef.current = reordered;
      setGameState(prev => prev ? { ...prev, myHand: reordered } : prev);
    }
    socket.emit('reorder-hand', cardIds);
  }, [socket, gameState]);

  const kickPlayer = useCallback((playerId: string) => {
    socket.emit('kick-player', playerId);
  }, [socket]);

  const playAgain = useCallback(() => {
    socket.emit('play-again');
  }, [socket]);

  return {
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
  };
}
