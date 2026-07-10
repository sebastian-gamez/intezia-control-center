import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const passcode = process.env.ACCESS_PASSCODE;
  const { code } = await req.json().catch(() => ({ code: "" }));

  if (!passcode || code !== passcode) {
    return NextResponse.json({ ok: false }, { status: 401 });
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
