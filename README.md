# ☀ Sunny Meadow Run

A complete, fully playable 2D side-scrolling platformer game inspired by Super Mario Bros 1-1, built with **pure HTML5 Canvas + JavaScript** — no external libraries, no build tools, no npm.

---

## Gameplay Screenshot

```
┌──────────────────────────────────────────────────────────┐
│  Blue sky, white clouds, green hills (parallax)          │
│                                                          │
│     [?]  [B]  [?]  [B]  [?]        <triple [?][?][?]>  │
│                                                          │
│  ──────────────    ──────    ────────────────────────    │
│  (gap)          (moving     (gap)   Goombas  Goombas    │
│                  platform)                               │
│ ████ Mario ████                        ████████████████ │
│ ████████████████  GAP  ███████████████  GAP  ██ FLAG ██ │
└──────────────────────────────────────────────────────────┘
```

---

## How to Run

1. Open `index.html` in any modern browser (Chrome, Firefox, Edge, Safari).
2. **No server needed** — just double-click the file.
3. Press **Enter** on the start screen to begin.

---

## Controls

| Action | Keys |
|--------|------|
| Move left / right | ← → or A / D |
| Jump | Space, ↑, or W |
| Run faster | Hold Shift |
| Start / Restart | Enter |

> **Variable jump height**: tap for a short hop, hold for a higher jump.

---

## Game Features

- 🌍 **210-tile scrolling level** split into three sections
- 🍄 **Mushroom power-up** — collect it to grow; take a hit to shrink instead of dying
- ❓ **Question blocks** — hit from below to release coins or a mushroom
- 🧱 **Brick blocks** — break them when powered up
- 👾 **9 Goomba enemies** — stomp on them to defeat, avoid from the sides
- 🪙 **14+ floating coins** + block coins
- 🚩 **Checkpoint** at tile 60 — die and respawn here instead of the start
- 🏗️ **1 moving platform** to cross a pit
- 🕳️ **4 gaps** of increasing width (2 → 3 → 3 → 4 tiles)
- 🏁 **Descending staircase** + end flag with slide animation
- 🔊 **Procedural audio** via Web Audio API (jump, coin, stomp, power-up, death, level complete)
- 💯 **HUD**: score, coin count, lives, countdown timer
- 🎮 **3 lives** — game over when all are lost
- ⏱️ **300-second countdown timer**

---

## File Structure

```
/
├── index.html          Main HTML + canvas + global constants
├── css/
│   └── style.css       Page styling
├── js/
│   ├── game.js         Main game loop, state machine, collision
│   ├── player.js       Player physics and controls
│   ├── level.js        Level data (ground, blocks, enemies, coins…)
│   ├── enemies.js      Goomba AI
│   ├── blocks.js       Question blocks, bricks, coins, mushroom item
│   ├── camera.js       Scrolling camera
│   ├── renderer.js     All Canvas 2D drawing (no images needed)
│   ├── input.js        Keyboard input handler
│   ├── audio.js        Web Audio API sound effects
│   └── ui.js           HUD, start / game-over / victory screens
└── README.md
```

---

## Credits

Built entirely with vanilla HTML5 Canvas + JavaScript.  
Inspired by Nintendo's Super Mario Bros (1985).  
All graphics drawn programmatically — no external assets.