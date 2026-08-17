# Guía de despliegue en Vercel — Centro de Control

Objetivo: que el equipo entre por un **enlace** desde cualquier lugar. Necesitas 2 cuentas: **GitHub** y **Vercel** (con el mismo correo es más fácil).

> Nota: el plan gratis de Vercel (Hobby) es para uso **no comercial**. Para empresa, Vercel pide el plan **Pro** (~US$20/mes). Alternativas gratis aptas para comercial: Cloudflare Pages / Netlify.

Los repos ya están inicializados y commiteados localmente (rama `main`). Faltan los pasos que requieren tu login.

---

## Paso 1 — Crear los 2 repos en GitHub (PRIVADOS)

Entra a https://github.com/new y crea **dos** repositorios **privados** y **vacíos** (sin README):
1. **`intezia-fabrica-contenido`** — la bóveda de contenido (tiene datos confidenciales → privado obligatorio).
2. **`intezia-control-center`** — la app.

## Paso 2 — Subir el código

**Opción fácil (GitHub Desktop):** abre GitHub Desktop → *File → Add local repository* → elige cada carpeta → *Publish repository* (marca **Keep this code private**).

**Opción terminal:** en cada carpeta corre (reemplaza TU_USUARIO):
```bash
# En la carpeta IMAI (bóveda)
git remote add origin https://github.com/TU_USUARIO/intezia-fabrica-contenido.git
git push -u origin main

# En la carpeta intezia-control-center (app)
git remote add origin https://github.com/TU_USUARIO/intezia-control-center.git
git push -u origin main
```
La primera vez, Windows abrirá el navegador para iniciar sesión en GitHub (Git Credential Manager).

## Paso 3 — Token de GitHub (para que la app lea/escriba los guiones)

GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**:
- **Token name:** `intezia-control-center`
- **Repository access:** *Only select repositories* → **`intezia-fabrica-contenido`**.
- **Permissions → Repository permissions → Contents:** `Read and write`.
- Generar y **copiar** el token (`github_pat_...`).

## Paso 4 — Desplegar la app en Vercel

1. Entra a https://vercel.com → **Add New… → Project** → *Import Git Repository* → elige **`intezia-control-center`**.
2. Framework: **Next.js** (lo detecta solo). No cambies Build/Output.
3. Antes de *Deploy*, abre **Environment Variables** y añade estas 6 (más `SESSION_SECRET`,
   opcional pero recomendada — ver la tabla completa más abajo):

| Name | Value |
|---|---|
| `ACCESS_PASSCODE` | una clave fuerte para el equipo (ej. la que definas) |
| `GITHUB_OWNER` | tu usuario de GitHub |
| `GITHUB_REPO` | `intezia-fabrica-contenido` |
| `GITHUB_BRANCH` | `main` |
| `GUIONES_DIR` | `05_Guiones` |

4. Clic en **Deploy**. En ~1 min tendrás un enlace tipo `https://intezia-control-center.vercel.app`.

## Paso 5 — Comprobar

- Abre el enlace → pide la clave (`ACCESS_PASSCODE`) → entra.
- Mueve un guion de estado o cambia la fecha de grabación → recarga → persiste.
- En GitHub, en `intezia-fabrica-contenido`, verás un commit nuevo ("actualizar … desde el centro de control").

---

## Después: cómo entran los guiones nuevos
Cuando el agente (Claude Code) genere guiones en la bóveda local, súbelos con:
```bash
# En la carpeta IMAI
git add 05_Guiones 03_Conocimiento 02_Fuentes
git commit -m "guiones nuevos"
git push
```
La app desplegada los mostrará al instante (los lee del repo).

## Notas
- **Seguridad:** el token vive solo en las variables de Vercel, nunca en el código. La app es privada por passcode.
- Para cambiar la clave del equipo: Vercel → Project → Settings → Environment Variables → editar `ACCESS_PASSCODE` → *Redeploy*.


---

## Variables en Vercel (lo mínimo para que funcione)

| Variable | Qué es |
|---|---|
| `ACCESS_PASSCODE` | la clave del equipo. **Larga y aleatoria** — es lo único que protege la app |
| `SESSION_SECRET` | opcional. Clave con la que se firma la cookie de sesión (ver Paso 4). Si falta, se deriva de `ACCESS_PASSCODE` — ponla si quieres poder rotar una sin la otra |
| `NOCODB_BASE_URL` | la URL de tu NocoDB |
| `NOCODB_TOKEN` | token de NocoDB con permiso sobre la tabla `Contenido` |
| `NOCODB_CONTENIDO_TABLE_ID` | id de la tabla `Contenido` (se copia de la URL al abrirla) |
| `NOCODB_LOG_TABLE_ID` | id de `Contenido — Log de etapas` |

`GITHUB_TOKEN` + `GITHUB_OWNER` + `GITHUB_REPO`: **ahora obligatorias** para "+ Nuevo guion".
Antes, si faltaban, la app usaba en silencio una plantilla de respaldo desactualizada; ahora
la creación falla con un error explícito en vez de crear guiones con la estructura vieja.

⚠️ Cambiar una variable **no aplica sola**: hay que redesplegar.

⚠️ Este repo es público. **Nunca** pongas un valor real en `.env.local.example`.
