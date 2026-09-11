// game.js - UWB Husky Chase (Pacman-style Game)

// ----------------------------------------------------
// 1. Audio System (Web Audio API)
// ----------------------------------------------------
let audioCtx = null;
let bgMusicInterval = null;
let bgMusicStep = 0;
const bgMusicNotes = [
  130.81, 196.00, 220.00, 196.00, // C3, G3, A3, G3
  146.83, 220.00, 246.94, 220.00, // D3, A3, B3, A3
  164.81, 246.94, 261.63, 246.94, // E3, B3, C4, B3
  130.81, 196.00, 220.00, 196.00  // C3, G3, A3, G3
];

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

function playSound(type) {
  if (!audioCtx || !document.getElementById('audio-toggle').checked) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;
  
  if (type === 'munch') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(450, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.07);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.07);
    osc.start(now);
    osc.stop(now + 0.07);
  } else if (type === 'powerup') {
    osc.type = 'sine';
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, index) => {
      osc.frequency.setValueAtTime(freq, now + index * 0.06);
    });
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'death') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(280, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.9);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.9);
    osc.start(now);
    osc.stop(now + 0.9);
  } else if (type === 'eat_ghost') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.setValueAtTime(1318.51, now + 0.08);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
    osc.start(now);
    osc.stop(now + 0.25);
  } else if (type === 'win') {
    osc.type = 'triangle';
    const winNotes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1318.51];
    winNotes.forEach((freq, index) => {
      osc.frequency.setValueAtTime(freq, now + index * 0.09);
    });
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.linearRampToValueAtTime(0.01, now + 0.8);
    osc.start(now);
    osc.stop(now + 0.8);
  }
}

