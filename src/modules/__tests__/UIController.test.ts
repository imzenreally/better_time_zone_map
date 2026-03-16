import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UIController } from '../UIController';

describe('UIController - Clock Ticker', () => {
  let canvas: HTMLCanvasElement;
  let tooltip: HTMLElement;
  let controller: UIController;

  beforeEach(() => {
    canvas = document.createElement('canvas');
    tooltip = document.createElement('div');
    controller = new UIController(canvas, tooltip);
  });

  afterEach(() => {
    controller.stopClockTicker();
  });

  it('should start clock ticker and store handle', () => {
    vi.useFakeTimers();

    controller.startClockTicker();

    expect(controller['state'].clockTickerHandle).not.toBeNull();

    vi.useRealTimers();
  });

  it('should stop clock ticker and clear handle', () => {
    vi.useFakeTimers();

    controller.startClockTicker();
    controller.stopClockTicker();

    expect(controller['state'].clockTickerHandle).toBeNull();

    vi.useRealTimers();
  });

  it('should call updateAllTimes every second', () => {
    vi.useFakeTimers();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateSpy = vi.spyOn(controller as any, 'updateAllTimes');

    controller.startClockTicker();

    vi.advanceTimersByTime(1000);
    expect(updateSpy).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(updateSpy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
