import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeToggle } from '../ThemeToggle';

describe('ThemeToggle', () => {
  let toggle: ThemeToggle;
  let mockUIController: any;

  beforeEach(() => {
    mockUIController = {
      setTheme: vi.fn(),
    };
    toggle = new ThemeToggle(mockUIController);
  });

  it('should render toggle button', () => {
    const button = toggle.render();
    expect(button).toBeInstanceOf(HTMLButtonElement);
    expect(button.className).toBe('theme-toggle');
  });

  it('should show moon icon for light theme', () => {
    const button = toggle.render();
    toggle.updateIcon('light');
    expect(button.textContent).toBe('🌙');
    expect(button.title).toContain('dark');
  });

  it('should show sun icon for dark theme', () => {
    const button = toggle.render();
    toggle.updateIcon('dark');
    expect(button.textContent).toBe('☀️');
    expect(button.title).toContain('light');
  });

  it('should toggle between themes', () => {
    const button = toggle.render();

    toggle.updateIcon('light');
    button.click();
    expect(mockUIController.setTheme).toHaveBeenCalledWith('dark');

    toggle.updateIcon('dark');
    button.click();
    expect(mockUIController.setTheme).toHaveBeenCalledWith('light');
  });
});
