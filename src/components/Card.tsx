'use client';

import { Card as CardType } from '../lib/types';

const SUIT_SYMBOLS: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

const SUIT_COLORS: Record<string, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
};

interface CardProps {
  card?: CardType;
  isBack?: boolean;
  isSelected?: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Card({ card, isBack, isSelected, onClick, size = 'md', className = '' }: CardProps) {
  const sizeClasses = {
    sm: 'w-10 h-14 text-xs',
    md: 'w-14 h-20 text-sm',
    lg: 'w-18 h-24 text-base',
  };

  if (isBack || !card) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg border-2 border-gray-300 bg-blue-700 flex items-center justify-center cursor-pointer shadow-md ${className}`}
        onClick={onClick}
      >
        <div className="w-3/4 h-3/4 rounded border border-blue-400 bg-blue-600 flex items-center justify-center">
          <span className="text-blue-300 font-bold text-lg">♠</span>
        </div>
      </div>
    );
  }

  if (card.rank === 'JOKER') {
    return (
      <div
        className={`${sizeClasses[size]} rounded-lg border-2 ${isSelected ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-gray-300'} bg-white flex flex-col items-center justify-center cursor-pointer shadow-md hover:shadow-lg transition-shadow ${card.isWild ? 'bg-yellow-50' : ''} ${className}`}
        onClick={onClick}
      >
        <span className="text-lg">🃏</span>
        <span className="text-[8px] font-bold text-purple-600">JOKER</span>
      </div>
    );
  }

  const suitSymbol = SUIT_SYMBOLS[card.suit] || '';
  const suitColor = SUIT_COLORS[card.suit] || 'text-gray-900';

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg border-2 ${isSelected ? 'border-yellow-400 ring-2 ring-yellow-400' : 'border-gray-300'} bg-white flex flex-col items-start p-1 cursor-pointer shadow-md hover:shadow-lg transition-shadow relative ${card.isWild ? 'bg-yellow-50' : ''} ${className}`}
      onClick={onClick}
    >
      <div className={`${suitColor} font-bold leading-tight`}>
        <div>{card.rank}</div>
        <div className="text-base">{suitSymbol}</div>
      </div>
      <div className={`absolute bottom-1 right-1 ${suitColor} text-base`}>
        {suitSymbol}
      </div>
      {card.isWild && (
        <div className="absolute top-0 right-0 bg-yellow-400 text-[6px] px-0.5 rounded-bl font-bold">W</div>
      )}
    </div>
  );
}
