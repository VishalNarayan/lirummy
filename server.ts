import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server as SocketServer } from 'socket.io';
import nodemailer from 'nodemailer';
import {
  createInitialGameState,
  generateRoomCode,
  getNumDecks,
  createAndShuffleDeck,
  selectJoker,
  dealCards,
  validateDeclaration,
  calculateLoserScore,
} from './src/lib/gameLogic';
import { GameState, ClientGameState, Card, PlayerScoreDetail } from './src/lib/types';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const games = new Map<string, GameState>();
// Maps a persistent playerId to { roomCode, socketId }
const playerSessions = new Map<string, { roomCode: string; socketId: string }>();
// Grace period timers for game cleanup when all players disconnect
const cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

function getClientState(game: GameState, playerId: string): ClientGameState {
  const player = game.players.find(p => p.id === playerId);
  return {
    roomCode: game.roomCode,
    players: game.players.map(p => ({
      id: p.id,
      name: p.name,
      cardCount: p.hand.length,
      score: p.score,
      isHost: p.isHost,
      connected: p.connected,
    })),
    currentPlayerIndex: game.currentPlayerIndex,
    myHand: player?.hand || [],
    discardTop: game.discardPile.length > 0 ? game.discardPile[game.discardPile.length - 1] : null,
    discardCount: game.discardPile.length,
    deckCount: game.deck.length,
    jokerCard: game.jokerCard,
    phase: game.phase,
    turnPhase: game.turnPhase,
    declaringPlayerId: game.declaringPlayerId,
    roundResults: game.roundResults,
    myPlayerId: playerId,
  };
}

function broadcastGameState(io: SocketServer, game: GameState) {
  for (const player of game.players) {
    const session = playerSessions.get(player.id);
    if (session) {
      io.to(session.socketId).emit('game-state', getClientState(game, player.id));
    }
  }
}

function emitToPlayer(io: SocketServer, playerId: string, event: string, ...args: unknown[]) {
  const session = playerSessions.get(playerId);
  if (session) {
    io.to(session.socketId).emit(event, ...args);
  }
}

function getPlayerIdFromSocket(socketId: string): string | undefined {
  for (const [playerId, session] of playerSessions) {
    if (session.socketId === socketId) return playerId;
  }
  return undefined;
}

const smtpTransport = process.env.SMTP_USER && process.env.SMTP_PASS
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

