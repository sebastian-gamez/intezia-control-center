# Centro de Control — Intezia

App web interna para gestionar la **producción de guiones** de la fábrica de contenido de IA.

**Los guiones viven en NocoDB**, no en este repositorio. Este repo es público —para que
Vercel lo despliegue— y contiene solo código: ni un guion, ni una credencial. La app lee
y escribe la tabla `Contenido`, que es la única fuente de verdad para el equipo.

La bóveda de Obsidian (donde el agente escribe los guiones con el modelo de ritmo) vive
en un repositorio **privado** aparte y empuja su contenido a esa misma tabla.

## Qué hace

- **Tablero** (Kanban) por etapa: `Borrador → Por Hacer → En Proceso → Producido → Publicado`, las mismas que usa el equipo en NocoDB.
- **Todos los guiones**: tabla con filtros (estado, pilar, voz, plataforma, responsable) y búsqueda.
- **Grabaciones**: cola por ejecutivo en cámara (`voz`), con fecha de grabación.
- **Calendario**: grabaciones 🎥 y publicaciones 🚀 por fecha.
- **Aprendizajes**: publicados ordenados por *saves* (atribución sobre vanidad).
- **Detalle de guion**: vista **🎙️ Para grabar** —solo lo que se dice en cámara— con un interruptor al guion completo. Ficha de producción editable; al guardar escribe en NocoDB.
- **Acceso** protegido por una clave compartida del equipo.

Roles: **`voz`** = ejecutivo en cámara (CEO/COO/CMO) · **`responsable`** = productor/editor.

## Correr en local

1. `npm install`
2. Copia `.env.local.example` a `.env.local` y ajusta:
   - `ACCESS_PASSCODE` = clave del equipo.
   - `VAULT_PATH` = ruta a la bóveda de contenido (donde está `05_Guiones/`).
3. `npm run dev` → abre http://localhost:3000

En local, la app lee/escribe los archivos `.md` directamente (adaptador local).

## Desplegar (acceso remoto del equipo)

Ver **`DEPLOY.md`**. Resumen: subir la bóveda de contenido a un repo privado de GitHub, subir esta app a otro repo, y desplegar en Cloudflare Pages/Netlify (gratis, apto comercial) con estas variables:

| Variable | Para qué |
|---|---|
| `ACCESS_PASSCODE` | Clave de acceso del equipo |
| `GITHUB_TOKEN` | Fine-grained token con permiso de **Contents: read/write** al repo de contenido |
| `GITHUB_OWNER` | Tu usuario/organización de GitHub |
| `GITHUB_REPO` | Nombre del repo de contenido (la bóveda) |
| `GITHUB_BRANCH` | Rama (ej. `main`) |
| `GUIONES_DIR` | Carpeta de guiones (`05_Guiones`) |

> Si `GITHUB_TOKEN` está definido, la app usa GitHub (producción). Si no, usa `VAULT_PATH` (local).

## Arquitectura

- **Next.js 14** (App Router) + **Tailwind**.
- `lib/data.ts` — adaptador de datos: **local (fs)** o **GitHub (API)** según el entorno.
- `lib/guion.ts` — parseo/serialización del frontmatter con `gray-matter`.
- Los cambios del equipo se guardan como **commits** en el repo de contenido (versionado gratis).
- No es colaboración en tiempo real; para un equipo de 2-4 personas es imperceptible.
