import { NextRequest, NextResponse } from "next/server";
import { listGuiones, createGuion, duplicateGuion } from "@/lib/data";

export async function GET() {
  const guiones = await listGuiones();
  return NextResponse.json(guiones);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    titulo?: string;
    duplicateFrom?: string;
  };
  try {
    if (body.duplicateFrom) {
      const g = await duplicateGuion(body.duplicateFrom);
      return NextResponse.json(g);
    }
    const titulo = (body.titulo || "Nuevo guion").trim() || "Nuevo guion";
    const g = await createGuion(titulo);
    return NextResponse.json(g);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
