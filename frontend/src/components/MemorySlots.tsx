import React from 'react';

interface MemorySlotState {
  baseCardId: string;
  count: number;
}

interface MemorySlotsProps {
  slots: MemorySlotState[];
  side?: 'player' | 'opponent';
}

export function MemorySlots({ slots, side = 'player' }: MemorySlotsProps) {
  const borderColor = side === 'player' ? 'border-cyan-500/30' : 'border-red-500/30';
  const textColor = side === 'player' ? 'text-cyan-600' : 'text-red-600';

  return (
    <div className={`border ${borderColor} rounded-lg bg-gray-900/60 p-3`}>
      <div className={`${textColor} text-xs mb-1 font-mono`}>// MEMORY</div>
      <div className="flex flex-wrap gap-1">
        {slots.length === 0 && (
          <div className="text-gray-600 text-xs italic">empty</div>
        )}
        {slots.map((slot, i) => (
          <div
            key={`${slot.baseCardId}-${i}`}
            className={`border ${borderColor} rounded px-2 py-1 bg-gray-800`}
          >
            <span className="text-gray-400 text-xs">{slot.baseCardId}</span>
            <span className="text-white text-xs font-mono ml-1">x{slot.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
