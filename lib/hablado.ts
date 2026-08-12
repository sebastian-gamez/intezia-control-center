// hablado.ts — Deja solo lo que la persona va a DECIR frente a la cámara.
//
// Quien graba no necesita ver las fuentes, las notas de producción ni la materia prima
// del guion: sobra información y se confunde. Pero el .md completo NO se toca — esto es
// solo un filtro de lectura. Lo que se edita y lo que se guarda sigue siendo el guion
// entero.
//
// El filtro QUITA lo que con certeza no se dice, en vez de intentar adivinar lo que sí.
// Es a propósito: en la bóveda conviven tres formatos distintos —los guiones nuevos con
// tabla de beats, los semiestructurados con el texto entre comillas, y 22 de formato
// libre sin un solo encabezado— y una regla que intentara "extraer lo hablado" dejaría
// en blanco justo esos últimos. Quitando solo lo conocido, el peor caso es que sobre
// algo, nunca que falte.

/** Secciones que son para producir o verificar, nunca para decir en cámara. */
const SECCIONES_FUERA = [
  /^#{1,4}\s*📚\s*Fuentes/i,
  /^#{1,4}\s*⭐\s*El valor,\s*desglosado/i,
  /^#{1,4}\s*Producción/i,
  /^#{1,4}\s*✅\s*Antes de aprobar/i,
  /^#{1,4}\s*Notas? (de|para) producción/i,
];

/** Un encabezado de cualquier nivel. */
const ES_ENCABEZADO = /^#{1,6}\s+/;

/**
 * Nota del redactor al redactor (patrón usado, presupuesto de palabras, recordatorios).
 * Van como cita y no se dicen. Se distinguen de una cita con texto hablado porque
 * mencionan el andamiaje del sistema.
 */
const NOTA_DE_AUTOR =
  /(Patrón de valor|Patrón usado|Ritmo y presupuesto|Modelo de redacción|Palabras por beat|Reglas de ritmo|palabras objetivo|Reescrito\b|se recalcula)/i;

export function soloHablado(markdown: string): string {
  const lineas = markdown.split(/\r?\n/);
  const salida: string[] = [];
  let saltando = false;

  for (const linea of lineas) {
    if (ES_ENCABEZADO.test(linea)) {
      // Un encabezado nuevo siempre reabre la salida, salvo que él mismo esté fuera.
      saltando = SECCIONES_FUERA.some((re) => re.test(linea));
      if (saltando) continue;
    }
    if (saltando) continue;

    // El separador que precede al bloque de producción no aporta nada suelto.
    if (/^---+\s*$/.test(linea)) continue;

    // Notas del redactor al redactor.
    if (/^\s*>/.test(linea) && NOTA_DE_AUTOR.test(linea)) continue;

    // "**Total: 122 / 116 palabras objetivo**" es el control del redactor, no del que graba.
    if (/^\s*\*\*Total:\s*\d+\s*\/\s*\d+/.test(linea)) continue;

    salida.push(linea);
  }

  return limpiarTablaDeBeats(salida.join("\n"))
    // Conteo de palabras al final de cada hook: "…no la usan." *(14)*
    .replace(/\s*\*\(\d+\)\*\s*$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * La tabla de beats tiene 4 columnas: tiempo, nombre del beat, texto a decir y conteo
 * de palabras. Para quien graba solo sirven el tiempo y el texto; el conteo es una
 * herramienta de quien escribe y el nombre del beat es jerga interna.
 */
function limpiarTablaDeBeats(md: string): string {
  const lineas = md.split("\n");
  const salida: string[] = [];

  for (const linea of lineas) {
    const celdas = filaDeTabla(linea);
    if (!celdas || celdas.length < 4) {
      salida.push(linea);
      continue;
    }
    // Separador de cabecera (|---|---|): se reduce a dos columnas.
    if (celdas.every((c) => /^:?-{2,}:?$/.test(c.trim()))) {
      salida.push("|---|---|");
      continue;
    }
    const [tiempo, , texto] = celdas;
    // La fila de cabecera se renombra a algo legible para quien graba.
    if (/^t$/i.test(tiempo.trim())) {
      salida.push("| Momento | Qué dices |");
      continue;
    }
    salida.push(`| ${tiempo.trim()} | ${texto.trim()} |`);
  }

  return salida.join("\n");
}

function filaDeTabla(linea: string): string[] | null {
  const t = linea.trim();
  if (!t.startsWith("|") || !t.endsWith("|")) return null;
  return t.slice(1, -1).split("|");
}
