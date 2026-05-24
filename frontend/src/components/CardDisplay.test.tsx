import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CardDisplay from './CardDisplay'
import type { Card } from '../types/game'

// Mock audio context to avoid Web Audio API issues in test env
vi.mock('../context/AudioContext', () => ({
  useAudio: () => ({ playSE: vi.fn() }),
}))

vi.mock('../context/TranslationContext', () => ({
  useTranslation: () => ({
    translateCard: (card: Card) => card,
    t: (key: string) => key,
  }),
}))

const mockCard: Card = {
  id: 'test_001',
  name: 'Test Virus',
  attribute: 'Virus',
  archetype: 'Aggro',
  power: 7,
  cost: 3,
  effect: 'Test effect text',
  effectType: 'none',
  rarity: 'Common',
}

describe('CardDisplay', () => {
  it('renders card name and power', () => {
    render(<CardDisplay card={mockCard} />)
    expect(screen.getByText('Test Virus')).toBeDefined()
    expect(screen.getByText('7')).toBeDefined()
  })

  it('renders rarity badge', () => {
    render(<CardDisplay card={mockCard} />)
    expect(screen.getByText('Common')).toBeDefined()
  })

  it('renders compact mode without image', () => {
    render(<CardDisplay card={mockCard} compact />)
    expect(screen.getByText('Test Virus')).toBeDefined()
    expect(screen.getByText('7')).toBeDefined()
  })

  it('renders cost when showCost is true', () => {
    render(<CardDisplay card={mockCard} showCost />)
    expect(screen.getByText('3¢')).toBeDefined()
  })
})
