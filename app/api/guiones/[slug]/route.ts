import { NextRequest, NextResponse } from "next/server";
import { getGuion, updateGuion, deleteGuion } from "@/lib/data";
import type { GuionPatch } from "@/lib/types";

const CAMPOS: (keyof GuionPatch)[] = [
  "estado",
  "voz",
  "plataforma",
  "pilar",
  "responsable",
  "fecha_grabacion",
  "fecha_produccion",
  "fecha_publicacion",
  "cta",
  "duracion",
  "persona_audiencia",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const g = await getGuion(params.slug);
  if (!g) return NextResponse.json({ error: "no encontrado" }, { status: 404 });
  return NextResponse.json(g);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const patch: GuionPatch = {};
  for (const k of CAMPOS) {
    if (k in body) (patch as Record<string, unknown>)[k] = body[k];
  }
  const cuerpo =
    typeof body.cuerpo === "string" ? (body.cuerpo as string) : undefined;
  try {
    const updated = await updateGuion(params.slug, patch, cuerpo);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await deleteGuion(params.slug);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "error" },
      { status: 500 }
    );
  }
}
