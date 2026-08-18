import { NextRequest, NextResponse } from "next/server";
import { listGuiones, createGuion, duplicateGuion, avisoSync } from "@/lib/data";
import { ErrorDeEntrada, validarTitulo } from "@/lib/validacion";
import { slugSeguro } from "@/lib/guion";
import { log, motivo } from "@/lib/log";

export async function GET() {
  const guiones = await listGuiones();
  return NextResponse.json(guiones);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    const g = body.duplicateFrom
      ? await duplicateGuion(slugSeguro(String(body.duplicateFrom)))
      : await createGuion(validarTitulo(body.titulo));
    return NextResponse.json({ ...g, aviso: avisoSync() });
  } catch (e) {
    if (e instanceof ErrorDeEntrada)
      return NextResponse.json({ error: e.message }, { status: 400 });
    // El detalle completo se queda en el servidor: puede llevar rutas, tokens o el
    // esquema de NocoDB. Al cliente solo le sirve saber que falló.
    log.error("guiones.crear", { motivo: motivo(e) });
    return NextResponse.json(
      { error: "No se pudo crear el guion. Revisa los logs del servidor." },
      { status: 500 }
    );
  }
}
