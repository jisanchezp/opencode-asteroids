# AGENTS.md

Clon de *Asteroids* en canvas HTML5 puro, sin bundler ni dependencias. Todo el juego vive en `game.js`; `index.html` solo carga el canvas y el script.

## Comandos

No hay build, test, lint ni typecheck. La única verificación es abrir el juego:

```bash
npx serve .
# luego visitar http://localhost:3000
```

También funciona abriendo `index.html` directamente. No uses `module`/imports ni bundlers; el proyecto es deliberadamente vanilla.

## Arquitectura

- Todo es global en `game.js` (no hay módulos). Código nuevo debe seguir ese patrón.
- Bucle principal: `requestAnimationFrame(loop)` → `update(dt)` → `draw()`. `dt` viene en **segundos** (no frames) y se limita a máx. `0.05`.
- Maquina de estados global `state`: `'playing' | 'dead' | 'gameover'`, manejada dentro de `update()`.
- Clases: `Ship`, `Bullet`, `Asteroid`, `ShootingStar`, `Particle`, `PowerUp`. Todas usan el flag `dead` + filtrado con `.filter()` en el update, o lo eliminado se acumula en arrays.
- `W=800` y `H=600` están hardcodeados en `game.js` **y** en el atributo del `<canvas>` de `index.html`. Si cambias uno, sincroniza el otro.
- Power-ups: aparecen al destruir asteroides (12% por asteroide, máx. 1 activo, `POWERUP_TTL = 10`). Un solo `PowerUp` con campo `type`: `'boost'` (chevron naranja, velocidad x2) o `'shield'` (glifo azul, escudo), elegido al 50%. Deben tener `radius` asignado (`POWERUP_RADIUS`); sin eso la recogida evalúa `NaN` y nunca se activa.
- El boost vive en `ship.boostTimer` (segundos), se aplica duplicando `THRUST` en `Ship.update()` y se limpia en `reset()` (reaparición, `initGame`, `nextLevel`). El HUD lo muestra como `VELOCIDAD X2 (s)`.
- El escudo vive en `ship.shield` (segundos, `SHIELD_DURATION = 8`). Mientras está activo (`> 0`) los asteroides rebotan en la nave en vez de matarla, restando `SHIELD_HIT_COST = 1.5` por impacto en la rama "Nave vs asteroide" de `update()`. Se limpia en `reset()` y el HUD lo muestra como `ESCUDO (s)`.
- Estrella fugaz (`ShootingStar`): asteriode especial de 5 puntas con estela. Más rápido (`STAR_SPEED = 200`) y con `ttl = STAR_TTL = 8` (desaparece sola con `explode()` al expirar). Spawnea en `spawnAsteroids` con probabilidad 0.15 reemplazando un `Asteroid` normal; comparte array con los asteroides. Usa `size = 1` (100 pts en `POINTS`) y `split()` retorna `[]` (no se divide). No contiene `verts` de asteroide clásico: dibuja su propio polígono de estrella.
- Skins de la nave: sección `// ── Skins ──` con la tabla `SKINS` (objetos `{ id, name, flameColor, draw(ctx) }`). `draw(ctx)` pinta la silueta en coordenadas locales de la nave (nariz en `+X`, radio ~22, `ctx` ya transformado). La tecla `S` cicla (`cycleSkin()` desde el inicio de `update()`, funciona en cualquier estado), la selección se persiste en `localStorage` (clave `asteroids-skin`, con fallback a `'classic'`) y `drawLifeIcon()` reutiliza `getSkin().draw(ctx)` con `ctx.scale(0.55)`. El HUD muestra `PIEL: <nombre>  (S PARA CAMBIAR)` abajo a la izquierda.

## Convenciones

- Texto visible (HUD, overlays, README) en **español**: `NIVEL`, `PUNTAJE`, `GAME OVER`. Mantenlo así.
- Comentarios de sección con el patrón `// ── Nombre ──`.
- Input por `e.code` (`ArrowLeft`, `Space`, etc.). `keys[code]` es "mantenido", `pressed(code)` es pulso único que se consume una vez.
- Mundo con envolvimiento de bordes (toroidal): usa `wrap(v, max)` al integrar posiciones.
- Tamaños de asteroide indexados por `size` (1..3) con tablas constantes `RADII`, `SPEEDS`, `POINTS` en `game.js:61-63`.

## Gotchas

- `update()` tiene tres ramas por estado; al añadir lógica nueva verifica que funcione también en `'dead'` y `'gameover'` (p. ej. partículas siguen actualizándose ahí).
- La nave en reaparición tiene `invincible` (segundos); el parpadeo está en `Ship.draw()` y la colisión se desactiva solo si `ship.invincible <= 0`.