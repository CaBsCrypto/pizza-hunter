# Guía de Modelado y Exportación de Personaje 3D - Pizza Hunter 🍕🏍️

Esta guía técnica está dirigida al equipo de diseño 3D para asegurar que los nuevos modelos de motos (Vespas) y repartidores (Chefs) se acoplen perfectamente al motor de físicas y renderizado del juego.

---

## 1. Reglas de Orientación y Ejes (CRÍTICO)

El motor de físicas del juego calcula los vectores de movimiento y rotación asumiendo que el vehículo avanza en el **Eje X Positivo (`+X`)**.

* **Dirección Delantera (Frente):** El frente de la moto debe apuntar hacia el eje **`+X`** (Rojo en Blender/Maya).
* **Dirección Superior (Arriba):** La parte superior de la moto y el chef debe apuntar hacia el eje **`+Z`** (Azul en Blender/Maya).
* **Dirección Lateral (Derecha/Izquierda):** El ancho del manubrio/cuerpo debe alinearse con el eje **`+Y`** (Verde en Blender/Maya).

> [!WARNING]
> Si el modelo se exporta mirando hacia `-X`, `+Y` o `-Y`, el vehículo se moverá "de lado" o en reversa en el juego. Asegúrate de congelar las rotaciones (Apply Rotation) antes de exportar.

---

## 2. Dimensiones y Caja de Colisión (Bounding Box)

El modelo actual está optimizado para las siguientes dimensiones relativas en unidades del mundo 3D. Mantén estas proporciones para evitar que el modelo atraviese las paredes o las mesas físicas de la pizzería:

* **Largo Total (Eje X):** ~1.1 unidades (de punta a punta de las llantas).
* **Ancho Total (Eje Y):** ~0.65 unidades (medido en la envergadura del manubrio).
* **Alto Total (Eje Z):** ~1.4 unidades (desde el suelo hasta la punta del gorro de chef).

```
          +Z (Arriba) ~1.4u
             |
             |    Chef Hat
            _O_   Head/Helmet
           / | \  Torso
     =====/==|==\======> +X (Frente/Dirección de Movimiento) ~1.1u
     O-----------O  Wheels
   ----------------- Ground (Z = 0)
```

---

## 3. Punto de Pivote y Ancla (Origen `0,0,0`)

El punto de origen de coordenadas del objeto 3D debe estar posicionado exactamente:
1. **Z = 0:** En la base de las ruedas (el nivel del suelo). No entierres las llantas bajo el origen ni dejes el modelo flotando.
2. **X = 0, Y = 0:** Centrado perfectamente a lo ancho y a lo largo (justo a la mitad del chasis y la distancia entre ejes).

---

## 4. Formato de Entrega y Optimización

* **Formato Preferido:** `.glb` (GL Transmission Format binario) o `.gltf`. Es el estándar de optimización para la web.
* **Optimización de Polígonos:** Dado que es un juego móvil/web de vista cenital rápida, mantén el conteo de polígonos bajo (**Low-Poly**, recomendado menos de 8,000 - 10,000 triángulos en total).
* **Materiales:**
  * Usa materiales PBR estándar (Albedo/Color, Roughness, Metalness).
  * Si usas texturas, intenta empaquetarlas en un solo mapa (Texture Atlas) de resolución máxima **1024x1024** o **2048x2048** comprimido.

---

## 5. Áreas de Color Personalizable (Pintura de la Moto)

El juego permite a los jugadores cambiar el color de su moto desde el menú principal. Para que esto funcione con el nuevo modelo:
* **Separación de Nodos / Nombres:** Nombra el chasis principal del modelo como **`chassis`** o **`body`**. En el código interceptaremos este nodo específico para sobreescribir el color del material de manera dinámica con la selección del usuario.
* El resto de componentes (asiento negro, llantas de goma, rines de metal, faro emisivo) deben mantener sus materiales fijos.

---

## 6. Ejemplo de Integración en Código (React Three Fiber)

Una vez entregado el `.glb`, lo integraremos cargándolo de forma reactiva con `@react-three/drei`:

```tsx
import { useGLTF } from '@react-three/drei';

export function NuevoModeloMoto({ color }) {
  const { nodes, materials } = useGLTF('/models/moto_nueva.glb');
  
  // Modificar el color del chasis dinámicamente antes de renderizar
  if (materials['ChasisMaterial']) {
    materials['ChasisMaterial'].color.set(color);
  }

  return <primitive object={nodes.Scene} />;
}
```