function startBgMusic() {
  if (bgMusicInterval) clearInterval(bgMusicInterval);
  if (!document.getElementById('audio-toggle').checked) return;
  
  const playNote = () => {
    if (!audioCtx || audioCtx.state === 'suspended') return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const activePower = game.powerPelletTime > 0;
    const speedMultiplier = activePower ? 1.5 : 1.0;
    
    osc.type = 'triangle';
    const baseNote = bgMusicNotes[bgMusicStep % bgMusicNotes.length];
    osc.frequency.setValueAtTime(baseNote * speedMultiplier, now);
    
    gain.gain.setValueAtTime(activePower ? 0.04 : 0.02, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
    
    osc.start(now);
    osc.stop(now + 0.22);
    
    bgMusicStep++;
  };

  // Dynamically set background tempo
  let currentTempo = game.powerPelletTime > 0 ? 180 : 300;
  
  bgMusicInterval = setInterval(() => {
    // If power pellet is active, check if tempo should be faster
    const activePower = game.powerPelletTime > 0;
    const targetTempo = activePower ? 180 : 300;
    if (currentTempo !== targetTempo) {
      // Re-trigger with new speed
      stopBgMusic();
      startBgMusic();
      return;
    }
    playNote();
  }, currentTempo);
}

function stopBgMusic() {
  if (bgMusicInterval) {
    clearInterval(bgMusicInterval);
    bgMusicInterval = null;
  }
}

// ----------------------------------------------------
// 2. Constants & Map Layout
// ----------------------------------------------------
const TILE_SIZE = 20;
const COLS = 19;
const ROWS = 22;

// Original map grid representation
// 1 = Wall, 2 = Credit (Dot), 3 = Husky Card (Power Pellet), 4 = Gate, 5 = House Inside, 0 = Empty/Path
const INITIAL_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,3,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,3,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,0,1,0,1,1,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
  [1,1,1,1,2,1,0,1,1,4,1,1,0,1,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,5,5,5,1,0,0,2,0,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
  [0,0,0,1,2,1,0,0,0,0,0,0,0,1,2,1,0,0,0],
  [1,1,1,1,2,1,0,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,0,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,1,2,2,2,1,2,2,2,2,1],
  [1,2,1,1,1,1,1,1,2,1,2,1,1,1,1,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

// Directions Map
const DIR = {
  NONE:  { dx: 0,  dy: 0,  angle: 0 },
  UP:    { dx: 0,  dy: -1, angle: -Math.PI / 2 },
  DOWN:  { dx: 0,  dy: 1,  angle: Math.PI / 2 },
  LEFT:  { dx: -1, dy: 0,  angle: Math.PI },
  RIGHT: { dx: 1,  dy: 0,  angle: 0 }
};

// ----------------------------------------------------
// 3. Game Object Definitions
// ----------------------------------------------------
class Husky {
  constructor(gridX, gridY) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.tileProgress = 0; // 0 to TILE_SIZE progress moving to next tile
    this.direction = DIR.NONE;
    this.nextDirection = DIR.NONE;
    this.speed = 2; // pixel speed per frame
    this.radius = 9;
  }

  reset(gridX, gridY) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.tileProgress = 0;
    this.direction = DIR.NONE;
    this.nextDirection = DIR.NONE;
  }

  update() {
    // If aligned with grid cell, determine if we can switch direction
    if (this.tileProgress === 0) {
      // Check if we can proceed in queued next direction
      if (this.canMove(this.nextDirection)) {
        this.direction = this.nextDirection;
      }
      
      // Stop moving if blocked in current direction
      if (!this.canMove(this.direction)) {
        this.direction = DIR.NONE;
      }
    }

    if (this.direction !== DIR.NONE) {
      this.tileProgress += this.speed;
      
      if (this.tileProgress >= TILE_SIZE) {
        this.gridX += this.direction.dx;
        this.gridY += this.direction.dy;
        this.tileProgress = 0;
        
        // Handle side wrapping tunnels
        if (this.gridX < 0) this.gridX = COLS - 1;
        if (this.gridX >= COLS) this.gridX = 0;
      }
    }
  }

  canMove(dir) {
    if (dir === DIR.NONE) return true;
    const targetX = this.gridX + dir.dx;
    const targetY = this.gridY + dir.dy;
    
    // Support tunnel wrapping
    let wrappedX = targetX;
    if (wrappedX < 0) wrappedX = COLS - 1;
    if (wrappedX >= COLS) wrappedX = 0;
    
    if (targetY < 0 || targetY >= ROWS) return false;
    
    const tile = game.map[targetY][wrappedX];
    return tile !== 1 && tile !== 4; // Husky cannot walk through walls or gate
  }

  getPixelCoords() {
    let px = this.gridX * TILE_SIZE + TILE_SIZE / 2;
    let py = this.gridY * TILE_SIZE + TILE_SIZE / 2;
    
    if (this.direction !== DIR.NONE) {
      px += this.direction.dx * this.tileProgress;
      py += this.direction.dy * this.tileProgress;
    }
    return { x: px, y: py };
  }

  draw(ctx) {
    const coords = this.getPixelCoords();
    const mouthOpenProgress = this.direction !== DIR.NONE ? (Math.sin(Date.now() / 90) + 1) / 2 : 0;
    
    ctx.save();
    ctx.translate(coords.x, coords.y);
    ctx.rotate(this.direction.angle);
    
    const primaryPurple = '#4b2e83';
    const primaryGold = '#85754d';
    const faceWhite = '#f5f3ef';
    const snoutColor = '#85754d';
    const rad = this.radius;
    
    // 1. Draw Ears
    // Left ear
    ctx.fillStyle = primaryPurple;
    ctx.strokeStyle = primaryGold;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-rad * 0.9, -rad * 0.4);
    ctx.lineTo(-rad * 1.1, -rad * 1.3);
    ctx.lineTo(-rad * 0.3, -rad * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = faceWhite;
    ctx.beginPath();
    ctx.moveTo(-rad * 0.8, -rad * 0.5);
    ctx.lineTo(-rad * 0.95, -rad * 1.1);
    ctx.lineTo(-rad * 0.4, -rad * 0.8);
    ctx.closePath();
    ctx.fill();
    
    // Right ear
    ctx.fillStyle = primaryPurple;
    ctx.beginPath();
    ctx.moveTo(rad * 0.9, -rad * 0.4);
    ctx.lineTo(rad * 1.1, -rad * 1.3);
    ctx.lineTo(rad * 0.3, -rad * 0.9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = faceWhite;
    ctx.beginPath();
    ctx.moveTo(rad * 0.8, -rad * 0.5);
    ctx.lineTo(rad * 0.95, -rad * 1.1);
    ctx.lineTo(rad * 0.4, -rad * 0.8);
    ctx.closePath();
    ctx.fill();
    
    // 2. Head base
    ctx.fillStyle = primaryPurple;
    ctx.beginPath();
    ctx.arc(0, 0, rad, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    
    // 3. White Face Fur Pattern
    ctx.fillStyle = faceWhite;
    ctx.beginPath();
    ctx.arc(-rad * 0.38, rad * 0.2, rad * 0.5, 0, Math.PI * 2);
    ctx.arc(rad * 0.38, rad * 0.2, rad * 0.5, 0, Math.PI * 2);
    ctx.arc(0, rad * 0.3, rad * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // Eye bridge white line
    ctx.beginPath();
    ctx.moveTo(-rad * 0.2, 0);
    ctx.lineTo(rad * 0.2, 0);
    ctx.lineTo(0, -rad * 0.65);
    ctx.closePath();
    ctx.fill();

    // 4. Eyes
    ctx.fillStyle = '#120a22';
    // Left eye
    ctx.beginPath();
    ctx.arc(-rad * 0.4, -rad * 0.05, rad * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-rad * 0.45, -rad * 0.1, rad * 0.06, 0, Math.PI * 2);
    ctx.fill();
    
    // Right eye
    ctx.fillStyle = '#120a22';
    ctx.beginPath();
    ctx.arc(rad * 0.4, -rad * 0.05, rad * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(rad * 0.35, -rad * 0.1, rad * 0.06, 0, Math.PI * 2);
    ctx.fill();
    
    // 5. Snout
    ctx.fillStyle = snoutColor;
    ctx.beginPath();
    ctx.arc(0, rad * 0.28, rad * 0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#120a22';
    ctx.beginPath();
    ctx.moveTo(-rad * 0.12, rad * 0.2);
    ctx.lineTo(rad * 0.12, rad * 0.2);
    ctx.lineTo(0, rad * 0.3);
    ctx.closePath();
    ctx.fill();
    
    // 6. Mouth / Tongue
    if (mouthOpenProgress > 0.1) {
      ctx.fillStyle = '#120a22';
      ctx.beginPath();
      ctx.arc(0, rad * 0.48, rad * 0.22 * mouthOpenProgress, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.arc(0, rad * 0.48 + rad * 0.05, rad * 0.14 * mouthOpenProgress, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.strokeStyle = '#120a22';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(-rad * 0.1, rad * 0.35, rad * 0.1, 0, Math.PI);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(rad * 0.1, rad * 0.35, rad * 0.1, 0, Math.PI);
      ctx.stroke();
    }
    
    ctx.restore();
  }
}

class Ghost {
  constructor(gridX, gridY, color, label, homeX, homeY) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.homeX = homeX;
    this.homeY = homeY;
    this.tileProgress = 0;
    this.direction = DIR.NONE;
    this.color = color;
    this.label = label;
    this.speed = 1.5; // Slightly slower default speed than Husky
    this.radius = 9;
    this.inHouse = true;
    this.exitTimer = 0;
  }

  reset(gridX, gridY, inHouse = true) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.tileProgress = 0;
    this.direction = DIR.NONE;
    this.inHouse = inHouse;
    this.exitTimer = 0;
  }

  update(player) {
    // Frightened speed adjustment
    const isFrightened = game.powerPelletTime > 0;
    const currentSpeed = isFrightened ? 1.0 : this.speed;

    if (this.inHouse) {
      this.handleHouseExit();
      return;
    }

    if (this.tileProgress === 0) {
      // Find valid next paths (cannot turn directly back unless trapped)
      const validDirections = [];
      const oppositeDir = this.getOppositeDir(this.direction);
      
      for (const key in DIR) {
        if (key === 'NONE') continue;
        const dir = DIR[key];
        
        // Cannot turn back
        if (dir === oppositeDir) continue;
        
        if (this.canMove(dir)) {
          validDirections.push(dir);
        }
      }
      
      if (validDirections.length === 0) {
        // Fallback: allow moving back if absolutely no choice
        if (this.canMove(oppositeDir)) {
          validDirections.push(oppositeDir);
        }
      }

      if (validDirections.length > 0) {
        if (isFrightened) {
          // Random walk in frightened mode
          this.direction = validDirections[Math.floor(Math.random() * validDirections.length)];
        } else {
          // Route towards targeted cell based on type
          const target = this.getTargetTile(player);
          let bestDir = validDirections[0];
          let minDistance = Infinity;

          for (const dir of validDirections) {
            const nextX = this.gridX + dir.dx;
            const nextY = this.gridY + dir.dy;
            const dist = Math.hypot(nextX - target.x, nextY - target.y);
            if (dist < minDistance) {
              minDistance = dist;
              bestDir = dir;
            }
          }
          this.direction = bestDir;
        }
      } else {
        this.direction = DIR.NONE;
      }
    }

    // Move forward
    if (this.direction !== DIR.NONE) {
      this.tileProgress += currentSpeed;
      if (this.tileProgress >= TILE_SIZE) {
        this.gridX += this.direction.dx;
        this.gridY += this.direction.dy;
        this.tileProgress = 0;
        
        // Side wrapping
        if (this.gridX < 0) this.gridX = COLS - 1;
        if (this.gridX >= COLS) this.gridX = 0;
      }
    }
  }

  handleHouseExit() {
    // Gradually move up to exit the house at index (9, 8)
    const targetX = 9;
    const targetY = 8;
    
    // Vertical centering
    if (this.gridX !== targetX) {
      this.gridX = targetX;
      this.tileProgress = 0;
    }
    
    // Float upward through gate (cell 4)
    if (this.gridY > targetY) {
      this.tileProgress += 1.0;
      if (this.tileProgress >= TILE_SIZE) {
        this.gridY--;
        this.tileProgress = 0;
      }
    } else {
      this.inHouse = false;
      this.direction = DIR.LEFT; // default exit direction
    }
  }

  canMove(dir) {
    if (dir === DIR.NONE) return false;
    const targetX = this.gridX + dir.dx;
    const targetY = this.gridY + dir.dy;
    
    let wrappedX = targetX;
    if (wrappedX < 0) wrappedX = COLS - 1;
    if (wrappedX >= COLS) wrappedX = 0;
    
    if (targetY < 0 || targetY >= ROWS) return false;
    
    const tile = game.map[targetY][wrappedX];
    
    // Gate is cell value 4. Ghosts can pass gate when exiting house or chasing
    if (tile === 4) return true; 
    
    return tile !== 1;
  }

  getOppositeDir(dir) {
    if (dir === DIR.UP) return DIR.DOWN;
    if (dir === DIR.DOWN) return DIR.UP;
    if (dir === DIR.LEFT) return DIR.RIGHT;
    if (dir === DIR.RIGHT) return DIR.LEFT;
    return DIR.NONE;
  }

  getTargetTile(player) {
    // Unique targeting logic for each ghost type (simulating retro arcade AI)
    switch(this.label) {
      case 'DUE!': // Deadline (Red) - Direct chaser
        return { x: player.gridX, y: player.gridY };
      
      case 'EXAM': // Exam (Pink) - Interceptor (2 cells ahead of Husky)
        return {
          x: player.gridX + player.direction.dx * 2,
          y: player.gridY + player.direction.dy * 2
        };
      
      case 'BILL': // Tuition Bill (Cyan) - Sandwiches Husky between Red ghost and player
        const rx = game.ghosts[0].gridX;
        const ry = game.ghosts[0].gridY;
        const tx = player.gridX + player.direction.dx * 2;
        const ty = player.gridY + player.direction.dy * 2;
        return {
          x: tx + (tx - rx),
          y: ty + (ty - ry)
        };
      
      case 'HOLD': // Registration Hold (Orange) - Cowardly/Shy patrol
      default:
        const dist = Math.hypot(this.gridX - player.gridX, this.gridY - player.gridY);
        if (dist > 6) {
          return { x: player.gridX, y: player.gridY };
        } else {
          // Retreat to their specific starting home corner
          return { x: this.homeX, y: this.homeY };
        }
    }
  }

  getPixelCoords() {
    let px = this.gridX * TILE_SIZE + TILE_SIZE / 2;
    let py = this.gridY * TILE_SIZE + TILE_SIZE / 2;
    
    if (this.direction !== DIR.NONE && !this.inHouse) {
      px += this.direction.dx * this.tileProgress;
      py += this.direction.dy * this.tileProgress;
    } else if (this.inHouse && this.gridY > 8) {
      // Animate floating up inside house
      py -= this.tileProgress;
    }
    return { x: px, y: py };
  }

  draw(ctx) {
    const coords = this.getPixelCoords();
    const isFrightened = game.powerPelletTime > 0;
    
    ctx.save();
    ctx.translate(coords.x, coords.y);
    
    const ghostColor = isFrightened ? '#2980b9' : this.color;
    const eyeColor = isFrightened ? '#ffeaa7' : '#ffffff';
    const pupilColor = isFrightened ? '#e74c3c' : '#11092b';
    const rad = this.radius;
    
    // 1. Ghost Body
    ctx.fillStyle = ghostColor;
    ctx.beginPath();
    ctx.arc(0, -rad * 0.1, rad, Math.PI, 0, false);
    ctx.lineTo(rad, rad * 0.85);
    
    // Animated waves
    const waves = 3;
    const waveWidth = (rad * 2) / waves;
    const timeOffset = (Date.now() / 150) % (Math.PI * 2);
    
    for (let i = 0; i < waves; i++) {
      const startX = rad - i * waveWidth;
      const endX = rad - (i + 1) * waveWidth;
      const midX = (startX + endX) / 2;
      const waveY = rad * 0.85 + Math.sin(timeOffset + i * 2) * 2;
      ctx.quadraticCurveTo(midX, waveY + rad * 0.2, endX, rad * 0.85);
    }
    
    ctx.closePath();
    ctx.fill();
    
    // 2. Eyes
    ctx.fillStyle = eyeColor;
    // Left eye white
    ctx.beginPath();
    ctx.arc(-rad * 0.35, -rad * 0.1, rad * 0.25, 0, Math.PI * 2);
    ctx.fill();
    // Right eye white
    ctx.beginPath();
    ctx.arc(rad * 0.35, -rad * 0.1, rad * 0.25, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupils
    ctx.fillStyle = pupilColor;
    let px = 0;
    let py = 0;
    if (isFrightened) {
      px = Math.sin(Date.now() / 200) * 1.2;
    } else if (this.direction !== DIR.NONE) {
      px = this.direction.dx * 1.5;
      py = this.direction.dy * 1.5;
    }
    
    ctx.beginPath();
    ctx.arc(-rad * 0.35 + px, -rad * 0.1 + py, rad * 0.1, 0, Math.PI * 2);
    ctx.arc(rad * 0.35 + px, -rad * 0.1 + py, rad * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // 3. Mouth
    if (isFrightened) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = -5; i <= 5; i++) {
        const mx = i * 1.5;
        const my = rad * 0.45 + Math.sin(Date.now() / 90 + i) * 1.5;
        if (i === -5) ctx.moveTo(mx, my);
        else ctx.lineTo(mx, my);
      }
      ctx.stroke();
    } else {
      ctx.fillStyle = '#120a22';
      ctx.beginPath();
      ctx.arc(0, rad * 0.32, rad * 0.14, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
    
    // 4. Floating Academic Pressure Label Box
    ctx.save();
    ctx.translate(coords.x, coords.y - rad * 1.6);
    const floatOffset = Math.sin(Date.now() / 180 + this.homeX) * 2.5;
    ctx.translate(0, floatOffset);
    
    ctx.font = '900 8px "Orbitron", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const text = isFrightened ? 'SNOOZED' : this.label;
    const textWidth = ctx.measureText(text).width;
    
    // Label border outline
    const lw = textWidth + 8;
    const lh = 12;
    ctx.fillStyle = isFrightened ? 'rgba(41, 128, 185, 0.9)' : 'rgba(26, 16, 51, 0.95)';
    ctx.strokeStyle = isFrightened ? '#ffffff' : this.color;
    ctx.lineWidth = 1.2;
    
    ctx.beginPath();
    ctx.roundRect(-lw / 2, -lh / 2, lw, lh, 3);
    ctx.fill();
    ctx.stroke();
    
    ctx.fillStyle = isFrightened ? '#ffffff' : '#f5f4f8';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }
}

// ----------------------------------------------------
// 4. Main Game Engine & Controller
// ----------------------------------------------------
const game = {
  canvas: null,
  ctx: null,
  map: [],
  husky: null,
  ghosts: [],
  score: 0,
  totalCredits: 0,
  highScore: 0,
  lives: 3,
  gpa: 4.0,
  level: 1,
  state: 'START', // START, PLAYING, PAUSED, GAMEOVER, WIN
  powerPelletTime: 0, // remaining frames of coffee power-up
  maxPowerTime: 400,  // ~6.6 seconds at 60fps
  
  // Swipe controls helper
  touchStart: { x: 0, y: 0 },
  
  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    
    this.husky = new Husky(9, 16);
    
    // Create the four academic pressure ghosts:
    // Red = Deadline, Pink = Exam, Cyan = Tuition, Orange = Registration Hold
    this.ghosts = [
      new Ghost(9, 8, '#e74c3c', 'DUE!', 1, 1),      // Red
      new Ghost(9, 10, '#fd79a8', 'EXAM', 17, 1),    // Pink
      new Ghost(8, 10, '#00cec9', 'BILL', 1, 20),    // Cyan
      new Ghost(10, 10, '#e1b12c', 'HOLD', 17, 20)   // Orange
    ];
    
    this.loadHighScore();
    this.setupEventListeners();
    this.resetQuarter(true); // reset map and points
    this.renderLoop();
  },

  resetQuarter(fullReset = false) {
    // Clone map grid from templates
    this.map = INITIAL_MAP.map(row => [...row]);
    
    if (fullReset) {
      this.score = 0;
      this.lives = 3;
      this.gpa = 4.0;
      this.level = 1;
      
      // Count total credits dynamically
      this.totalCredits = 0;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (this.map[r][c] === 2 || this.map[r][c] === 3) {
            this.totalCredits++;
          }
        }
      }
    }
    
    // Reset positions
    this.husky.reset(9, 16);
    this.ghosts[0].reset(9, 8, false); // Red starts outside
    this.ghosts[1].reset(9, 10, true);
    this.ghosts[2].reset(8, 10, true);
    this.ghosts[3].reset(10, 10, true);
    
    this.powerPelletTime = 0;
    
    // Apply difficulty/level speed adjustments
    this.applyDifficultySpeed();
    this.updateStatsUI();
  },

  applyDifficultySpeed() {
    const diff = document.getElementById('difficulty-select').value;
    let baseGhostSpeed = 1.4;
    let baseHuskySpeed = 2;
    
    if (diff === 'easy') {
      baseGhostSpeed = 1.1;
      baseHuskySpeed = 2;
    } else if (diff === 'hard') {
      baseGhostSpeed = 1.7;
      baseHuskySpeed = 2;
    }
    
    // Scale speed slightly with level
    const speedBoost = Math.min((this.level - 1) * 0.15, 0.6);
    this.husky.speed = baseHuskySpeed;
    this.ghosts.forEach(g => {
      g.speed = baseGhostSpeed + speedBoost;
    });
  },

  updateStatsUI() {
    // Updates values on HTML UI
    document.getElementById('score').innerText = `${this.score} / ${this.totalCredits}`;
    document.getElementById('highscore').innerText = this.highScore;
    
    // Class rank
    let rank = 'Freshman';
    if (this.score >= this.totalCredits * 0.75 || this.level > 3) rank = 'Senior';
    else if (this.score >= this.totalCredits * 0.5 || this.level > 2) rank = 'Junior';
    else if (this.score >= this.totalCredits * 0.25 || this.level > 1) rank = 'Sophomore';
    document.getElementById('status-label').innerText = rank;
    
    // GPA Math and display
    document.getElementById('gpa-value').innerText = this.gpa.toFixed(2);
    const gpaPercent = (this.gpa / 4.0) * 100;
    const gpaBar = document.getElementById('gpa-bar');
    gpaBar.style.width = `${gpaPercent}%`;
    
    // Color code the GPA bar
    if (this.gpa >= 3.0) {
      gpaBar.style.background = 'var(--success-green)';
      document.getElementById('gpa-value').style.color = 'var(--success-green)';
    } else if (this.gpa >= 2.0) {
      gpaBar.style.background = 'var(--uw-gold-bright)';
      document.getElementById('gpa-value').style.color = 'var(--uw-gold-bright)';
    } else {
      gpaBar.style.background = 'var(--danger-red)';
      document.getElementById('gpa-value').style.color = 'var(--danger-red)';
    }
    
    // Standing (Husky cap icons representing lives)
    const livesDiv = document.getElementById('lives-container');
    livesDiv.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const active = i < this.lives;
      livesDiv.innerHTML += `
        <svg class="life-icon" style="opacity: ${active ? 1.0 : 0.2}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <polygon points="12,2 22,7 12,12 2,7" />
          <path d="M6,10 L6,16 C6,19 18,19 18,16 L18,10" />
        </svg>
      `;
    }
  },

  loadHighScore() {
    const saved = localStorage.getItem('uwb_husky_highscore');
    if (saved) {
      this.highScore = parseInt(saved, 10);
    }
  },

  saveHighScore() {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('uwb_husky_highscore', this.highScore);
    }
  },

  setupEventListeners() {
    // Keyboard controller
    window.addEventListener('keydown', (e) => {
      if (this.state !== 'PLAYING') return;
      
      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          this.husky.nextDirection = DIR.UP;
          e.preventDefault();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          this.husky.nextDirection = DIR.DOWN;
          e.preventDefault();
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.husky.nextDirection = DIR.LEFT;
          e.preventDefault();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.husky.nextDirection = DIR.RIGHT;
          e.preventDefault();
          break;
        case 'Escape':
          this.togglePause();
          break;
      }
    });

    // Mobile touch controls (Swipe recognition)
    this.canvas.addEventListener('touchstart', (e) => {
      this.touchStart.x = e.touches[0].clientX;
      this.touchStart.y = e.touches[0].clientY;
    }, { passive: true });

    this.canvas.addEventListener('touchend', (e) => {
      if (this.state !== 'PLAYING') return;
      const dx = e.changedTouches[0].clientX - this.touchStart.x;
      const dy = e.changedTouches[0].clientY - this.touchStart.y;
      
      // Determine dominant direction axis
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 30) this.husky.nextDirection = DIR.RIGHT;
        else if (dx < -30) this.husky.nextDirection = DIR.LEFT;
      } else {
        if (dy > 30) this.husky.nextDirection = DIR.DOWN;
        else if (dy < -30) this.husky.nextDirection = DIR.UP;
      }
    }, { passive: true });

    // Mobile D-pad Button events
    const dpadButtons = [
      { id: 'dpad-up', dir: DIR.UP },
      { id: 'dpad-down', dir: DIR.DOWN },
      { id: 'dpad-left', dir: DIR.LEFT },
      { id: 'dpad-right', dir: DIR.RIGHT }
    ];
    
    dpadButtons.forEach(btn => {
      const el = document.getElementById(btn.id);
      if (el) {
        const triggerDir = (e) => {
          if (this.state === 'PLAYING') {
            this.husky.nextDirection = btn.dir;
            e.preventDefault();
          }
        };
        // Listen to touchstart for fast responsiveness, mousedown for testing/fallback
        el.addEventListener('touchstart', triggerDir, { passive: false });
        el.addEventListener('mousedown', triggerDir);
      }
    });

    // Buttons & Dropdowns
    document.getElementById('start-btn').addEventListener('click', () => {
      initAudio();
      if (this.state === 'START' || this.state === 'GAMEOVER' || this.state === 'WIN') {
        this.resetQuarter(true);
        this.state = 'PLAYING';
        this.hideOverlay();
        startBgMusic();
      } else if (this.state === 'PAUSED') {
        this.state = 'PLAYING';
        this.hideOverlay();
        startBgMusic();
      }
    });

    document.getElementById('difficulty-select').addEventListener('change', () => {
      this.applyDifficultySpeed();
    });

    document.getElementById('audio-toggle').addEventListener('change', (e) => {
      if (e.target.checked) {
        initAudio();
        if (this.state === 'PLAYING') startBgMusic();
      } else {
        stopBgMusic();
      }
    });
  },

  togglePause() {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
      stopBgMusic();
      this.showOverlay('PAUSED', 'Take a coffee break! Click below to resume surviving the quarter.');
      document.getElementById('start-btn').innerText = 'Resume';
    } else if (this.state === 'PAUSED') {
      this.state = 'PLAYING';
      this.hideOverlay();
      startBgMusic();
    }
  },

  showOverlay(title, text) {
    const o = document.getElementById('overlay');
    document.getElementById('overlay-title').innerText = title;
    document.getElementById('overlay-text').innerText = text;
    o.classList.remove('hidden');
  },

  hideOverlay() {
    document.getElementById('overlay').classList.add('hidden');
  },

  // ----------------------------------------------------
  // 5. Game Logic Updates
  // ----------------------------------------------------
  update() {
    if (this.state !== 'PLAYING') return;

    this.husky.update();
    
    // Check collisions with credits (dots) & power pellets
    this.checkGridCollisions();

    // Update ghosts
    this.ghosts.forEach(g => g.update(this.husky));

    // Check collision between Husky and Ghosts
    this.checkGhostCollisions();

    // Starbucks Power pellet timer countdown
    if (this.powerPelletTime > 0) {
      this.powerPelletTime--;
      const percent = (this.powerPelletTime / this.maxPowerTime) * 100;
      document.getElementById('power-bar').style.width = `${percent}%`;
      document.getElementById('power-timer').innerText = `${Math.ceil(this.powerPelletTime / 60)}s`;
      
      if (this.powerPelletTime === 0) {
        document.getElementById('power-timer').innerText = 'Inactive';
        document.getElementById('power-bar').style.width = '0%';
      }
    }
  },

  checkGridCollisions() {
    const hx = this.husky.gridX;
    const hy = this.husky.gridY;
    
    // Only trigger exactly when Husky reaches a grid center
    if (this.husky.tileProgress === 0) {
      const tile = this.map[hy][hx];
      
      if (tile === 2) {
        // Collect credit
        this.map[hy][hx] = 0;
        this.score++;
        this.saveHighScore();
        this.updateStatsUI();
        playSound('munch');
        
        // Win Condition (Graduation!)
        if (this.score === this.totalCredits) {
          this.handleWin();
        }
      } else if (tile === 3) {
        // Collect Starbucks Power pellet (Husky Card)
        this.map[hy][hx] = 0;
        this.score++;
        this.powerPelletTime = this.maxPowerTime;
        this.saveHighScore();
        this.updateStatsUI();
        playSound('powerup');
        
        // Flash visual alert
        this.flashUIEffect();
      }
    }
  },

  flashUIEffect() {
    // Flash background gold briefly when power pellet is eaten
    document.body.style.backgroundImage = 'radial-gradient(at 0% 0%, var(--uw-gold-glow) 0px, transparent 50%)';
    setTimeout(() => {
      document.body.style.backgroundImage = `
        radial-gradient(at 0% 0%, rgba(75, 46, 131, 0.2) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(133, 117, 77, 0.15) 0px, transparent 50%)`;
    }, 400);
  },

  checkGhostCollisions() {
    const hc = this.husky.getPixelCoords();
    
    this.ghosts.forEach(g => {
      const gc = g.getPixelCoords();
      const dist = Math.hypot(hc.x - gc.x, hc.y - gc.y);
      
      // Collision threshold (pixels)
      if (dist < 14) {
        if (this.powerPelletTime > 0) {
          // Husky eats ghost! (Met deadline)
          if (!g.inHouse) {
            playSound('eat_ghost');
            g.reset(9, 10, true); // send back to house
            this.score += 10;     // bonus score
            this.saveHighScore();
            this.updateStatsUI();
          }
        } else {
          // Ghost eats Husky! Fail class!
          this.handleDeath();
        }
      }
    });
  },

  handleDeath() {
    playSound('death');
    stopBgMusic();
    
    this.lives--;
    this.gpa -= 1.0;
    if (this.gpa < 0) this.gpa = 0.0;
    
    this.updateStatsUI();
    
    if (this.lives <= 0 || this.gpa <= 0) {
      // Academic Probation! Game Over
      this.state = 'GAMEOVER';
      this.showOverlay('ACADEMIC SUSPENSION', 'Your GPA dropped below standing! Quarter failed. Click below to try again.');
      document.getElementById('start-btn').innerText = 'Restart Quarter';
    } else {
      // Reset position for another try
      this.state = 'PAUSED';
      this.showOverlay('CLASS FAILED!', 'You missed a crucial deadline! Keep going to save your GPA.');
      document.getElementById('start-btn').innerText = 'Retake Course';
      
      this.husky.reset(9, 16);
      this.ghosts[0].reset(9, 8, false);
      this.ghosts[1].reset(9, 10, true);
      this.ghosts[2].reset(8, 10, true);
      this.ghosts[3].reset(10, 10, true);
      this.powerPelletTime = 0;
    }
  },

  handleWin() {
    playSound('win');
    stopBgMusic();
    this.state = 'WIN';
    
    this.level++;
    this.showOverlay('QUARTER COMPLETED!', `Congratulations! You graduated with a GPA of ${this.gpa.toFixed(2)}. Click below to start the next quarter!`);
    document.getElementById('start-btn').innerText = 'Start Next Quarter';
  },

  // ----------------------------------------------------
  // 6. Graphics Rendering
  // ----------------------------------------------------
  render() {
    // Clear screen
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw Maze Walls, Dots, and Tunnels
    this.drawMaze();
    
    // Draw Husky
    this.husky.draw(this.ctx);
    
    // Draw Ghosts
    this.ghosts.forEach(g => g.draw(this.ctx));
  },

  drawMaze() {
    const primaryPurple = '#4b2e83';
    const primaryGold = '#85754d';
    
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.map[r][c];
        const tx = c * TILE_SIZE;
        const ty = r * TILE_SIZE;
        
        if (tile === 1) {
          // Draw wall with sleek double borders
          this.ctx.fillStyle = '#170c2f';
          this.ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          
          this.ctx.strokeStyle = primaryPurple;
          this.ctx.lineWidth = 1;
          this.ctx.strokeRect(tx + 2, ty + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        } else if (tile === 4) {
          // Draw gate (Academic Registrar door)
          this.ctx.strokeStyle = '#f5f3ef';
          this.ctx.lineWidth = 3;
          this.ctx.beginPath();
          this.ctx.moveTo(tx, ty + TILE_SIZE / 2);
          this.ctx.lineTo(tx + TILE_SIZE, ty + TILE_SIZE / 2);
          this.ctx.stroke();
        } else if (tile === 2) {
          // Draw normal academic credits (Gold circles)
          this.ctx.fillStyle = primaryGold;
          this.ctx.beginPath();
          this.ctx.arc(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2, 2.5, 0, Math.PI * 2);
          this.ctx.fill();
        } else if (tile === 3) {
          // Draw Husky Cards / Power Pellets (Gold squares blinking)
          const blink = Math.sin(Date.now() / 120) > 0;
          if (blink) {
            this.ctx.fillStyle = '#cbb47c'; // Soft gold
            
            // Draw credit card style rect
            this.ctx.beginPath();
            this.ctx.roundRect(tx + 4, ty + 5, TILE_SIZE - 8, TILE_SIZE - 10, 2);
            this.ctx.fill();
          } else {
            this.ctx.fillStyle = '#85754d'; // Metallic gold
            this.ctx.beginPath();
            this.ctx.roundRect(tx + 4, ty + 5, TILE_SIZE - 8, TILE_SIZE - 10, 2);
            this.ctx.fill();
          }
        }
      }
    }
  },

  renderLoop() {
    const loop = () => {
      this.update();
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
};

// Start the game initialization when page loads
window.addEventListener('DOMContentLoaded', () => {
  game.init();
});
