export class ThemeToggle {
  private uiController: any; // Will be fully typed UIController
  private button: HTMLButtonElement | null = null;
  private currentTheme: 'light' | 'dark' = 'light';

  constructor(uiController: any) {
    this.uiController = uiController;
  }

  render(): HTMLButtonElement {
    this.button = document.createElement('button');
    this.button.id = 'theme-toggle';
    this.button.className = 'theme-toggle';
    this.button.addEventListener('click', () => this.handleToggle());

    return this.button;
  }

  updateIcon(theme: 'light' | 'dark'): void {
    this.currentTheme = theme;

    if (this.button) {
      if (theme === 'light') {
        this.button.textContent = '🌙';
        this.button.setAttribute('aria-label', 'Switch to dark mode');
        this.button.title = 'Switch to dark mode';
      } else {
        this.button.textContent = '☀️';
        this.button.setAttribute('aria-label', 'Switch to light mode');
        this.button.title = 'Switch to light mode';
      }
    }
  }

  private handleToggle(): void {
    const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.uiController.setTheme(newTheme);
  }
}
