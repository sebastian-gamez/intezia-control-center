import { NextRequest, NextResponse } from "next/server";

// Protege toda la app con el passcode compartido, salvo /login y /api/auth.
export function middleware(req: NextRequest) {
  const passcode = (process.env.ACCESS_PASSCODE || "").trim();
  // Si no se configuró passcode, no bloquear (modo abierto).
  if (!passcode) return NextResponse.next();

  const cookie = req.cookies.get("icc_auth")?.value;
  if (cookie === passcode) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("from", req.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Excluye assets estáticos, /login y la ruta de auth.
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
};
