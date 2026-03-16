import type { TimeZone } from '../types/TimeZone';

export class SearchBar {
  private container: HTMLElement;
  private uiController: any; // Will be fully typed UIController
  private timeZones: TimeZone[];
  private input: HTMLInputElement | null = null;
  private dropdown: HTMLElement | null = null;
  private debounceTimer: number | null = null;
  private selectedIndex: number = -1;

  constructor(container: HTMLElement, uiController: any, timeZones: TimeZone[]) {
    this.container = container;
    this.uiController = uiController;
    this.timeZones = timeZones;
  }

  render(): void {
    this.container.className = 'search-bar';

    // Input wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'search-input-wrapper';

    // Search icon
    const icon = document.createElement('span');
    icon.className = 'search-icon';
    icon.textContent = '🔍';
    wrapper.appendChild(icon);

    // Input
    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'search-input';
    this.input.placeholder = 'Search time zones (city, country, or zone name)...';
    this.input.autocomplete = 'off';
    this.input.spellcheck = false;
    this.input.addEventListener('input', (e) =>
      this.handleInput((e.target as HTMLInputElement).value)
    );
    this.input.addEventListener('keydown', (e) => this.handleKeyDown(e));
    wrapper.appendChild(this.input);

    // Clear button
    const clearButton = document.createElement('button');
    clearButton.className = 'search-clear hidden';
    clearButton.textContent = '✕';
    clearButton.title = 'Clear search';
    clearButton.addEventListener('click', () => this.clearSearch());
    wrapper.appendChild(clearButton);

    this.container.appendChild(wrapper);

    // Dropdown
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'search-dropdown hidden';
    this.container.appendChild(this.dropdown);
  }

  private handleInput(query: string): void {
    // Show/hide clear button
    const clearButton = this.container.querySelector('.search-clear');
    if (clearButton) {
      if (query.trim()) {
        clearButton.classList.remove('hidden');
      } else {
        clearButton.classList.add('hidden');
      }
    }

    // Debounce search
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      const results = this.filterZones(query);
      this.renderResults(results);
    }, 300);
  }

  private filterZones(query: string): TimeZone[] {
    if (!query.trim()) {
      this.closeDropdown();
      return [];
    }

    const lowerQuery = query.toLowerCase();

    return this.timeZones
      .map((zone) => ({
        zone,
        score: this.calculateSearchScore(zone, lowerQuery),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map((item) => item.zone);
  }

  private calculateSearchScore(zone: TimeZone, query: string): number {
    let score = 0;

    const nameLower = zone.name.toLowerCase();

    // Exact name match
    if (nameLower === query) score += 100;
    // Name starts with query
    else if (nameLower.startsWith(query)) score += 50;
    // Name contains query
    else if (nameLower.includes(query)) score += 25;

    // City matches
    if (zone.majorCities.some((city) => city.toLowerCase() === query)) score += 80;
    else if (zone.majorCities.some((city) => city.toLowerCase().startsWith(query)))
      score += 40;
    else if (zone.majorCities.some((city) => city.toLowerCase().includes(query)))
      score += 20;

    // Country match
    if (zone.countries.some((country) => country.toLowerCase().includes(query)))
      score += 15;

    // Zone ID match
    if (zone.id.toLowerCase().includes(query)) score += 10;

    return score;
  }

  private renderResults(results: TimeZone[]): void {
    if (!this.dropdown) return;

    // Clear dropdown safely using textContent
    while (this.dropdown.firstChild) {
      this.dropdown.removeChild(this.dropdown.firstChild);
    }
    this.selectedIndex = -1;

    if (results.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'search-no-results';
      noResults.textContent = 'No results found';
      this.dropdown.appendChild(noResults);
      this.dropdown.classList.remove('hidden');
      return;
    }

    results.forEach((zone, index) => {
      const result = document.createElement('div');
      result.className = 'search-result';
      result.dataset.index = index.toString();

      const name = document.createElement('div');
      name.className = 'search-result-name';
      name.textContent = zone.name;
      result.appendChild(name);

      const meta = document.createElement('div');
      meta.className = 'search-result-meta';
      meta.textContent = `${zone.majorCities[0] || ''} • ${zone.id}`;
      result.appendChild(meta);

      result.addEventListener('click', () => this.selectZone(zone));
      result.addEventListener('mouseenter', () => {
        this.selectedIndex = index;
        this.updateHighlight();
      });

      if (this.dropdown) {
        this.dropdown.appendChild(result);
      }
    });

    if (this.dropdown) {
      this.dropdown.classList.remove('hidden');
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.dropdown || this.dropdown.classList.contains('hidden')) return;

    const results = this.dropdown.querySelectorAll('.search-result');
    if (results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, results.length - 1);
      this.updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.updateHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.selectedIndex >= 0) {
        const result = results[this.selectedIndex];
        const zoneName = result.querySelector('.search-result-name')?.textContent;
        const zone = this.timeZones.find((z) => z.name === zoneName);
        if (zone) {
          this.selectZone(zone);
        }
      }
    } else if (e.key === 'Escape') {
      this.closeDropdown();
    }
  }

  private updateHighlight(): void {
    if (!this.dropdown) return;

    const results = this.dropdown.querySelectorAll('.search-result');
    results.forEach((result, index) => {
      if (index === this.selectedIndex) {
        result.classList.add('search-result-highlighted');
      } else {
        result.classList.remove('search-result-highlighted');
      }
    });
  }

  private selectZone(zone: TimeZone): void {
    this.uiController.addPinnedZone(zone.id);
    this.clearSearch();
  }

  private clearSearch(): void {
    if (this.input) {
      this.input.value = '';
    }
    this.closeDropdown();

    const clearButton = this.container.querySelector('.search-clear');
    if (clearButton) {
      clearButton.classList.add('hidden');
    }
  }

  private closeDropdown(): void {
    if (this.dropdown) {
      this.dropdown.classList.add('hidden');
    }
  }
}
