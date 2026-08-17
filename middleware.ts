import { NextRequest, NextResponse } from "next/server";
import { COOKIE, sesionValida } from "@/lib/sesion";

// Protege toda la app con el passcode compartido, salvo /login y /api/auth.
export async function middleware(req: NextRequest) {
  const passcode = (process.env.ACCESS_PASSCODE || "").trim();

  // Sin passcode no hay protección posible. En producción eso NO puede degradarse a
  // "modo abierto" en silencio: se bloquea todo y se dice por qué. En desarrollo sí se
  // deja pasar, que es donde la comodidad no cuesta nada.
  if (!passcode) {
    if (process.env.NODE_ENV === "production") {
      return new NextResponse(
        "Falta ACCESS_PASSCODE en el servidor: la app queda bloqueada hasta configurarlo.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }
    return NextResponse.next();
  }

  if (await sesionValida(req.cookies.get(COOKIE)?.value)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Excluye assets estáticos, /login y la ruta de auth.
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
