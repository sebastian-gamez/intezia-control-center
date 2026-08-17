import { describe, it, expect } from "vitest";
import { parseGuion, applyPatch, slugSeguro, newGuionRaw } from "./guion";

const CRUDO = `---
type: guion
ticket: INT-0431
estado: grabado
pilar: casos
voz: CEO
plataforma: IG
formato: reel
duracion: 30s
palabras_objetivo: "80"
persona_audiencia: Directora de operaciones
fuente: Informe X
insight: Nadie mide el retrabajo
referencia: Ref-12
responsable: Ana
fecha_grabacion: 2026-08-10
fecha_produccion:
fecha_publicacion:
cta: valor
metricas:
  views: 1200
  saves:
  shares: 30
pipeline: social
tags:
  - guion
  - ia
---

# Cómo medir el retrabajo

Texto del guion.
`;

describe("parseGuion", () => {
  it("saca el título del primer H1, no del slug", () => {
    expect(parseGuion("nota-suelta", CRUDO).titulo).toBe("Cómo medir el retrabajo");
  });

  it("cae al slug cuando el cuerpo no tiene H1", () => {
    expect(parseGuion("mi-guion", "---\nestado: borrador\n---\n\nsin encabezado").titulo).toBe(
      "mi-guion"
    );
  });

  it("traduce el vocabulario viejo a la etapa canónica", () => {
    expect(parseGuion("g", CRUDO).estado).toBe("en_proceso"); // grabado → en_proceso
    expect(parseGuion("g", "---\nestado: por_grabar\n---\n").estado).toBe("por_hacer");
    expect(parseGuion("g", "---\nestado: editado\n---\n").estado).toBe("producido");
  });

  it("respeta una etapa que ya es canónica", () => {
    expect(parseGuion("g", "---\nestado: producido\n---\n").estado).toBe("producido");
    expect(parseGuion("g", "---\nestado: revision\n---\n").estado).toBe("revision");
  });

  it("cae a borrador si la etapa es desconocida o falta", () => {
    expect(parseGuion("g", "---\nestado: inventada\n---\n").estado).toBe("borrador");
    expect(parseGuion("g", "sin frontmatter").estado).toBe("borrador");
  });

  it("convierte palabras_objetivo y métricas a número (o null)", () => {
    const g = parseGuion("g", CRUDO);
    expect(g.palabras_objetivo).toBe(80);
    expect(g.metricas).toEqual({ views: 1200, saves: null, shares: 30 });
  });

  it("normaliza los campos vacíos a cadena, nunca a undefined", () => {
    const g = parseGuion("g", CRUDO);
    expect(g.fecha_produccion).toBe("");
    expect(g.persona_audiencia).toBe("Directora de operaciones");
    expect(g.cta).toBe("valor");
    // Ojo: una fecha escrita a mano SIN comillas en el .md la lee YAML como Date y sale
    // como texto de fecha completo. Lo que escribe la app siempre va entrecomillado.
    expect(typeof g.fecha_grabacion).toBe("string");
    expect(parseGuion("g", `---\nfecha_grabacion: "2026-08-10"\n---\n`).fecha_grabacion).toBe(
      "2026-08-10"
    );
  });

  it("cta por defecto es 'valor'", () => {
    expect(parseGuion("g", "---\nestado: borrador\n---\n").cta).toBe("valor");
  });

  it("acepta tags como lista o como texto suelto", () => {
    expect(parseGuion("g", CRUDO).tags).toEqual(["guion", "ia"]);
    expect(parseGuion("g", "---\ntags: guion\n---\n").tags).toEqual(["guion"]);
    expect(parseGuion("g", "---\nestado: borrador\n---\n").tags).toEqual([]);
  });

  it("el cuerpo no lleva frontmatter y viene sin espacios sobrantes", () => {
    const { cuerpo } = parseGuion("g", CRUDO);
    expect(cuerpo).not.toContain("ticket:");
    expect(cuerpo.startsWith("# Cómo medir")).toBe(true);
    expect(cuerpo.endsWith("Texto del guion.")).toBe(true);
  });
});