async function handleFeedbackPost(req: IncomingMessage, res: ServerResponse) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const body = JSON.parse(Buffer.concat(chunks).toString());

  const { name, message } = body;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Message is required' }));
    return;
  }

  const feedback = {
    name: (name || 'Anonymous').slice(0, 50),
    message: message.slice(0, 2000),
    timestamp: new Date().toISOString(),
  };

  console.log('[Feedback]', feedback);

  if (smtpTransport) {
    try {
      await smtpTransport.sendMail({
        from: process.env.SMTP_USER,
        to: 'mr.vishal.narayan@gmail.com',
        subject: `LiRummy Feedback from ${feedback.name}`,
        text: `Name: ${feedback.name}\nTime: ${feedback.timestamp}\n\n${feedback.message}`,
      });
    } catch (err) {
      console.error('[Feedback] Email send failed:', err);
    }
  }

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true }));
}

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/api/feedback') {
      try {
        await handleFeedbackPost(req, res);
      } catch {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal error' }));
      }
      return;
    }
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketServer(server, {
    cors: { origin: '*' },
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('create-game', ({ playerName, playerId }: { playerName: string; playerId: string }) => {
      let roomCode = generateRoomCode();
      while (games.has(roomCode)) {
        roomCode = generateRoomCode();
      }

      const game = createInitialGameState(roomCode);
      game.players.push({
        id: playerId,
        name: playerName,
        hand: [],
        score: 0,
        isHost: true,
        connected: true,
      });

      games.set(roomCode, game);
      playerSessions.set(playerId, { roomCode, socketId: socket.id });
      socket.join(roomCode);
      socket.emit('game-created', roomCode);
      broadcastGameState(io, game);
    });

    socket.on('join-game', ({ roomCode, playerName, playerId }: { roomCode: string; playerName: string; playerId: string }) => {
      const code = roomCode.toUpperCase();
      const game = games.get(code);
      if (!game) {
        socket.emit('error-msg', 'Game not found');
        return;
      }

      const existingPlayer = game.players.find(p => p.id === playerId);
      if (existingPlayer) {
        existingPlayer.connected = true;
        existingPlayer.name = playerName;
        playerSessions.set(playerId, { roomCode: code, socketId: socket.id });
        socket.join(code);
        socket.emit('game-joined', code);
        broadcastGameState(io, game);
        return;
      }

      if (game.phase !== 'lobby') {
        socket.emit('error-msg', 'Game already in progress');
        return;
      }
      if (game.players.length >= 8) {
        socket.emit('error-msg', 'Game is full');
        return;
      }

      game.players.push({
        id: playerId,
        name: playerName,
        hand: [],
        score: 0,
        isHost: false,
        connected: true,
      });

      playerSessions.set(playerId, { roomCode: code, socketId: socket.id });
      socket.join(code);
      socket.emit('game-joined', code);
      broadcastGameState(io, game);
    });

    socket.on('rejoin', ({ playerId, roomCode }: { playerId: string; roomCode: string }) => {
      const code = roomCode.toUpperCase();
      const game = games.get(code);
      if (!game) {
        socket.emit('error-msg', 'Game not found');
        return;
      }

      const player = game.players.find(p => p.id === playerId);
      if (!player) {
        socket.emit('error-msg', 'Player not in game');
        return;
      }

      const timer = cleanupTimers.get(code);
      if (timer) {
        clearTimeout(timer);
        cleanupTimers.delete(code);
      }

      player.connected = true;
      playerSessions.set(playerId, { roomCode: code, socketId: socket.id });
      socket.join(code);
      socket.emit('game-rejoined', code);
      broadcastGameState(io, game);
    });

    socket.on('leave-game', () => {
      const playerId = getPlayerIdFromSocket(socket.id);
      if (!playerId) return;
      const session = playerSessions.get(playerId);
      if (!session) return;
      const game = games.get(session.roomCode);
      if (!game) return;

      game.players = game.players.filter(p => p.id !== playerId);
      playerSessions.delete(playerId);
      socket.leave(session.roomCode);

      if (game.players.length === 0) {
        games.delete(session.roomCode);
      } else {
        if (!game.players.some(p => p.isHost)) {
          game.players[0].isHost = true;
        }
        broadcastGameState(io, game);
      }

      socket.emit('left-game');
    });

    socket.on('kick-player', (targetPlayerId: string) => {
      const kickerPlayerId = getPlayerIdFromSocket(socket.id);
      if (!kickerPlayerId) return;
      const session = playerSessions.get(kickerPlayerId);
      if (!session) return;
      const game = games.get(session.roomCode);
      if (!game) return;

      const kicker = game.players.find(p => p.id === kickerPlayerId);
      if (!kicker?.isHost) return;
      if (targetPlayerId === kickerPlayerId) return;

      game.players = game.players.filter(p => p.id !== targetPlayerId);

      emitToPlayer(io, targetPlayerId, 'kicked');
      const targetSession = playerSessions.get(targetPlayerId);
      if (targetSession) {
        const targetSocket = io.sockets.sockets.get(targetSession.socketId);
        if (targetSocket) {
          targetSocket.leave(session.roomCode);
        }
      }
      playerSessions.delete(targetPlayerId);

      broadcastGameState(io, game);
    });

    socket.on('start-game', () => {
      const playerId = getPlayerIdFromSocket(socket.id);
      if (!playerId) return;
      const session = playerSessions.get(playerId);
      if (!session) return;
      const game = games.get(session.roomCode);
      if (!game) return;

      const player = game.players.find(p => p.id === playerId);
      if (!player?.isHost) {
        socket.emit('error-msg', 'Only the host can start the game');
        return;
      }
      if (game.players.length < 2) {
        socket.emit('error-msg', 'Need at least 2 players');
        return;
      }

      game.numDecks = getNumDecks(game.players.length);
      const deck = createAndShuffleDeck(game.numDecks);
      const { jokerCard, remainingDeck } = selectJoker(deck);
      game.jokerCard = jokerCard;

      const dealt = dealCards(remainingDeck, game.players);
      game.deck = dealt.deck;
      game.players = dealt.players;

      const firstDiscard = game.deck.shift();
      if (firstDiscard) {
        game.discardPile.push(firstDiscard);
      }

      game.phase = 'playing';
      game.turnPhase = 'draw';
      game.currentPlayerIndex = Math.floor(Math.random() * game.players.length);

      broadcastGameState(io, game);
    });

    socket.on('draw-card', (source: 'deck' | 'discard') => {
      const playerId = getPlayerIdFromSocket(socket.id);
      if (!playerId) return;
      const session = playerSessions.get(playerId);
      if (!session) return;
      const game = games.get(session.roomCode);
      if (!game || game.phase !== 'playing') return;

      const currentPlayer = game.players[game.currentPlayerIndex];
      if (currentPlayer.id !== playerId) {
        socket.emit('error-msg', 'Not your turn');
        return;
      }
      if (game.turnPhase !== 'draw') {
        socket.emit('error-msg', 'You already drew a card');
        return;
      }

      let card: Card | undefined;
      if (source === 'deck') {
        if (game.deck.length === 0) {
          const topDiscard = game.discardPile.pop();
          game.deck = game.discardPile.splice(0);
          game.deck = game.deck.sort(() => Math.random() - 0.5);
          if (topDiscard) game.discardPile.push(topDiscard);
        }
        card = game.deck.shift();
      } else {
        card = game.discardPile.pop();
      }

      if (!card) {
        socket.emit('error-msg', 'No cards available');
        return;
      }

      currentPlayer.hand.push(card);
      game.turnPhase = 'discard';
      broadcastGameState(io, game);
    });

    socket.on('discard-card', (cardId: string) => {
      const playerId = getPlayerIdFromSocket(socket.id);
      if (!playerId) return;
      const session = playerSessions.get(playerId);
      if (!session) return;
      const game = games.get(session.roomCode);
      if (!game || game.phase !== 'playing') return;

      const currentPlayer = game.players[game.currentPlayerIndex];
      if (currentPlayer.id !== playerId) return;
      if (game.turnPhase !== 'discard') return;

      const cardIndex = currentPlayer.hand.findIndex(c => c.id === cardId);
      if (cardIndex === -1) return;

      const [card] = currentPlayer.hand.splice(cardIndex, 1);
      game.discardPile.push(card);

      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      game.turnPhase = 'draw';
      broadcastGameState(io, game);
    });

    socket.on('declare', ({ discardCardId, sets }: { discardCardId: string; sets: Card[][] }) => {
      const playerId = getPlayerIdFromSocket(socket.id);
      if (!playerId) return;
      const session = playerSessions.get(playerId);
      if (!session) return;
      const game = games.get(session.roomCode);
      if (!game || game.phase !== 'playing') return;

      const currentPlayer = game.players[game.currentPlayerIndex];
      if (currentPlayer.id !== playerId) return;
      if (game.turnPhase !== 'discard') return;

      const discardIndex = currentPlayer.hand.findIndex(c => c.id === discardCardId);
      if (discardIndex === -1) return;
      currentPlayer.hand.splice(discardIndex, 1);

      const validation = validateDeclaration(sets);

      game.phase = 'roundEnd';
      game.declaringPlayerId = playerId;

      const playerScores: PlayerScoreDetail[] = [];
      let declarerWinnings = 0;

      if (validation.valid) {
        for (const p of game.players) {
          if (p.id === playerId) continue;
          const result = calculateLoserScore(p.hand);
          const contribution = result.hasNatural ? result.points : 100;
          declarerWinnings += contribution;
          playerScores.push({
            playerId: p.id,
            points: contribution,
            hand: p.hand,
            validSets: result.validSets,
            ungroupedCards: result.ungroupedCards,
            hasNatural: result.hasNatural,
          });
        }
        const declarer = game.players.find(p => p.id === playerId)!;
        declarer.score += declarerWinnings;
        playerScores.unshift({
          playerId,
          points: declarerWinnings,
          hand: declarer.hand,
          validSets: sets,
          ungroupedCards: [],
          hasNatural: true,
        });
      } else {
        const declarer = game.players.find(p => p.id === playerId)!;
        declarer.score -= 100;
        playerScores.push({
          playerId,
          points: -100,
          hand: declarer.hand,
          validSets: [],
          ungroupedCards: declarer.hand,
          hasNatural: false,
        });
        for (const p of game.players) {
          if (p.id === playerId) continue;
          playerScores.push({
            playerId: p.id,
            points: 0,
            hand: p.hand,
            validSets: [],
            ungroupedCards: [],
            hasNatural: false,
          });
        }
      }

      game.roundResults = {
        declarerId: playerId,
        isValid: validation.valid,
        invalidReason: validation.reason,
        declaredSets: sets,
        playerScores,
      };

      broadcastGameState(io, game);
    });

    socket.on('reorder-hand', (cardIds: string[]) => {
      const playerId = getPlayerIdFromSocket(socket.id);
      if (!playerId) return;
      const session = playerSessions.get(playerId);
      if (!session) return;
      const game = games.get(session.roomCode);
      if (!game) return;

      const player = game.players.find(p => p.id === playerId);
      if (!player) return;

      const cardMap = new Map(player.hand.map(c => [c.id, c]));
      const reordered: Card[] = [];
      for (const id of cardIds) {
        const card = cardMap.get(id);
        if (card) reordered.push(card);
      }
      if (reordered.length === player.hand.length) {
        player.hand = reordered;
        socket.emit('game-state', getClientState(game, playerId));
      }
    });

    socket.on('play-again', () => {
      const playerId = getPlayerIdFromSocket(socket.id);
      if (!playerId) return;
      const session = playerSessions.get(playerId);
      if (!session) return;
      const game = games.get(session.roomCode);
      if (!game || game.phase !== 'roundEnd') return;

      const player = game.players.find(p => p.id === playerId);
      if (!player?.isHost) return;

      game.numDecks = getNumDecks(game.players.length);
      const deck = createAndShuffleDeck(game.numDecks);
      const { jokerCard, remainingDeck } = selectJoker(deck);
      game.jokerCard = jokerCard;

      const dealt = dealCards(remainingDeck, game.players);
      game.deck = dealt.deck;
      game.players = dealt.players;

      const firstDiscard = game.deck.shift();
      if (firstDiscard) {
        game.discardPile = [firstDiscard];
      } else {
        game.discardPile = [];
      }

      game.phase = 'playing';
      game.turnPhase = 'draw';
      game.currentPlayerIndex = Math.floor(Math.random() * game.players.length);
      game.declaringPlayerId = null;
      game.roundResults = null;

      broadcastGameState(io, game);
    });

    socket.on('disconnect', () => {
      const playerId = getPlayerIdFromSocket(socket.id);
      if (!playerId) return;
      const session = playerSessions.get(playerId);
      if (!session) return;
      const game = games.get(session.roomCode);
      if (!game) return;

      const player = game.players.find(p => p.id === playerId);
      if (player) {
        player.connected = false;
      }

      if (game.players.every(p => !p.connected)) {
        const roomCode = session.roomCode;
        const existing = cleanupTimers.get(roomCode);
        if (existing) clearTimeout(existing);
        cleanupTimers.set(roomCode, setTimeout(() => {
          const g = games.get(roomCode);
          if (g && g.players.every(p => !p.connected)) {
            games.delete(roomCode);
            for (const p of g.players) {
              playerSessions.delete(p.id);
            }
          }
          cleanupTimers.delete(roomCode);
        }, 30000));
      } else {
        broadcastGameState(io, game);
      }
    });
  });

  const port = parseInt(process.env.PORT || '3000', 10);
  server.listen(port, () => {
    console.log(`> LiRummy server ready on http://localhost:${port}`);
  });
});
