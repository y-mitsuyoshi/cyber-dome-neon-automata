import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CardDisplay from './CardDisplay';

describe('CardDisplay', () => {
  const baseCard = {
    id: 'test-1',
    name: 'Neural Spike',
    power: 4,
    image: '/images/cards/ai_001.png',
  };

  it('renders player card without enemy label', () => {
    render(<CardDisplay card={baseCard} />);
    expect(screen.getByText('Neural Spike')).toBeDefined();
    expect(screen.queryByText('ENEMY')).toBeNull();
  });

  it('renders opponent card with enemy label and different styling', () => {
    const { container } = render(<CardDisplay card={baseCard} isOpponent />);
    expect(screen.getByText('Neural Spike')).toBeDefined();
    expect(screen.getByText('ENEMY')).toBeDefined();

    const cardDiv = container.firstChild as HTMLElement;
    expect(cardDiv.className).toContain('border-red');
  });

  it('displays card power', () => {
    render(<CardDisplay card={baseCard} />);
    expect(screen.getByText('4')).toBeDefined();
  });

  it('renders without image if image is not provided', () => {
    const cardNoImage = { ...baseCard, image: undefined };
    const { container } = render(<CardDisplay card={cardNoImage} />);
    const img = container.querySelector('img');
    expect(img).toBeNull();
    expect(screen.getByText('Neural Spike')).toBeDefined();
  });
});
