export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;
  suit: Suit | 'joker';
  rank: Rank | 'JOKER';
  isWild: boolean;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  score: number;
  isHost: boolean;
  connected: boolean;
}

export type GamePhase = 'lobby' | 'playing' | 'declaring' | 'roundEnd';

export interface GameState {
  roomCode: string;
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  jokerCard: Card | null;
  phase: GamePhase;
  turnPhase: 'draw' | 'discard';
  declaringPlayerId: string | null;
  roundResults: RoundResult | null;
  numDecks: number;
}

export interface PlayerScoreDetail {
  playerId: string;
  points: number;
  hand: Card[];
  validSets: Card[][];
  ungroupedCards: Card[];
  hasNatural: boolean;
}

export interface RoundResult {
  declarerId: string;
  isValid: boolean;
  invalidReason?: string;
  declaredSets: Card[][];
  playerScores: PlayerScoreDetail[];
}

export interface ClientGameState {
  roomCode: string;
  players: { id: string; name: string; cardCount: number; score: number; isHost: boolean; connected: boolean }[];
  currentPlayerIndex: number;
  myHand: Card[];
  discardTop: Card | null;
  discardCount: number;
  deckCount: number;
  jokerCard: Card | null;
  phase: GamePhase;
  turnPhase: 'draw' | 'discard';
  declaringPlayerId: string | null;
  roundResults: RoundResult | null;
  myPlayerId: string;
}

export const RANK_VALUES: Record<string, number> = {
  'A': 10, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 10, 'Q': 10, 'K': 10, 'JOKER': 0,
};

export const RANK_ORDER: Record<string, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
};
