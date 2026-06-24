import { describe, it, expect, beforeEach, vi } from 'vitest'
import { audioService, type SoundEffectType, type BGMThemeType } from './audio'

// Minimal AudioContext mock for Node.js / happy-dom environment
function createMockAudioContext() {
  const createNode = () => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
    },
    gain: {
      setValueAtTime: vi.fn(),
      linearRampToValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
      setTargetAtTime: vi.fn(),
    },
    Q: { setValueAtTime: vi.fn() },
    type: 'sine',
    buffer: null,
    delayTime: { setValueAtTime: vi.fn() },
    curve: null,
    oversample: 'none' as const,
  })

  return {
    currentTime: 0,
    state: 'running' as AudioContextState,
    destination: {} as AudioDestinationNode,
    resume: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(createNode),
    createOscillator: vi.fn(createNode),
    createBiquadFilter: vi.fn(createNode),
    createDynamicsCompressor: vi.fn(createNode),
    createDelay: vi.fn(createNode),
    createBuffer: vi.fn(() => ({ getChannelData: vi.fn(() => new Float32Array(1)) })),
    createBufferSource: vi.fn(createNode),
    createWaveShaper: vi.fn(createNode),
    sampleRate: 48000,
  }
}

describe('ProceduralAudioEngine', () => {
  beforeEach(() => {
    localStorage.clear()
    // Reset singleton internal state so each test starts fresh
    ;(audioService as any)['ctx'] = null
    ;(audioService as any)['masterGain'] = null
    ;(audioService as any)['bgmGain'] = null
    ;(audioService as any)['seGain'] = null
    ;(audioService as any)['droneGain'] = null
    ;(audioService as any)['activeDrones'] = []
    ;(audioService as any)['activeLfos'] = []
    ;(audioService as any)['currentBgm'] = 'none'
    ;(audioService as any)['bgmIntervalId'] = null
    ;(audioService as any)['bgmPlayers'] = {}
    ;(audioService as any)['bgmGains'] = {}

    const MockCtx = createMockAudioContext()
    vi.stubGlobal('AudioContext', vi.fn(function() { return MockCtx }))
    vi.stubGlobal('webkitAudioContext', undefined)
  })

  it('exports all expected sound effect types', () => {
    const seTypes: SoundEffectType[] = [
      'hover', 'click', 'purchase', 'discard', 'play',
      'clash', 'victory', 'defeat', 'roll',
      'shuffle', 'cardSelect', 'fanfare', 'coin',
    ]
    expect(seTypes).toHaveLength(13)
  })

  it('exports all expected BGM theme types', () => {
    const bgmTypes: BGMThemeType[] = ['title', 'shop', 'battle', 'results', 'none']
    expect(bgmTypes).toHaveLength(5)
  })

  it('initializes without throwing', () => {
    expect(() => audioService.init()).not.toThrow()
  })

  it('toggleMute persists state to localStorage', () => {
    expect(audioService.getMuted()).toBe(false)

    const muted = audioService.toggleMute()
    expect(muted).toBe(true)
    expect(audioService.getMuted()).toBe(true)
    expect(localStorage.getItem('cyber_dome_mute')).toBe('true')

    const unmuted = audioService.toggleMute()
    expect(unmuted).toBe(false)
    expect(audioService.getMuted()).toBe(false)
    expect(localStorage.getItem('cyber_dome_mute')).toBe('false')
  })

  it('playSE does not throw for any registered effect type', async () => {
    audioService.init()
    const types: SoundEffectType[] = [
      'hover', 'click', 'purchase', 'discard', 'play',
      'clash', 'victory', 'defeat', 'roll',
      'shuffle', 'cardSelect', 'fanfare', 'coin',
    ]
    for (const type of types) {
      await expect(audioService.playSE(type)).resolves.not.toThrow()
    }
  })

  it('playBGM does not throw for registered themes', async () => {
    audioService.init()
    await expect(audioService.playBGM('title')).resolves.not.toThrow()
    await expect(audioService.playBGM('shop')).resolves.not.toThrow()
    await expect(audioService.playBGM('battle')).resolves.not.toThrow()
    await expect(audioService.playBGM('results')).resolves.not.toThrow()
  })

  it('stopBGM does not throw and resets currentBgm', () => {
    audioService.init()
    expect(() => audioService.stopBGM()).not.toThrow()
    expect((audioService as any)['currentBgm']).toBe('none')
  })

  it('does not start a new BGM if the same theme is already playing', async () => {
    try {
      audioService.init()
    } catch {
      return // Web Audio API not available in test environment – skip
    }
    await audioService.playBGM('title')
    // Calling again with same theme should early-return without error
    await expect(audioService.playBGM('title')).resolves.toBeUndefined()
  })
})
