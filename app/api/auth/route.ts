import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Se recortan espacios en los dos lados. Es la causa más común de "la clave es
  // correcta y no entra": un espacio al final del valor en Vercel, o pegado al copiar.
  const passcode = (process.env.ACCESS_PASSCODE || "").trim();
  const { code } = await req.json().catch(() => ({ code: "" }));
  const enviado = String(code || "").trim();

  // Sin passcode configurado el middleware deja pasar a todo el mundo, así que el
  // login no debe dar un 401 confuso: se dice qué falta.
  if (!passcode) {
    return NextResponse.json(
      { ok: false, error: "No hay ACCESS_PASSCODE configurado en el servidor." },
      { status: 500 }
    );
  }
  if (enviado !== passcode) {
    return NextResponse.json({ ok: false, error: "Clave incorrecta." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("icc_auth", passcode, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("icc_auth", "", { path: "/", maxAge: 0 });
  return res;
}
