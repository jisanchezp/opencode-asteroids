---
description: Crea un worktree git local en .worktrees/<nombre>
agent: build
---

Crea un worktree de git en este repositorio.

1. El nombre del worktree es el argumento: `$ARGUMENTS`.
2. Valida que el nombre no esté vacío. Si falta o está vacío, avisa que es obligatorio y detente sin ejecutar nada.
3. Normaliza el nombre a kebab-case:
   - Reemplaza espacios por `-`.
   - Convierte a minúsculas.
   - Si quedan caracteres no válidos (solo se admiten `a-z`, `0-9` y `-`), rechaza el nombre, muestra el problema y detente.
   - Úsalo como `<nombre>`.
4. Ejecuta exactamente: `git worktree add .worktrees/<nombre>`
5. Reporta el resultado de la operación: muestra la salida del comando y, si falla, indica el error. Si falla por un nombre ya existente u otra condición, refleja ese mensaje.
6. No hagas nada más: no cambies de directorio, no crees archivos adicionales ni hagas commits.