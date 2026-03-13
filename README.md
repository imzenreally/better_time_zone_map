# Better Time Zone Map

An interactive world map showing real-time information for all time zones.

## Features (Phase 1 - MVP)

- ✅ Interactive map with clickable time zones
- ✅ Real-time clock display for any zone
- ✅ Hover tooltips showing zone information
- ✅ UTC offset display
- ✅ DST status detection

## Tech Stack

- TypeScript
- Vite
- Canvas API
- Vitest for testing

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:3000 in your browser.

### Testing

```bash
npm test
```

### Build

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── main.ts              # Entry point
├── modules/
│   ├── TimeZoneEngine.ts   # Time calculations
│   ├── MapRenderer.ts      # Canvas rendering
│   ├── DataManager.ts      # Data loading
│   └── UIController.ts     # Coordination
├── types/               # TypeScript interfaces
├── data/                # Bundled JSON data
└── styles/              # CSS styles
```

## Development Roadmap

- [x] Phase 1: MVP Foundation
- [ ] Phase 2: Core Features (day/night overlay, pinned zones, search)
- [ ] Phase 3: Data Integration (CIA Factbook)
- [ ] Phase 4: Polish & Optimization

## License

TBD
