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

Ver [REFACTOR_PLAN.md](REFACTOR_PLAN.md) para el plan de refactorización en curso (motor de simulación compartido, anti-cheat, persistencia) y [TICKETS.md](TICKETS.md) / [BACKLOG_Y_SPRINTS.md](BACKLOG_Y_SPRINTS.md) para el backlog detallado.

---

## 🎨 Guía de Desarrollo para Colaboradores (Diseño y Frontend)

El código está estructurado en una **Arquitectura Desacoplada** para permitir cambiar todo el aspecto estético, 3D y 2D del juego sin alterar las físicas o la sincronización de red.

### Estructura por Capas
* **Capa 2D / UI (`src/components/UI.tsx` o `src/components/ui/`):** Contiene todos los menús, botones, pop-ups de configuración y el HUD del juego en pantalla. Si vas a rehacer los menús de inicio o la UI flotante, **este es el archivo principal a modificar**.
* **Capa 3D / Escenario (`src/components/GameScene.tsx`):** Contiene el Canvas de Three.js (luces, texturas de mesas, mallas, renderizado de la Vespa). Si vas a cambiar modelos 3D, cámaras o iluminación, edita este archivo.
* **Capa Lógica (`src/hooks/useGameInput.ts` y `src/store/gameStore.ts`):** **No modificar.** Contiene el control de teclado/mando y el estado global (pizzas acumuladas, puntuación, conexión). La UI consume estas variables de forma limpia.

---

## 🚀 Flujo de Trabajo Colaborativo (Git + Vercel Previews)

Para contribuir con una nueva interfaz o cambio visual, sigue estos pasos:

1. **Clonar e Instalar:**
   ```bash
   git clone <url-del-repo>
   cd proud-turing
   npm install
   ```
2. **Crear una Rama Nueva:**
   *(Nunca trabajes directo sobre `master`)*
   ```bash
   git checkout -b feat/nombre-de-tu-cambio
   ```
3. **Correr en Local:**
   ```bash
   npm run dev
   ```
   Abre `http://localhost:3008` en tu navegador para ver los cambios en tiempo real.
4. **Verificar antes de subir:**
   Asegúrate de que no haya errores de TypeScript compilando el bundle:
   ```bash
   npm run build
   ```
5. **Subir rama y crear Pull Request:**
   Sube tus cambios a GitHub:
   ```bash
   git add .
   git commit -m "design: descripción de tu nuevo diseño"
   git push origin feat/nombre-de-tu-cambio
   ```
   Entra a GitHub y presiona **"New Pull Request"**.

6. **Validación Automática (Vercel Preview):**
   Al crear el Pull Request, Vercel generará un comentario automático en GitHub con un enlace llamado **"Preview"**. 
   * Abre ese link desde tu celular o computadora para validar el diseño en tiempo real antes de fusionarlo.
   * Si todo está correcto, el administrador del proyecto aceptará el Pull Request (Merge) y el nuevo diseño pasará a estar activo en producción en segundos.
