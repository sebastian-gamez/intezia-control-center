import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { COOKIE, MAX_EDAD, firmarSesion } from "@/lib/sesion";
import { log } from "@/lib/log";

// --- Freno a la fuerza bruta -------------------------------------------------
// Una clave compartida sin freno se adivina sola: bastan unos miles de intentos por
// minuto. Se cuentan los fallos por IP en una ventana deslizante y, pasados los libres,
// cada fallo dobla la espera.
//
// ponytail: el contador vive en la memoria del proceso — en serverless cada instancia
// cuenta por su lado y se reinicia en frío. Es el freno que se puede tener sin añadir
// infraestructura (aquí no hay Redis ni KV, solo NocoDB). Si hace falta un límite duro
// y compartido, mover este Map a un KV.
const INTENTOS = new Map<string, { fallos: number; ultimo: number; hasta: number }>();
const VENTANA_MS = 15 * 60 * 1000;
const FALLOS_LIBRES = 5;
const ESPERA_BASE_MS = 30 * 1000;
const ESPERA_MAX_MS = 15 * 60 * 1000;

function ipDe(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0].trim() || req.headers.get("x-real-ip") || "desconocida";
}

/** Milisegundos que le quedan de castigo a esta IP (0 si puede intentar). */
function bloqueoRestante(ip: string): number {
  const e = INTENTOS.get(ip);
  if (!e) return 0;
  const ahora = Date.now();
  if (ahora - e.ultimo > VENTANA_MS) {
    INTENTOS.delete(ip);
    return 0;
  }
  return Math.max(0, e.hasta - ahora);
}

function anotarFallo(ip: string) {
  const ahora = Date.now();
  // Purga barata para que el Map no crezca sin techo con IPs que ya no vuelven.
  if (INTENTOS.size > 500) {
    for (const [k, v] of INTENTOS) if (ahora - v.ultimo > VENTANA_MS) INTENTOS.delete(k);
  }
  const previo = INTENTOS.get(ip);
  const fallos = previo && ahora - previo.ultimo <= VENTANA_MS ? previo.fallos + 1 : 1;
  const exceso = fallos - FALLOS_LIBRES;
  const hasta =
    exceso > 0 ? ahora + Math.min(ESPERA_BASE_MS * 2 ** (exceso - 1), ESPERA_MAX_MS) : 0;
  INTENTOS.set(ip, { fallos, ultimo: ahora, hasta });
}

/** Compara sin filtrar por tiempo: los digest miden lo mismo pase lo que pase. */
function mismaClave(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(req: NextRequest) {
  // Se recortan espacios en los dos lados. Es la causa más común de "la clave es
  // correcta y no entra": un espacio al final del valor en Vercel, o pegado al copiar.
  const passcode = (process.env.ACCESS_PASSCODE || "").trim();
  const { code } = await req.json().catch(() => ({ code: "" }));
  const enviado = String(code || "").trim();
  const ip = ipDe(req);

  // Sin passcode configurado el middleware bloquea la app en producción, así que el
  // login no debe dar un 401 confuso: se dice qué falta.
  if (!passcode) {
    return NextResponse.json(
      { ok: false, error: "No hay ACCESS_PASSCODE configurado en el servidor." },
      { status: 500 }
    );
  }

  const espera = bloqueoRestante(ip);
  if (espera > 0) {
    const segundos = Math.ceil(espera / 1000);
    log.warn("auth.bloqueado", { ip, segundos });
    return NextResponse.json(
      { ok: false, error: `Demasiados intentos fallidos. Reintenta en ${segundos} s.` },
      { status: 429, headers: { "Retry-After": String(segundos) } }
    );
  }

  // La clave es compartida por todo el equipo: no hay identidad por persona, así que
  // esto autentica al equipo, no a quien entra, y los logs no pueden decir QUIÉN fue.
  if (!mismaClave(enviado, passcode)) {
    anotarFallo(ip);
    log.warn("auth.fallo", { ip });
    return NextResponse.json({ ok: false, error: "Clave incorrecta." }, { status: 401 });
  }

  INTENTOS.delete(ip);
  log.info("auth.ok", { ip });

  const res = NextResponse.json({ ok: true });
  // La cookie lleva un token firmado, nunca el passcode.
  res.cookies.set(COOKIE, await firmarSesion(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_EDAD,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
