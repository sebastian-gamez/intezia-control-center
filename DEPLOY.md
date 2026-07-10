# Guía de despliegue — Centro de Control

Objetivo: que el equipo entre desde un **enlace** (móvil/escritorio), gratis. Requiere 2 cuentas tuyas: **GitHub** y un hosting (**Cloudflare Pages** o **Netlify** — sus planes gratis permiten uso comercial; el gratis de Vercel no).

Yo (el agente) puedo preparar los archivos y comandos; los **logins y clics finales los haces tú** por seguridad.

---

## Paso 1 — Subir la bóveda de contenido a GitHub (privado)

Desde la carpeta `IMAI` (la bóveda):

```bash
git init
git add .
git commit -m "Fábrica de contenido Intezia — estado inicial"
```

Crea un repo **privado** en GitHub (ej. `intezia-fabrica-contenido`) y:

```bash
git remote add origin https://github.com/TU_USUARIO/intezia-fabrica-contenido.git
git branch -M main
git push -u origin main
```

> Esto también permite que el agente haga commit de guiones nuevos y que la app los lea.

## Paso 2 — Subir la app a GitHub (privado)

Desde la carpeta `intezia-control-center`:

```bash
git init
git add .
git commit -m "Centro de Control — v1"
git remote add origin https://github.com/TU_USUARIO/intezia-control-center.git
git branch -M main
git push -u origin main
```

## Paso 3 — Crear el token de GitHub (para que la app escriba)

GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**:
- **Repository access:** solo el repo de contenido (`intezia-fabrica-contenido`).
- **Permissions → Repository permissions → Contents:** `Read and write`.
- Copia el token (empieza con `github_pat_...`). Es el valor de `GITHUB_TOKEN`.

## Paso 4 — Desplegar en Cloudflare Pages (recomendado, gratis)

1. Entra a Cloudflare → **Workers & Pages → Create → Pages → Connect to Git** → elige el repo `intezia-control-center`.
2. Framework preset: **Next.js**. Build command `npm run build`. (Cloudflare aplica el adaptador de Next automáticamente.)
3. En **Settings → Environment variables**, añade:
   - `ACCESS_PASSCODE` = una clave fuerte para el equipo
   - `GITHUB_TOKEN` = el token del paso 3
   - `GITHUB_OWNER` = tu usuario/org
   - `GITHUB_REPO` = `intezia-fabrica-contenido`
   - `GITHUB_BRANCH` = `main`
   - `GUIONES_DIR` = `05_Guiones`
4. Deploy. Obtienes un enlace `https://intezia-control-center.pages.dev` → compártelo con el equipo + la clave.

> **Alternativa Netlify:** Add new site → Import from Git → mismas variables de entorno. También gratis y apto comercial.

## Paso 5 — Comprobar

- Abre el enlace → pide la clave → entra.
- Mueve un guion de estado o cambia una fecha → recarga → persiste.
- En GitHub, verás un commit nuevo en el repo de contenido ("actualizar … desde el centro de control").

---

## Notas
- **Seguridad:** el token vive solo en las variables del hosting (no en el código). La app es privada por passcode.
- **Upgrade opcional:** cambiar el passcode por login con Google restringido al dominio de Intezia (NextAuth) — se puede añadir después.
- **El agente y el equipo comparten el mismo repo:** el agente añade guiones nuevos (aparecen en `borrador`); el equipo los produce desde la app.