describe("applyPatch", () => {
  it("cambia solo lo parcheado y conserva el resto del frontmatter", () => {
    const out = applyPatch(CRUDO, { estado: "producido" });
    const g = parseGuion("g", out);
    expect(g.estado).toBe("producido");
    expect(g.ticket).toBe("INT-0431");
    expect(g.responsable).toBe("Ana");
    expect(g.pilar).toBe("casos");
  });

  it("guarda palabras_objetivo como número, no como texto", () => {
    const out = applyPatch(CRUDO, { palabras_objetivo: "116" });
    expect(out).toMatch(/palabras_objetivo:\s*116\s*$/m);
    expect(out).not.toMatch(/palabras_objetivo:\s*['"]116['"]/);
    expect(parseGuion("g", out).palabras_objetivo).toBe(116);
  });

  it("un numérico vacío o no numérico queda en blanco, no en NaN", () => {
    expect(parseGuion("g", applyPatch(CRUDO, { palabras_objetivo: "" })).palabras_objetivo).toBe(
      null
    );
    expect(
      parseGuion("g", applyPatch(CRUDO, { palabras_objetivo: "muchas" })).palabras_objetivo
    ).toBe(null);
  });

  it("un texto vacío borra el campo en vez de escribir 'null'", () => {
    const out = applyPatch(CRUDO, { responsable: "" });
    expect(out).not.toContain("responsable: null");
    expect(parseGuion("g", out).responsable).toBe("");
  });

  it("ignora las claves con undefined en vez de borrarlas", () => {
    const out = applyPatch(CRUDO, { responsable: undefined, estado: "por_hacer" });
    expect(parseGuion("g", out).responsable).toBe("Ana");
    expect(parseGuion("g", out).estado).toBe("por_hacer");
  });

  it("reemplaza el cuerpo solo si se pasa uno", () => {
    expect(parseGuion("g", applyPatch(CRUDO, {}, "# Otro\n\nnuevo")).cuerpo).toBe(
      "# Otro\n\nnuevo"
    );
    expect(parseGuion("g", applyPatch(CRUDO, {})).cuerpo).toContain("Texto del guion.");
  });
});

describe("slugSeguro", () => {
  it("deja pasar un nombre de guion normal, con acentos y espacios", () => {
    expect(slugSeguro("Cómo medir el retrabajo 2")).toBe("Cómo medir el retrabajo 2");
    expect(slugSeguro("  INT-0431  ")).toBe("INT-0431");
  });

  for (const malo of [
    "../.env",
    "../../etc/passwd",
    "sub/carpeta",
    "sub\\carpeta",
    ".oculto",
    "",
    "   ",
    "a".repeat(201),
  ]) {
    it(`rechaza ${JSON.stringify(malo)}`, () => {
      expect(() => slugSeguro(malo)).toThrow();
    });
  }

  it("rechaza bytes de control (corta rutas con nul)", () => {
    expect(() => slugSeguro(`guion${String.fromCharCode(0)}.md`)).toThrow();
  });
});

describe("newGuionRaw", () => {
  const PLANTILLA = "---\ntype: guion\nestado: borrador\n---\n\n# {{title}}\n";

  it("sustituye el título en la plantilla oficial", () => {
    expect(newGuionRaw("Mi guion", PLANTILLA)).toContain("# Mi guion");
  });

  it("mete el ticket justo debajo de type", () => {
    expect(newGuionRaw("Mi guion", PLANTILLA, "INT-0500")).toContain(
      "type: guion\nticket: INT-0500"
    );
  });

  it("falla si no hay plantilla, en vez de inventarse una", () => {
    expect(() => newGuionRaw("Mi guion", null)).toThrow(/plantilla/i);
    expect(() => newGuionRaw("Mi guion", "   ")).toThrow(/plantilla/i);
  });
});
