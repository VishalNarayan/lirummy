import { Card, Suit, Rank, GameState, Player, RANK_ORDER, RANK_VALUES } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let cardIdCounter = 0;

function createDeck(deckIndex: number): Card[] {
  const cards: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      cards.push({
        id: `${suit}-${rank}-${deckIndex}-${cardIdCounter++}`,
        suit,
        rank,
        isWild: false,
      });
    }
  }
  cards.push({
    id: `joker-red-${deckIndex}-${cardIdCounter++}`,
    suit: 'joker',
    rank: 'JOKER',
    isWild: true,
  });
  cards.push({
    id: `joker-black-${deckIndex}-${cardIdCounter++}`,
    suit: 'joker',
    rank: 'JOKER',
    isWild: true,
  });
  return cards;
}

function shuffle(cards: Card[]): Card[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function getNumDecks(playerCount: number): number {
  if (playerCount <= 2) return 1;
  if (playerCount <= 6) return 2;
  return 3;
}

export function createAndShuffleDeck(numDecks: number): Card[] {
  cardIdCounter = 0;
  let allCards: Card[] = [];
  for (let i = 0; i < numDecks; i++) {
    allCards = allCards.concat(createDeck(i));
  }
  return shuffle(allCards);
}

export function selectJoker(deck: Card[]): { jokerCard: Card; remainingDeck: Card[] } {
  let jokerIndex = -1;
  for (let i = 0; i < deck.length; i++) {
    if (deck[i].rank !== 'JOKER') {
      jokerIndex = i;
      break;
    }
  }
  if (jokerIndex === -1) throw new Error('No non-joker card found for joker selection');

  const jokerCard = deck[jokerIndex];
  const remainingDeck = deck.filter((_, i) => i !== jokerIndex);

  for (const card of remainingDeck) {
    if (card.rank === 'JOKER' || card.rank === jokerCard.rank) {
      card.isWild = true;
    }
  }

  return { jokerCard, remainingDeck };
}

export function dealCards(deck: Card[], players: Player[], cardsPerPlayer: number = 13): { deck: Card[]; players: Player[] } {
  const updatedDeck = [...deck];
  const updatedPlayers = players.map(p => ({ ...p, hand: [] as Card[] }));

  for (let i = 0; i < cardsPerPlayer; i++) {
    for (const player of updatedPlayers) {
      const card = updatedDeck.shift();
      if (!card) throw new Error('Not enough cards to deal');
      player.hand.push(card);
    }
  }

  return { deck: updatedDeck, players: updatedPlayers };
}

export function isValidRun(cards: Card[]): boolean {
  if (cards.length < 3) return false;

  const nonWild = cards.filter(c => !c.isWild);
  if (nonWild.length === 0) return false;

  const suits = new Set(nonWild.map(c => c.suit));
  if (suits.size !== 1) return false;

  const sortedNonWild = [...nonWild].sort((a, b) => RANK_ORDER[a.rank] - RANK_ORDER[b.rank]);
  const wildCount = cards.length - nonWild.length;

  const minRank = RANK_ORDER[sortedNonWild[0].rank];
  const maxRank = RANK_ORDER[sortedNonWild[sortedNonWild.length - 1].rank];
  const span = maxRank - minRank + 1;

  if (span > cards.length) return false;
  if (span < cards.length && wildCount < cards.length - span) return false;

  const positions = new Set(sortedNonWild.map(c => RANK_ORDER[c.rank]));
  if (positions.size !== nonWild.length) return false;

  const gaps = span - nonWild.length;
  if (gaps > wildCount) return false;

  return true;
}

export function isNaturalRun(cards: Card[]): boolean {
  if (cards.some(c => c.isWild)) return false;
  return isValidRun(cards);
}

export function isValidGroup(cards: Card[]): boolean {
  if (cards.length < 3) return false;

  const nonWild = cards.filter(c => !c.isWild);
  if (nonWild.length === 0) return false;

  const ranks = new Set(nonWild.map(c => c.rank));
  if (ranks.size !== 1) return false;

  const suits = nonWild.map(c => c.suit);
  if (new Set(suits).size !== suits.length) return false;

  if (nonWild.length + cards.filter(c => c.isWild).length > 4) return false;

  return true;
}

export function isValidSet(cards: Card[]): boolean {
  return isValidRun(cards) || isValidGroup(cards);
}

export function validateDeclaration(sets: Card[][]): { valid: boolean; reason?: string } {
  if (sets.length !== 4) {
    return { valid: false, reason: 'Must have exactly 4 sets' };
  }

  const sizes = sets.map(s => s.length).sort((a, b) => a - b);
  const expectedSizes = [3, 3, 3, 4];
  if (JSON.stringify(sizes) !== JSON.stringify(expectedSizes)) {
    return { valid: false, reason: 'Sets must be of sizes 3, 3, 3, and 4' };
  }

  for (let i = 0; i < sets.length; i++) {
    if (!isValidSet(sets[i])) {
      return { valid: false, reason: `Set ${i + 1} is not a valid run or group` };
    }
  }

  const hasNatural = sets.some(s => isNaturalRun(s));
  if (!hasNatural) {
    return { valid: false, reason: 'At least one set must be a natural run (no jokers, consecutive same suit)' };
  }

  return { valid: true };
}

export function calculatePoints(cards: Card[]): number {
  return cards.reduce((sum, card) => sum + (RANK_VALUES[card.rank] || 0), 0);
}

function findAllValidSets(cards: Card[], minSize: number, maxSize: number): Card[][] {
  const results: Card[][] = [];
  function recurse(start: number, current: Card[]) {
    if (current.length >= minSize && current.length <= maxSize) {
      if (isValidSet(current)) results.push([...current]);
    }
    if (current.length >= maxSize) return;
    for (let i = start; i < cards.length; i++) {
      current.push(cards[i]);
      recurse(i + 1, current);
      current.pop();
    }
  }
  recurse(0, []);
  return results;
}

export interface LoserScoreResult {
  points: number;
  validSets: Card[][];
  ungroupedCards: Card[];
  hasNatural: boolean;
}

export function calculateLoserScore(hand: Card[]): LoserScoreResult {
  const noNatural: LoserScoreResult = {
    points: 100,
    validSets: [],
    ungroupedCards: hand,
    hasNatural: false,
  };

  let bestResult: LoserScoreResult = noNatural;

  const allSets = findAllValidSets(hand, 3, 4);
  const naturalSets = allSets.filter(s => isNaturalRun(s));

  if (naturalSets.length === 0) return noNatural;

  for (const nat of naturalSets) {
    const natIds = new Set(nat.map(c => c.id));
    const remaining1 = hand.filter(c => !natIds.has(c.id));
    const sets2 = findAllValidSets(remaining1, 3, 4);

    const tryWithSets = (validSets: Card[][]) => {
      const usedIds = new Set<string>();
      for (const s of validSets) for (const c of s) usedIds.add(c.id);
      for (const c of nat) usedIds.add(c.id);
      const ungrouped = hand.filter(c => !usedIds.has(c.id));
      const pts = calculatePoints(ungrouped);
      if (pts < bestResult.points) {
        bestResult = {
          points: pts,
          validSets: [nat, ...validSets],
          ungroupedCards: ungrouped,
          hasNatural: true,
        };
      }
    };

    tryWithSets([]);

    for (const s2 of sets2) {
      tryWithSets([s2]);
      const s2Ids = new Set(s2.map(c => c.id));
      const remaining2 = remaining1.filter(c => !s2Ids.has(c.id));
      const sets3 = findAllValidSets(remaining2, 3, 4);

      for (const s3 of sets3) {
        tryWithSets([s2, s3]);
        const s3Ids = new Set(s3.map(c => c.id));
        const remaining3 = remaining2.filter(c => !s3Ids.has(c.id));
        const sets4 = findAllValidSets(remaining3, 3, 4);
        for (const s4 of sets4) {
          tryWithSets([s2, s3, s4]);
        }
      }
    }
  }

  return bestResult;
}

export function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function createInitialGameState(roomCode: string): GameState {
  return {
    roomCode,
    players: [],
    currentPlayerIndex: 0,
    deck: [],
    discardPile: [],
    jokerCard: null,
    phase: 'lobby',
    turnPhase: 'draw',
    declaringPlayerId: null,
    roundResults: null,
    numDecks: 1,
  };
}
