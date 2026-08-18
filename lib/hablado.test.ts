import { describe, it, expect } from "vitest";
import { soloHablado, contarPalabras } from "./hablado";

const GUION = `# Cómo medir el retrabajo

## 🎣 HOOKS (elige 1 al grabar)
> 8-12 palabras. Cero preámbulo.
1. Tu equipo repite trabajo y nadie lo mide. *(9)*

## 🎬 GUION HABLADO (leer en voz alta con cronómetro)

> Patrón de valor: problema → dato → acción.

| t | beat | texto a decir | pal. |
|---|---|---|---|
| 0-2 s | **hook** | Nadie mide el retrabajo. | 4 |
| 2-6 s | contexto | Y se lleva un tercio del mes. | 7 |

**Total: 11 / 80 palabras objetivo**

## ⭐ El valor, desglosado
1. Un punto que solo sirve para escribir.

## 📚 Fuentes
- Informe interno 2026.

---

### Producción
- **Caption:** algo para el post.
`;

describe("soloHablado", () => {
  const salida = soloHablado(GUION);

  it("conserva lo que se dice en cámara", () => {
    expect(salida).toContain("Nadie mide el retrabajo.");
    expect(salida).toContain("Y se lleva un tercio del mes.");
    expect(salida).toContain("Tu equipo repite trabajo y nadie lo mide.");
  });

  it("quita las secciones que no se dicen", () => {
    expect(salida).not.toContain("Fuentes");
    expect(salida).not.toContain("Informe interno 2026");
    expect(salida).not.toContain("Producción");
    expect(salida).not.toContain("Caption");
    expect(salida).not.toContain("El valor, desglosado");
    expect(salida).not.toContain("solo sirve para escribir");
  });

  it("una sección fuera termina en el siguiente encabezado, no se come el resto", () => {
    const md = "## 📚 Fuentes\n- una fuente\n\n## Cierre\nEsto sí se dice.";
    const out = soloHablado(md);
    expect(out).toContain("Esto sí se dice.");
    expect(out).not.toContain("una fuente");
  });

  it("quita la nota del redactor pero deja las citas que sí se dicen", () => {
    expect(salida).not.toContain("Patrón de valor");
    expect(soloHablado("> Guarda esto para tu próxima reunión.")).toContain(
      "Guarda esto para tu próxima reunión."
    );
  });

  it("quita el control de palabras del redactor", () => {
    expect(salida).not.toContain("Total:");
    expect(salida).not.toContain("*(9)*");
  });

  it("reduce la tabla de beats a tiempo y texto", () => {
    expect(salida).toContain("| Momento | Qué dices |");
    expect(salida).toContain("| 0-2 s | Nadie mide el retrabajo. |");
    expect(salida).not.toContain("| pal. |");
    expect(salida).not.toContain("hook");
  });

  it("no vacía un guion de formato libre (los 22 sin encabezados)", () => {
    const libre = "Hola, hoy te cuento por qué medir el retrabajo cambia el mes.";
    expect(soloHablado(libre)).toBe(libre);
  });
});

describe("contarPalabras", () => {
  it("cuenta palabras, no caracteres ni marcas de markdown", () => {
    expect(contarPalabras("# Hola mundo")).toBe(2);
    expect(contarPalabras("**Tres** palabras *aquí*")).toBe(3);
  });

  it("no cuenta las marcas de tiempo de la tabla de beats", () => {
    expect(contarPalabras("| 0-2 s | Nadie mide el retrabajo. |")).toBe(4);
  });

  it("cuenta una sola vez las palabras con guion o apóstrofo", () => {
    expect(contarPalabras("copy-paste d'accord")).toBe(2);
  });

  it("un texto vacío cuenta cero", () => {
    expect(contarPalabras("")).toBe(0);
    expect(contarPalabras("---\n\n|---|---|")).toBe(0);
  });
});
