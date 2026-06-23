import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CardDisplay } from './CardDisplay';

const baseCard = {
  id: 'test',
  cardDefId: 'virus_001',
  name: 'TestCard',
  power: 7,
};

describe('CardDisplay', () => {
  it('renders player card with blue border', () => {
    const { container } = render(<CardDisplay card={baseCard} playerSide="player" />);
    const card = container.querySelector('.card-display');
    expect(card?.className).toContain('border-cyan-500/60');
  });

  it('renders opponent card with red border', () => {
    const { container } = render(<CardDisplay card={baseCard} playerSide="opponent" />);
    const card = container.querySelector('.card-display');
    expect(card?.className).toContain('border-red-500/60');
  });

  it('displays card name and power', () => {
    render(<CardDisplay card={baseCard} playerSide="player" />);
    expect(screen.getByText('TestCard')).toBeDefined();
    expect(screen.getByText('7')).toBeDefined();
  });

  it('has default bg color for player', () => {
    const { container } = render(<CardDisplay card={baseCard} playerSide="player" />);
    const card = container.querySelector('.card-display');
    expect(card?.className).toContain('bg-gray-800');
  });

  it('has opponent bg color', () => {
    const { container } = render(<CardDisplay card={baseCard} playerSide="opponent" />);
    const card = container.querySelector('.card-display');
    expect(card?.className).toContain('bg-gray-800');
  });
});
