'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
const STAR_RADIUS = 26;
const STAR_SPEED  = 200;
const STAR_TTL    = 8;

class ShootingStar {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size   = 1;
    this.radius = STAR_RADIUS;
    this.ttl    = STAR_TTL;
    this.dead   = false;

    const angle = rand(0, Math.PI * 2);
    const speed = STAR_SPEED + rand(-20, 20);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-2, 2);
    this.rot = 0;

    // Estrella de 5 puntas
    const SPIKES = 5;
    this.verts = [];
    for (let i = 0; i < SPIKES * 2; i++) {
      const a = (i / (SPIKES * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? this.radius : this.radius * 0.45;
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }

    // Estela: últimas posiciones
    this.tail = [];
    this.TAIL_LEN = 9;
  }

  update(dt) {
    const oldX = this.x;
    const oldY = this.y;
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;

    if (Math.abs(this.x - oldX) > W / 2 || Math.abs(this.y - oldY) > H / 2)
      this.tail = [];

    this.tail.unshift([this.x, this.y]);
    if (this.tail.length > this.TAIL_LEN) this.tail.pop();

    this.ttl -= dt;
    if (this.ttl <= 0) {
      this.dead = true;
      explode(this.x, this.y, 4);
    }
  }

  split() { return []; }

  draw() {
    const alpha = Math.min(1, this.ttl / (STAR_TTL * 0.3));
    if ((this.ttl < 1.5) && Math.floor(this.ttl * 8) % 2 === 0) return;

    // Estela fugaz
    for (let i = 1; i < this.tail.length; i++) {
      const t = i / this.tail.length;
      ctx.strokeStyle = `rgba(255,138,0,${(alpha * (1 - t) * 0.7).toFixed(2)})`;
      ctx.lineWidth = 1 + (1 - t) * 2;
      ctx.beginPath();
      ctx.moveTo(this.tail[i - 1][0], this.tail[i - 1][1]);
      ctx.lineTo(this.tail[i][0], this.tail[i][1]);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = `rgba(255,160,60,${alpha.toFixed(2)})`;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Skins ─────────────────────────────────────────────────────────────────────
const SKIN_STORAGE_KEY = 'asteroids-skin';

// Cada skin dibuja la silueta en coordenadas locales de la nave (nariz apuntando
// a +X, radio ~22). Debe fijar su propio strokeStyle/lineWidth/lineJoin.
const SKINS = [
  {
    id: 'classic', name: 'CLÁSICO',
    flameColor: 'rgba(255, 130, 0, 0.85)',
    draw(ctx) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.5;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo( 20,  0);   // nariz
      ctx.lineTo(-12, -9);   // ala izquierda
      ctx.lineTo( -7,  0);   // muesca trasera
      ctx.lineTo(-12,  9);   // ala derecha
      ctx.closePath();
      ctx.stroke();
    },
  },
  {
    id: 'viper', name: 'VÍBORA',
    flameColor: 'rgba(255, 200, 0, 0.9)',
    draw(ctx) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 1.6;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo( 23,  0);   // nariz afilada
      ctx.lineTo(  5, -7);   // raíz de ala izq.
      ctx.lineTo(-13, -8);   // garra izq.
      ctx.lineTo(-10, -2);   // muesca corta izq.
      ctx.lineTo(-18, -4);   // garra trasera izq.
      ctx.lineTo(-18,  4);   // garra trasera der.
      ctx.lineTo(-10,  2);   // muesca corta der.
      ctx.lineTo(-13,  8);   // garra der.
      ctx.lineTo(  5,  7);   // raíz de ala der.
      ctx.closePath();
      ctx.stroke();

      // Acento naranja en el filo del ala
      ctx.strokeStyle = 'rgba(255, 160, 0, 0.9)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo( 16,  0);
      ctx.lineTo( -2, -5);
      ctx.lineTo(-12, -4);
      ctx.stroke();
    },
  },
  {
    id: 'delta', name: 'DELTA',
    flameColor: 'rgba(80, 190, 255, 0.9)',
    draw(ctx) {
      ctx.strokeStyle = '#cfd8ff';
      ctx.lineWidth   = 1.5;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo( 22,  0);   // nariz
      ctx.lineTo(-10, -10);  // ala izq. barrida
      ctx.lineTo( -3,  0);   // centro trasero
      ctx.lineTo(-10,  10);  // ala der.
      ctx.closePath();
      ctx.stroke();

      // Cabina
      ctx.fillStyle = 'rgba(80, 170, 255, 0.55)';
      ctx.beginPath();
      ctx.arc(6, 0, 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9fb8ff';
      ctx.lineWidth   = 0.8;
      ctx.stroke();
    },
  },
  {
    id: 'falcon', name: 'FALCÓN',
    flameColor: 'rgba(120, 230, 160, 0.9)',
    draw(ctx) {
      ctx.strokeStyle = '#e8e8e8';
      ctx.lineWidth   = 1.5;
      ctx.lineJoin    = 'round';
      // Nariz bífida (doble proa)
      ctx.beginPath();
      ctx.moveTo( 21,  0);
      ctx.lineTo( 10, -5);
      ctx.lineTo(  6, -1);
      ctx.lineTo(-14, -6);
      ctx.lineTo(-10,  0);
      ctx.lineTo(-14,  6);
      ctx.lineTo(  6,  1);
      ctx.lineTo( 10,  5);
      ctx.closePath();
      ctx.stroke();

      // Quilla central
      ctx.strokeStyle = 'rgba(120, 230, 160, 0.9)';
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(-2, 0);
      ctx.lineTo(-13, 0);
      ctx.stroke();
    },
  },
  {
    id: 'ghost', name: 'FANTASMA',
    flameColor: 'rgba(150, 255, 240, 0.9)',
    draw(ctx) {
      ctx.strokeStyle = 'rgba(120, 235, 240, 0.7)';
      ctx.lineWidth   = 1.6;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo( 21,  0);
      ctx.lineTo(-11, -8);
      ctx.lineTo( -4, -2);
      ctx.lineTo( -9,  0);
      ctx.lineTo( -4,  2);
      ctx.lineTo(-11,  8);
      ctx.closePath();
      ctx.stroke();

      // Aura interior
      ctx.fillStyle = 'rgba(120, 235, 240, 0.12)';
      ctx.beginPath();
      ctx.moveTo( 18,  0);
      ctx.lineTo( -8, -6);
      ctx.lineTo( -2,  0);
      ctx.lineTo( -8,  6);
      ctx.closePath();
      ctx.fill();
    },
  },
];

function getSkin() {
  return SKINS.find(s => s.id === skinId) || SKINS[0];
}

function loadSkin() {
  try {
    const saved = localStorage.getItem(SKIN_STORAGE_KEY);
    if (saved && SKINS.some(s => s.id === saved)) return saved;
  } catch (e) { /* localStorage no disponible */ }
  return 'classic';
}

function saveSkin() {
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, skinId);
  } catch (e) { /* localStorage no disponible */ }
}

