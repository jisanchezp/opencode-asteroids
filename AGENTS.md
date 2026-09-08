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
- Clases: `Ship`, `Bullet`, `Asteroid`, `Particle`. Todas usan el flag `dead` + filtrado con `.filter()` en el update, o lo eliminado se acumula en arrays.
- `W=800` y `H=600` están hardcodeados en `game.js` **y** en el atributo del `<canvas>` de `index.html`. Si cambias uno, sincroniza el otro.

## Convenciones

- Texto visible (HUD, overlays, README) en **español**: `NIVEL`, `PUNTAJE`, `GAME OVER`. Mantenlo así.
- Comentarios de sección con el patrón `// ── Nombre ──`.
- Input por `e.code` (`ArrowLeft`, `Space`, etc.). `keys[code]` es "mantenido", `pressed(code)` es pulso único que se consume una vez.
- Mundo con envolvimiento de bordes (toroidal): usa `wrap(v, max)` al integrar posiciones.
- Tamaños de asteroide indexados por `size` (1..3) con tablas constantes `RADII`, `SPEEDS`, `POINTS` en `game.js:61-63`.

## Gotchas

- `update()` tiene tres ramas por estado; al añadir lógica nueva verifica que funcione también en `'dead'` y `'gameover'` (p. ej. partículas siguen actualizándose ahí).
- La nave en reaparición tiene `invincible` (segundos); el parpadeo está en `Ship.draw()` y la colisión se desactiva solo si `ship.invincible <= 0`.