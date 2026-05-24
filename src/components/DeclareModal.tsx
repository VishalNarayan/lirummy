'use client';

import { useState, useEffect } from 'react';
import { Card as CardType } from '../lib/types';
import Card from './Card';

type DeclareStep = 'discard' | 'natural' | 'set2' | 'set3';

const STEP_CONFIG: Record<DeclareStep, { label: string; prompt: string; count: number }> = {
  discard: { label: 'Discard', prompt: 'Select 1 card to discard face-down', count: 1 },
  natural: { label: 'Natural Run', prompt: 'Select 3 cards for your natural run (consecutive, same suit, no jokers)', count: 3 },
  set2: { label: 'Set 2', prompt: 'Select 3 cards for your second set', count: 3 },
  set3: { label: 'Set 3', prompt: 'Select 3 cards for your third set', count: 3 },
};

const STEPS: DeclareStep[] = ['discard', 'natural', 'set2', 'set3'];

interface DeclareModalProps {
  hand: CardType[];
  onDeclare: (discardCardId: string, sets: CardType[][]) => void;
  onCancel: () => void;
}

export default function DeclareModal({ hand, onDeclare, onCancel }: DeclareModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<{ step: string; cards: CardType[] }[]>([]);
  const [readyToDeclare, setReadyToDeclare] = useState(false);

  const usedCardIds = new Set<string>();
  for (const cs of completedSteps) {
    for (const c of cs.cards) usedCardIds.add(c.id);
  }
  const availableCards = hand.filter(c => !usedCardIds.has(c.id));

  const isSelectingSteps = stepIndex < STEPS.length;
  const currentStep = isSelectingSteps ? STEPS[stepIndex] : null;
  const config = currentStep ? STEP_CONFIG[currentStep] : null;

  useEffect(() => {
    if (completedSteps.length === 4 && !readyToDeclare) {
      const remaining = hand.filter(c => !usedCardIds.has(c.id));
      if (remaining.length === 4) {
        setCompletedSteps(prev => [...prev, { step: 'set4', cards: remaining }]);
        setReadyToDeclare(true);
      }
    }
  }, [completedSteps, hand, usedCardIds, readyToDeclare]);

  function toggleCard(cardId: string) {
    if (!config) return;
    if (selectedIds.includes(cardId)) {
      setSelectedIds(selectedIds.filter(id => id !== cardId));
    } else if (selectedIds.length < config.count) {
      setSelectedIds([...selectedIds, cardId]);
    }
  }

  function confirmStep() {
    if (!config || selectedIds.length !== config.count) return;
    const cards = selectedIds.map(id => hand.find(c => c.id === id)!);
    setCompletedSteps([...completedSteps, { step: currentStep!, cards }]);
    setSelectedIds([]);
    setStepIndex(stepIndex + 1);
  }

  function goBack() {
    if (readyToDeclare) {
      setCompletedSteps(prev => prev.slice(0, -2));
      setReadyToDeclare(false);
      setStepIndex(STEPS.length - 1);
      setSelectedIds([]);
    } else if (completedSteps.length > 0) {
      setCompletedSteps(prev => prev.slice(0, -1));
      setStepIndex(stepIndex - 1);
      setSelectedIds([]);
    }
  }

  function handleDeclare() {
    if (completedSteps.length !== 5) return;
    const discardCardId = completedSteps[0].cards[0].id;
    const sets = [
      completedSteps[1].cards,
      completedSteps[2].cards,
      completedSteps[3].cards,
      completedSteps[4].cards,
    ];
    onDeclare(discardCardId, sets);
  }

  const STEP_LABELS: Record<string, string> = {
    discard: 'Discard',
    natural: 'Natural Run',
    set2: 'Set 2',
    set3: 'Set 3',
    set4: 'Set 4',
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-green-800 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-white mb-4">Declare</h2>

        {/* Step indicator */}
        <div className="flex gap-2 mb-4">
          {['discard', 'natural', 'set2', 'set3', 'set4'].map((step, i) => (
            <div
              key={step}
              className={`flex-1 text-center text-xs py-1 rounded ${
                i < completedSteps.length
                  ? 'bg-green-500 text-white'
                  : i === stepIndex && !readyToDeclare
                  ? 'bg-yellow-500 text-green-900 font-bold'
                  : 'bg-green-700 text-green-400'
              }`}
            >
              {STEP_LABELS[step]}
            </div>
          ))}
        </div>

        {/* Completed steps summary */}
        {completedSteps.length > 0 && (
          <div className="mb-4 space-y-2">
            {completedSteps.map((cs, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-green-400 w-24 shrink-0">{STEP_LABELS[cs.step]}:</span>
                <div className="flex gap-1">
                  {cs.cards.map(card => (
                    <Card key={card.id} card={card} size="sm" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Current step */}
        {isSelectingSteps && config && (
          <>
            <div className="bg-green-700/50 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-300 font-medium mb-1">
                Step {stepIndex + 1}: {config.prompt}
              </p>
              <p className="text-xs text-green-400">
                Selected: {selectedIds.length}/{config.count}
              </p>
            </div>

            <div className="flex gap-1 flex-wrap mb-4">
              {availableCards.map((card) => (
                <Card
                  key={card.id}
                  card={card}
                  size="sm"
                  isSelected={selectedIds.includes(card.id)}
                  onClick={() => toggleCard(card.id)}
                  className={selectedIds.includes(card.id) ? '-translate-y-2' : ''}
                />
              ))}
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          {isSelectingSteps && config && (
            <button
              onClick={confirmStep}
              disabled={selectedIds.length !== config.count}
              className="flex-1 bg-green-500 hover:bg-green-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors"
            >
              Confirm & Next
            </button>
          )}
          {readyToDeclare && (
            <button
              onClick={handleDeclare}
              className="flex-1 bg-yellow-500 hover:bg-yellow-400 text-green-900 font-bold py-3 rounded-lg transition-colors text-lg"
            >
              Declare!
            </button>
          )}
          {completedSteps.length > 0 && (
            <button
              onClick={goBack}
              className="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Back
            </button>
          )}
          <button
            onClick={onCancel}
            className="bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
