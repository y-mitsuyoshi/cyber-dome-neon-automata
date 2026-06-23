import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CardDisplay from './CardDisplay';
import { Card } from '../types/game';

const mockCard: Card = {
  id: 'test-1',
  name: 'Firewall',
  power: 7,
  imageUrl: '/images/cards/test.png',
};

describe('CardDisplay', () => {
  it('renders card name and power', () => {
    render(<CardDisplay card={mockCard} />);
    expect(screen.getByText('Firewall')).toBeDefined();
    expect(screen.getByText('Power: 7')).toBeDefined();
  });

  it('renders fallback when faceDown is true', () => {
    render(<CardDisplay card={mockCard} faceDown />);
    expect(screen.getByText('?')).toBeDefined();
    expect(screen.getByText('Opponent Card')).toBeDefined();
    // Should not show actual card details
    expect(screen.queryByText('Firewall')).toBeNull();
  });

  it('applies player border when side is player', () => {
    const { container } = render(<CardDisplay card={mockCard} side="player" />);
    const cardEl = container.firstChild as HTMLElement;
    expect(cardEl.className).toContain('border-cyan-500');
  });

  it('applies opponent border when side is opponent', () => {
    const { container } = render(<CardDisplay card={mockCard} side="opponent" />);
    const cardEl = container.firstChild as HTMLElement;
    expect(cardEl.className).toContain('border-red-500');
  });

  it('renders default image when no imageUrl provided', () => {
    const noImgCard: Card = { id: 'test-2', name: 'Test', power: 1 };
    const { container } = render(<CardDisplay card={noImgCard} />);
    const img = container.querySelector('img');
    expect(img?.src).toContain('default.png');
  });
});
