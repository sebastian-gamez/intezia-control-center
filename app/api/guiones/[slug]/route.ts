import { NextRequest, NextResponse } from "next/server";
import { getGuion, updateGuion, deleteGuion, avisoSync } from "@/lib/data";
import { ErrorDeEntrada, validarCuerpo, validarPatch } from "@/lib/validacion";
import { slugSeguro } from "@/lib/guion";
import { log, motivo } from "@/lib/log";

/** Traduce cualquier fallo a una respuesta: el detalle se queda en el servidor. */
function fallo(evento: string, e: unknown) {
  if (e instanceof ErrorDeEntrada)
    return NextResponse.json({ error: e.message }, { status: 400 });
  log.error(evento, { motivo: motivo(e) });
  return NextResponse.json(
    { error: "Operación fallida. Revisa los logs del servidor." },
    { status: 500 }
  );
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const g = await getGuion(slugSeguro(params.slug));
    if (!g) return NextResponse.json({ error: "no encontrado" }, { status: 404 });
    return NextResponse.json(g);
  } catch (e) {
    return fallo("guiones.leer", e);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const slug = slugSeguro(params.slug);
    const updated = await updateGuion(slug, validarPatch(body), validarCuerpo(body.cuerpo));
    // `aviso` cuenta si el guardado llegó también a NocoDB o solo a la bóveda.
    return NextResponse.json({ ...updated, aviso: avisoSync() });
  } catch (e) {
    return fallo("guiones.actualizar", e);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    await deleteGuion(slugSeguro(params.slug));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return fallo("guiones.eliminar", e);
  }
}