function cycleSkin() {
  const idx = SKINS.findIndex(s => s.id === skinId);
  skinId = SKINS[(idx + 1) % SKINS.length].id;
  saveSkin();
}

// ── Ship ──────────────────────────────────────────────────────────────────────
const BOOST_DURATION  = 5;
const TRIPLE_DURATION = 5;
const TRIPLE_SPREAD   = 0.17;   // rad, apertura de las balas laterales

class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.boostTimer    = 0;
    this.tripleTimer   = 0;
    this.shield        = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

if (this.boostTimer  > 0) this.boostTimer  -= dt;
    if (this.tripleTimer > 0) this.tripleTimer -= dt;
    if (this.shield      > 0) this.shield      -= dt;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      const thrust = THRUST * (this.boostTimer > 0 ? 2 : 1);
      this.vx += Math.cos(this.angle) * thrust * dt;
      this.vy += Math.sin(this.angle) * thrust * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    const shots = [new Bullet(ox, oy, this.angle)];
    if (this.tripleTimer > 0) {
      shots.push(new Bullet(ox, oy, this.angle - TRIPLE_SPREAD));
      shots.push(new Bullet(ox, oy, this.angle + TRIPLE_SPREAD));
    }
    return shots;
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.lineJoin = 'round';

    getSkin().draw(ctx);

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = getSkin().flameColor;
      ctx.stroke();
    }

    ctx.restore();

    // Escudo
    if (this.shield > 0) {
      if (this.shield > 2 || Math.floor(this.shield * 10) % 2 === 0) {
        const energy = Math.min(1, this.shield / SHIELD_DURATION);
        ctx.strokeStyle = `rgba(0, 200, 255, ${(0.35 + energy * 0.65).toFixed(2)})`;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'rgba(0, 200, 255, 0.06)';
        ctx.fill();
      }
    }
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y, color = '255,255,255') {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.color = color;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(${this.color},${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-Up ──────────────────────────────────────────────────────────────────
const POWERUP_RADIUS = 14;
const POWERUP_TTL    = 10;
const SHIELD_DURATION = 8;
const SHIELD_HIT_COST = 1.5;

class PowerUp {
  constructor(x, y, kind = 'boost') {
    this.x      = x;
    this.y      = y;
    this.kind   = kind;   // 'boost' | 'triple' | 'shield'
    this.rot    = 0;
    this.ttl    = POWERUP_TTL;
    this.radius = POWERUP_RADIUS;
    this.dead   = false;
  }

  update(dt) {
    this.rot += 1.5 * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = Math.min(1, this.ttl / (POWERUP_TTL * 0.4));
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
ctx.strokeStyle = this.kind === 'boost'
      ? `rgba(255, 138, 0, ${alpha.toFixed(2)})`
      : `rgba(0, 200, 255, ${alpha.toFixed(2)})`;
    ctx.lineWidth   = 3;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    if (this.kind === 'shield') {
      ctx.moveTo(-9,  10);
      ctx.lineTo(-9,   0);
      ctx.lineTo( 0, -11);
      ctx.lineTo( 9,   0);
      ctx.lineTo( 9,  10);
      ctx.closePath();
      ctx.moveTo(-5,   4);
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
    } else {
      const keysCount = this.kind === 'boost' ? 2 : 3;
      for (let i = 0; i < keysCount; i++) {
        const x0 = -10 + i * 10;
        ctx.moveTo(x0,     -10);
        ctx.lineTo(x0 + 10,  0);
        ctx.lineTo(x0,      10);
      }
    }
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let score, lives, level;
let skinId = loadSkin();
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    const isStar = Math.random() < 0.15;
    asteroids.push(isStar ? new ShootingStar(x, y) : new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8, color = '255,255,255') {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  // Cambiar apariencia de la nave (funciona en cualquier estado)
  if (pressed('KeyS')) cycleSkin();

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerups.forEach(pu => pu.update(dt));
    powerups = powerups.filter(pu => !pu.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(pu => pu.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);

  // Recoger power-up
  for (const pu of powerups) {
    if (!pu.dead && dist(ship, pu) < ship.radius + pu.radius) {
      pu.dead = true;
      if (pu.kind === 'shield') {
        ship.shield = SHIELD_DURATION;
        explode(pu.x, pu.y, 8, '0, 200, 255');
      } else if (pu.kind === 'triple') {
        ship.tripleTimer = TRIPLE_DURATION;
        explode(pu.x, pu.y, 6);
      } else {
        ship.boostTimer = BOOST_DURATION;
        explode(pu.x, pu.y, 6);
      }
    }
  }
  powerups = powerups.filter(pu => !pu.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        if (Math.random() < 0.12) {
          const kinds = ['boost', 'triple', 'shield'];
          const kind  = kinds[Math.floor(Math.random() * kinds.length)];
          if (!powerups.some(pu => pu.kind === kind))
            powerups.push(new PowerUp(a.x, a.y, kind));
        }
        newAsteroids.push(...a.split());
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shield > 0) {
          const dx = a.x - ship.x;
          const dy = a.y - ship.y;
          const d  = Math.hypot(dx, dy) || 1;
          const nx = dx / d;
          const ny = dy / d;
          const dot = a.vx * nx + a.vy * ny;
          if (dot < 0) {
            a.vx -= 2 * dot * nx;
            a.vy -= 2 * dot * ny;
          }
          a.x = ship.x + nx * (ship.radius + a.radius * 0.82 + 2);
          a.y = ship.y + ny * (ship.radius + a.radius * 0.82 + 2);
          a.rotSpeed *= -1;
          ship.shield -= SHIELD_HIT_COST;
          explode(a.x, a.y, 4, '0, 200, 255');
        } else {
          killShip();
          break;
        }
      }
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.scale(0.55, 0.55);
  getSkin().draw(ctx);
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (ship.boostTimer > 0) {
    ctx.fillStyle = '#ff8a00';
    ctx.font      = '13px monospace';
    ctx.fillText(`VELOCIDAD X2 (${ship.boostTimer.toFixed(1)})`, W / 2, H - 16);
  }

if (ship.shield > 0) {
    ctx.fillStyle = '#00c8ff';
    ctx.font      = '13px monospace';
    ctx.fillText(`ESCUDO (${ship.shield.toFixed(1)})`, W / 2, H - 34);
  }

  if (ship.tripleTimer > 0) {
    ctx.fillStyle = '#00c8ff';
    ctx.font      = '13px monospace';
    ctx.fillText(`TRIPLE SHOT (${ship.tripleTimer.toFixed(1)})`, W / 2, H - 52);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font      = '12px monospace';
  ctx.fillText(`PIEL: ${getSkin().name}  (S PARA CAMBIAR)`, 14, H - 16);

}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  powerups.forEach(pu => pu.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
