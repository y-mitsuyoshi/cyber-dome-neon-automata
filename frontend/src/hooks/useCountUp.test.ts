import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from './useCountUp';

// ── Mocks ───────────────────────────────────────────────────────────

// Mock requestAnimationFrame to execute callbacks synchronously
let frameId = 0;
const rafCallbacks = new Map<number, FrameRequestCallback>();

beforeEach(() => {
  frameId = 0;
  rafCallbacks.clear();
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id = ++frameId;
    rafCallbacks.set(id, cb);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => {
    rafCallbacks.delete(id);
  });
  vi.stubGlobal('performance', { now: () => Date.now() });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ───────────────────────────────────────────────────────────

describe('useCountUp', () => {
  // (a) REQ-RS-05: rAF モックで最終値に到達
  it('reaches target value through rAF animation', () => {
    const { result } = renderHook(() => useCountUp(100, 500));

    // Initially 0
    expect(result.current).toBe(0);

    // Simulate rAF frames
    act(() => {
      // Trigger all pending rAF callbacks
      const callbacks = [...rafCallbacks.values()];
      rafCallbacks.clear();
      for (const cb of callbacks) {
        cb(Date.now() + 600); // 600ms > 500ms duration
      }
    });

    // After full duration, should reach target
    expect(result.current).toBe(100);
  });

  // (b) REQ-RS-05: matchMedia reduce 時は即時最終値
  it('returns target immediately when prefers-reduced-motion is reduce', () => {
    // Mock matchMedia to return reduce
    vi.stubGlobal('window', {
      matchMedia: (query: string) => ({
        matches: query.includes('reduce') ? true : false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    const { result } = renderHook(() => useCountUp(50, 1000));

    // Should immediately be the target value
    expect(result.current).toBe(50);
  });
});
