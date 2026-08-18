// sesion.ts — La cookie de sesión NO es la clave de acceso.
//
// Antes la cookie llevaba el `ACCESS_PASSCODE` en texto plano: cualquiera que la leyera
// (una extensión, un backup del navegador, un XSS) se llevaba la clave del equipo entero.
// Ahora lleva un token aleatorio con caducidad, firmado con HMAC-SHA256. El passcode no
// sale nunca del servidor, y el token no sirve para nada fuera de esta app.
//
// Se usa Web Crypto (no `node:crypto`) a propósito: el middleware corre en el runtime
// edge y este módulo tiene que funcionar igual en los dos lados.

export const COOKIE = "icc_auth";
/** Vida de la sesión, en segundos (30 días). */
export const MAX_EDAD = 60 * 60 * 24 * 30;

/**
 * Material de la clave de firma. Lo suyo es un `SESSION_SECRET` propio; si no está, se
 * deriva del passcode —que tampoco sale del servidor— para no romper un despliegue ya
 * vivo por una variable nueva. Cambiar cualquiera de las dos invalida las sesiones.
 */
function material(): string {
  return (process.env.SESSION_SECRET || process.env.ACCESS_PASSCODE || "").trim();
}

let cache: { material: string; key: CryptoKey } | null = null;

async function clave(): Promise<CryptoKey> {
  const m = material();
  if (!m) throw new Error("Sin SESSION_SECRET ni ACCESS_PASSCODE no se puede firmar la sesión.");
  if (cache && cache.material === m) return cache.key;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(m),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
  cache = { material: m, key };
  return key;
}

const bytes = (s: string) => new TextEncoder().encode(s);

function aB64url(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (const b of u8) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Sin anotar el tipo de vuelta a propósito: así se infiere `Uint8Array<ArrayBuffer>`,
// que es lo que Web Crypto acepta como `BufferSource`.
function deB64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** Token de sesión nuevo: `caducidad.nonce.firma`. */
export async function firmarSesion(): Promise<string> {
  const cuerpo = `${Date.now() + MAX_EDAD * 1000}.${aB64url(crypto.getRandomValues(new Uint8Array(16)))}`;
  const firma = await crypto.subtle.sign("HMAC", await clave(), bytes(cuerpo));
  return `${cuerpo}.${aB64url(firma)}`;
}

/** ¿El token lo firmamos nosotros y sigue vigente? Cualquier duda es un "no". */
export async function sesionValida(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const partes = token.split(".");
  if (partes.length !== 3) return false;
  const [exp, nonce, firma] = partes;
  try {
    // `verify` compara en tiempo constante; no hace falta hacerlo a mano.
    const ok = await crypto.subtle.verify(
      "HMAC",
      await clave(),
      deB64url(firma),
      bytes(`${exp}.${nonce}`)
    );
    return ok && Number(exp) > Date.now();
  } catch {
    return false;
  }
}
