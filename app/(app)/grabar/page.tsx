import { listGuiones } from "@/lib/data";
import Grabacion from "@/components/Grabacion";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * El proceso de grabación, paso a paso.
 *
 * Vive aquí y no en un documento porque el momento en que hace falta es justo antes de
 * grabar, con el teléfono en la mano. Un manual que hay que ir a buscar no se lee.
 */
export default async function GrabarPage() {
  const guiones = await listGuiones();

  // `listGuiones()` trae el markdown completo de todos los guiones activos: cientos de
  // kilobytes que esta pantalla no necesita, y que se descargan desde un teléfono en el
  // estudio. Aquí solo viaja lo que se pinta en la lista; el texto del guion elegido se
  // pide en el momento con `fetchGuion`, igual que hace el modal.
  const items = guiones.map((g) => ({
    slug: g.slug,
    titulo: g.titulo,
    estado: g.estado,
    voz: g.voz,
    duracion: g.duracion,
    plataforma: g.plataforma,
    palabras_objetivo: g.palabras_objetivo,
  }));

  return (
    <Grabacion
      guiones={items}
      driveUrl={process.env.DRIVE_GRABACIONES_URL || ""}
    />
  );
}
