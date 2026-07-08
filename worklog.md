---
Task ID: 1
Agent: Main Orchestrator
Task: Build Star Dominion — Space Strategy Game for Telegram Web App

Work Log:
- Created comprehensive game type system (`src/lib/game/types.ts`) with all game entities
- Built game constants (`src/lib/game/constants.ts`) with 10 module defs, 16 tech tree nodes, 9 ship types, 7 rooms, 16 shop items, 12 map nodes
- Implemented Zustand game store (`src/lib/game/store.ts`) with full game logic: resource economy, module building/upgrading, tech research, fleet management, combat simulation, mini-games, quests
- Designed neon space CSS theme with custom animations (star field, nebulae, holographic effects, particle bursts)
- Built animated Canvas star background with twinkling stars and nebula clouds
- Created resource bar with live rate display and station info
- Built navigation bar with 7 screens and animated tab indicator
- Built StationView with module cards, build menu (Sheet), room navigation
- Built RoomView with 7 unique room interiors (Bridge, Engineering, BioLab, Hangar, Bar, Server Room, Emergency Corridor) each with distinct visuals and interactive elements
- Built TechTreeView with 4-branch technology tree (Military, Engineering, Biological, Psycho-Energy)
- Built FleetView with ship management, squadron creation, combat system with animations
- Built MapView with interactive sector map, pan/zoom, node details
- Built MiniGames with sector scanner (radar) and asteroid defense games
- Built ShopView with premium shop categories
- Built QuestsView with daily quests and achievements
- Created main GamePage with faction selection, tutorial, screen routing
- Fixed all lint errors and icon import issues

Stage Summary:
- Complete playable prototype of Star Dominion space strategy game
- 11 React components, 3 game system files, 1 CSS theme file
- All text in Russian, neon space aesthetic
- Core gameplay loop: build modules → collect resources → research tech → build fleet → combat
- Persistent state via Zustand + localStorage
- HTTP 200 confirmed, ESLint clean (0 errors, 0 warnings)
- Browser verified: renders with 17 buttons, 95 divs, station view with resources and rooms