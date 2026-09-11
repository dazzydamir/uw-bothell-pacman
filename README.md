# UW Bothell Pacman (Husky Chase) 🐾

A custom retro-modern Pacman-style web game themed around the **University of Washington Bothell (UWB)** campus.

Help the UWB Husky navigate the campus maze, earn academic credits to graduate, grab coffee at the library cafe to temporarily snooze deadlines, and avoid academic pressures!

## 🎮 Features

- **Mascot & Animations**: Custom HTML5 Canvas-rendered Husky player character that rotates and chomps towards the direction of movement.
- **Academic Pressure Obstacles (Ghosts)**:
  - 🔴 **DUE!** (Deadline) - Direct chaser.
  - 🌸 **EXAM** (Exam) - Intercepts the Husky's trajectory.
  - 🔷 **BILL** (Tuition Bill) - Flanks from opposing angles.
  - 🟡 **HOLD** (Registration Hold) - Shy corner patrol that retreats when approached.
- **UWB Theme**: Official UW purple (`#4b2e83`) and metallic gold (`#85754d`) with soft beige undertones and glassmorphism styling.
- **GPA Standing System**: You start with a 4.00 GPA (3 lives equivalent). Getting caught drops your GPA by 1.00. Dropping to 0.00 puts you on Academic Suspension!
- **Starbucks Husky Card**: Power pellets in the corners let you snooze deadlines and earn bonus points.
- **Offline Audio**: Synthesized 8-bit retro sound effects and chiptune background music built with the Web Audio API.
- **Mobile Support**: Includes responsive on-screen Virtual D-Pad controls and touch swipe detection.

## 🕹️ Controls

- **Desktop**:
  - Arrow Keys or `W` `A` `S` `D` to navigate
  - `Escape` to Pause / Resume
- **Mobile**:
  - On-screen touch Virtual D-Pad (`▲`, `◀`, `▶`, `▼`)
  - Touch swipe gestures

## 🚀 How to Run Locally

Open `index.html` directly in any modern browser, or run a local static server:

```bash
# Python
python -m http.server 8000

# Node.js
npx serve
```

Then visit `http://localhost:8000` in your web browser.

---
*Go Huskies! Built with 💜 & 💛 for UW Bothell.*
