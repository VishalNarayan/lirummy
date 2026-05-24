'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card as CardType } from '../lib/types';
import Card from './Card';

interface SortableCardProps {
  card: CardType;
  isSelected: boolean;
  onSelect: () => void;
}

function SortableCard({ card, isSelected, onSelect }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        card={card}
        isSelected={isSelected}
        onClick={onSelect}
        size="md"
        className={isSelected ? '-translate-y-3' : 'hover:-translate-y-1 transition-transform'}
      />
    </div>
  );
}

interface HandProps {
  cards: CardType[];
  selectedCardId: string | null;
  onSelectCard: (cardId: string) => void;
  onReorder: (cardIds: string[]) => void;
}

export default function Hand({ cards, selectedCardId, onSelectCard, onReorder }: HandProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = cards.findIndex(c => c.id === active.id);
    const newIndex = cards.findIndex(c => c.id === over.id);
    const newOrder = arrayMove(cards, oldIndex, newIndex);
    onReorder(newOrder.map(c => c.id));
  }

  return (
    <div className="flex justify-center items-end gap-1 flex-wrap p-4">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cards.map(c => c.id)} strategy={horizontalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              isSelected={card.id === selectedCardId}
              onSelect={() => onSelectCard(card.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  );
}
