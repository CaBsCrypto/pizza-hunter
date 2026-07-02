# Pizza Hunter — Multiplayer Pizzeria

Juego 3D multijugador en tiempo real: esquiva mesas de pizzería y recolecta pizzas
contra otros jugadores y bots. React 19 + react-three-fiber en el cliente,
Express + Socket.IO en el servidor.

## Correr en local

**Requisitos:** Node.js 20+

1. Instalar dependencias: `npm install`
2. Levantar el servidor de desarrollo (sirve cliente + backend en el mismo proceso): `npm run dev`
3. Abrir `http://localhost:3008`

## Desplegar online (Render)

El servidor necesita un proceso persistente (Socket.IO usa websockets), no
funciona en plataformas serverless como Vercel Functions.

1. Sube el repo a GitHub.
2. En [Render](https://render.com), "New +" → "Blueprint" y apunta al repo
   (usa el [render.yaml](render.yaml) incluido) — o crea un "Web Service" manual con:
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`
   - Variable de entorno `NODE_ENV=production`
3. El plan free de Render duerme tras ~15 min de inactividad (cold start al
   volver a entrar); suficiente para probar el multiplayer online sin costo.
4. Una vez desplegado, todos los jugadores entran a la misma URL — no hace
   falta configurar `VITE_BACKEND_URL` porque el cliente se conecta a
   `window.location.origin` por defecto.

## Estado del proyecto

Ver [REFACTOR_PLAN.md](REFACTOR_PLAN.md) para el plan de refactorización en curso
(motor de simulación compartido, anti-cheat, persistencia) y [TICKETS.md](TICKETS.md) /
[BACKLOG_Y_SPRINTS.md](BACKLOG_Y_SPRINTS.md) para el backlog detallado.
