"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchGuion, patchGuion } from "@/lib/api";
import type { Estado } from "@/lib/types";
import VistaGuion from "./VistaGuion";

/** Lo que la página servidor manda: la lista sin el markdown de cada guion. */
export type GuionListado = {
  slug: string;
  titulo: string;
  estado: Estado;
  voz: string;
  duracion: string;
  plataforma: string;
  palabras_objetivo: number | null;
};

type Modo = "estudio" | "fuera";
type Fase = "modo" | "checklist" | "grabar" | "subida";

type Guardado = {
  fase: Fase;
  modo: Modo | null;
  pasos: string[];
  voz: string;
  grabados: string[];
};

const CLAVE = "icc_grabacion";
const VACIO: Guardado = { fase: "modo", modo: null, pasos: [], voz: "", grabados: [] };

type Paso = { id: string; texto: string; pista?: string };

// Los pasos de prueba se desmarcan juntos: no tiene sentido dar por buena la grabación
// de prueba si la revisión falló.
const PASOS_PRUEBA = ["prueba", "revision"];

const PASOS_ESTUDIO: Paso[] = [
  {
    id: "materiales",
    texto: "Luz, trípode y micrófono listos",
    pista: "Cargados y encendiendo bien",
  },
  { id: "encuadre", texto: "Teléfono en el trípode, vertical y tú centrado" },
  { id: "microfono", texto: "Micrófono conectado" },
  { id: "prueba", texto: "Prueba grabada, sentado y con el micrófono" },
  { id: "revision", texto: "Prueba revisada: se ve y se oye bien" },
];

const PASOS_FUERA: Paso[] = [
  {
    id: "lugar",
    texto: "Sitio callado y bien iluminado",
    pista: "No hace falta equipo de luz",
  },
  { id: "prueba", texto: "Prueba grabada, sentado y en el encuadre" },
  { id: "revision", texto: "Prueba revisada: se ve y se oye bien" },
];

const CIERRE_ESTUDIO: Paso[] = [
  { id: "cargar", texto: "Luz y micrófonos a cargar" },
  { id: "limpiar", texto: "Todo limpio y en su sitio" },
];

const FASES: { id: Fase; label: string }[] = [
  { id: "modo", label: "Dónde" },
  { id: "checklist", label: "Preparación" },
  { id: "grabar", label: "Grabar" },
  { id: "subida", label: "Subir" },
];

/** Fecha local, no UTC: grabar a las 9 de la noche en Caracas no es mañana. */
function hoyLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

/** Parte del histórico llegó con la extensión pegada al nombre. No se toca el dato:
 *  solo se limpia al mostrarlo, que es donde molesta. */
const limpiarTitulo = (t: string) => t.replace(/\.md$/i, "").trim();

const BTN =
  "rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand/90 disabled:opacity-40";
const BTN2 =
  "rounded-lg border border-line px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5";
const SUTIL =
  "text-xs text-slate-500 underline decoration-dotted underline-offset-4 transition hover:text-slate-300";

export default function Grabacion({
  guiones,
  driveUrl,
}: {
  guiones: GuionListado[];
  driveUrl: string;
}) {
  const router = useRouter();
  const [s, setS] = useState<Guardado>(VACIO);
  const [listo, setListo] = useState(false);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [cuerpos, setCuerpos] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cierre, setCierre] = useState<string[]>([]);
  const [verOtros, setVerOtros] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLAVE);
      if (raw) {
        const g = { ...VACIO, ...JSON.parse(raw) } as Guardado;
        // Quien ya usó el tab tiene guardada una fase de una versión anterior. Si no la
        // reconocemos, se empieza de cero en vez de romper la pantalla al cargar.
        if (!FASES.some((f) => f.id === g.fase)) g.fase = VACIO.fase;
        if (g.fase !== "modo" && g.modo !== "estudio" && g.modo !== "fuera") {
          g.fase = "modo";
          g.modo = null;
        }
        setS(g);
      }
    } catch {
      // Un progreso corrupto no debe impedir grabar: se empieza de cero.
    }
    setListo(true);
  }, []);

  useEffect(() => {
    if (!listo) return;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(s));
    } catch {
      // Incógnito o almacenamiento lleno: se pierde el progreso, no la función.
    }
  }, [s, listo]);

  const set = (p: Partial<Guardado>) => setS((prev) => ({ ...prev, ...p }));

  // Todas las transiciones parten del estado ANTERIOR: dos toques seguidos en un móvil
  // leyendo el closure hacen que el segundo pise al primero y se pierda una marca.
  const alternarPaso = (id: string) =>
    setS((prev) => ({
      ...prev,
      pasos: prev.pasos.includes(id)
        ? prev.pasos.filter((x) => x !== id)
        : [...prev.pasos, id],
    }));

  const pasos = s.modo === "estudio" ? PASOS_ESTUDIO : PASOS_FUERA;
  const faltan = pasos.filter((p) => !s.pasos.includes(p.id)).length;

  const voces = useMemo(
    () => Array.from(new Set(guiones.map((g) => g.voz).filter(Boolean))).sort(),
    [guiones]
  );

  const estadoDe = (g: GuionListado): Estado =>
    s.grabados.includes(g.slug) ? "en_proceso" : g.estado;

  const mios = useMemo(
    () => guiones.filter((g) => g.voz === s.voz),
    [guiones, s.voz]
  );
  const listos = mios.filter((g) => estadoDe(g) === "por_hacer");
  const borradores = mios.filter((g) => estadoDe(g) === "borrador");
  const yaGrabados = mios.filter((g) => estadoDe(g) === "en_proceso");

  async function abrir(slug: string) {
    if (abierto === slug) return setAbierto(null);
    setAbierto(slug);
    if (cuerpos[slug] !== undefined) return;
    try {
      const g = await fetchGuion(slug);
      setCuerpos((p) => ({
        ...p,
        [slug]: (g.cuerpo || "").replace(/^#\s+.+\n/, ""),
      }));
    } catch {
      setCuerpos((p) => ({
        ...p,
        [slug]: "_No se pudo cargar el guion. Recarga la página._",
      }));
    }
  }

  async function marcarGrabado(slug: string) {
    setGuardando(slug);
    setError(null);
    try {
      await patchGuion(slug, { estado: "en_proceso", fecha_grabacion: hoyLocal() });
      setS((prev) => ({ ...prev, grabados: [...prev.grabados, slug] }));
      setAbierto(null);
      router.refresh();
    } catch (e) {
      // Si no se guardó, no se marca: es peor creer que quedó registrado y que no esté.
      setError(
        `No se pudo guardar: ${e instanceof Error ? e.message : "error"}. Inténtalo otra vez.`
      );
    } finally {
      setGuardando(null);
    }
  }

  function empezarDeCero() {
    setS(VACIO);
    setAbierto(null);
    setCierre([]);
    setVerOtros(false);
    setError(null);
  }

  if (!listo) return <div className="px-5 py-6" />;

  const iFase = FASES.findIndex((f) => f.id === s.fase);

  return (
    <div className="mx-auto max-w-2xl px-5 py-6 pb-28">
      {/* Progreso — una línea, sin competir con el contenido */}
      <div className="mb-6">
        <div className="mb-2 flex gap-1">
          {FASES.map((f, n) => (
            <span
              key={f.id}
              className={`h-1 flex-1 rounded-full ${
                n <= iFase ? "bg-brand" : "bg-line"
              }`}
            />
          ))}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-xs text-slate-500">
            Paso {iFase + 1} de {FASES.length} · {FASES[iFase].label}
            {s.modo === "estudio" && " · en el estudio"}
            {s.modo === "fuera" && " · fuera del estudio"}
          </span>
          {s.fase !== "modo" && (
            <button onClick={empezarDeCero} className={SUTIL}>
              Empezar de nuevo
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* ── 1 · Dónde ──────────────────────────────────────────────────── */}
      {s.fase === "modo" && (
        <>
          <h1 className="mb-6 text-2xl font-semibold">¿Dónde vas a grabar?</h1>
          <div className="grid gap-3 sm:grid-cols-2">
            <Opcion
              icono="🎬"
              titulo="En el estudio"
              texto="Luz, trípode y micrófono"
              onClick={() => set({ modo: "estudio", fase: "checklist", pasos: [] })}
            />
            <Opcion
              icono="📍"
              titulo="En otro sitio"
              texto="Casa, oficina o viaje"
              onClick={() => set({ modo: "fuera", fase: "checklist", pasos: [] })}
            />
          </div>
        </>
      )}

      {/* ── 2 · Preparación ────────────────────────────────────────────── */}
      {s.fase === "checklist" && (
        <>
          <h1 className="mb-1 text-2xl font-semibold">Antes de grabar</h1>
          <p className="mb-5 text-sm text-slate-400">
            Toca cada punto cuando lo tengas.
          </p>

          <div className="mb-4 flex flex-col gap-2">
            {pasos.map((p, i) => (
              <Casilla
                key={p.id}
                n={i + 1}
                paso={p}
                marcado={s.pasos.includes(p.id)}
                onToggle={() => alternarPaso(p.id)}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              disabled={faltan > 0}
              onClick={() => set({ fase: "grabar" })}
              className={BTN}
            >
              {faltan > 0 ? `Faltan ${faltan}` : "Empezar a grabar"}
            </button>
            <button onClick={() => set({ fase: "modo" })} className={BTN2}>
              Atrás
            </button>
            <button
              onClick={() =>
                setS((prev) => ({
                  ...prev,
                  pasos: prev.pasos.filter((x) => !PASOS_PRUEBA.includes(x)),
                }))
              }
              className={`${SUTIL} ml-auto`}
            >
              Repetir la prueba
            </button>
          </div>
        </>
      )}

      {/* ── 3 · Grabar ─────────────────────────────────────────────────── */}
      {s.fase === "grabar" && !s.voz && (
        <>
          <h1 className="mb-1 text-2xl font-semibold">¿Quién eres?</h1>
          <p className="mb-5 text-sm text-slate-400">
            Para mostrarte solo tus guiones.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {voces.map((v) => (
              <button
                key={v}
                onClick={() => set({ voz: v })}
                className="rounded-xl border border-line bg-panel px-4 py-3 text-left text-sm transition hover:border-brand/60 hover:bg-brand/5"
              >
                {v}
              </button>
            ))}
          </div>
          <button
            onClick={() => set({ fase: "checklist" })}
            className={`${SUTIL} mt-5 inline-block`}
          >
            Atrás
          </button>
        </>
      )}

      {s.fase === "grabar" && s.voz && (
        <>
          <div className="mb-5 flex items-baseline justify-between gap-3">
            <h1 className="text-2xl font-semibold">{s.voz}</h1>
            <button onClick={() => set({ voz: "" })} className={SUTIL}>
              No soy yo
            </button>
          </div>

          {listos.length === 0 && borradores.length === 0 ? (
            <p className="rounded-xl border border-line bg-panel/40 p-5 text-sm text-slate-400">
              No hay guiones para esta voz ahora mismo.
            </p>
          ) : (
            <Lista
              items={listos.length > 0 ? listos : borradores}
              nota={
                listos.length === 0
                  ? "Ninguno está aprobado todavía. Confírmalo con Marketing antes de grabarlos."
                  : undefined
              }
              abierto={abierto}
              cuerpos={cuerpos}
              guardando={guardando}
              onAbrir={abrir}
              onGrabado={marcarGrabado}
            />
          )}

          {/* Lo secundario, detrás de un toque: borradores y lo ya grabado */}
          {(listos.length > 0 && borradores.length > 0) || yaGrabados.length > 0 ? (
            <div className="mt-5">
              <button onClick={() => setVerOtros((v) => !v)} className={SUTIL}>
                {verOtros ? "Ocultar" : "Ver"} borradores y grabados
              </button>
              {verOtros && (
                <div className="mt-3 flex flex-col gap-5">
                  {listos.length > 0 && borradores.length > 0 && (
                    <Lista
                      titulo="Borradores"
                      nota="Aún sin aprobar por Marketing."
                      items={borradores}
                      abierto={abierto}
                      cuerpos={cuerpos}
                      guardando={guardando}
                      onAbrir={abrir}
                      onGrabado={marcarGrabado}
                    />
                  )}
                  {yaGrabados.length > 0 && (
                    <Lista
                      titulo="Ya grabados"
                      nota="Esperando edición."
                      items={yaGrabados}
                      abierto={abierto}
                      cuerpos={cuerpos}
                      guardando={guardando}
                      onAbrir={abrir}
                      onGrabado={marcarGrabado}
                      soloLectura
                    />
                  )}
                </div>
              )}
            </div>
          ) : null}

          {/* Fuera de la lista, siempre a la vista */}
          <div className="fixed inset-x-0 bottom-0 border-t border-line bg-panel/95 px-5 py-3 backdrop-blur md:left-60">
            <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
              <span className="text-sm text-slate-400">
                {s.grabados.length} grabado{s.grabados.length === 1 ? "" : "s"}
              </span>
              <button onClick={() => set({ fase: "subida" })} className={BTN}>
                Terminé de grabar
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── 4 · Subir ──────────────────────────────────────────────────── */}
      {s.fase === "subida" && (
        <>
          <h1 className="mb-1 text-2xl font-semibold">Sube lo que grabaste</h1>
          <p className="mb-5 text-sm text-slate-400">
            Hasta que no esté en Drive, Marketing no puede editarlo.
          </p>

          <div className="mb-5 rounded-xl border border-line bg-panel p-5">
            <p className="mb-4 text-sm text-slate-300">
              Dentro de la carpeta compartida, busca la que se llama{" "}
              <strong className="text-white">{s.voz}</strong> y sube ahí los
              videos.
            </p>
            {driveUrl ? (
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${BTN} inline-block`}
              >
                Abrir la carpeta de Drive ↗
              </a>
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                Falta la variable <code>DRIVE_GRABACIONES_URL</code>. Se
                configura en Vercel → Settings → Environment Variables, y hay
                que <strong>volver a desplegar</strong> para que aplique.
                Mientras tanto, sube el material a la carpeta compartida del
                equipo.
              </div>
            )}
          </div>

          {s.grabados.length > 0 && (
            <div className="mb-5">
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                Grabaste {s.grabados.length}
              </div>
              <ul className="flex flex-col gap-1 text-sm text-slate-400">
                {s.grabados.map((slug) => (
                  <li key={slug}>
                    ✓{" "}
                    {limpiarTitulo(
                      guiones.find((g) => g.slug === slug)?.titulo || slug
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {s.modo === "estudio" && (
            <div className="mb-6">
              <h2 className="mb-1 text-sm font-semibold">
                Antes de irte del estudio
              </h2>
              <p className="mb-3 text-sm text-slate-400">
                El siguiente que entre depende de esto.
              </p>
              <div className="flex flex-col gap-2">
                {CIERRE_ESTUDIO.map((p, i) => (
                  <Casilla
                    key={p.id}
                    n={i + 1}
                    paso={p}
                    marcado={cierre.includes(p.id)}
                    onToggle={() =>
                      setCierre((prev) =>
                        prev.includes(p.id)
                          ? prev.filter((x) => x !== p.id)
                          : [...prev, p.id]
                      )
                    }
                  />
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={empezarDeCero} className={BTN}>
              Terminar
            </button>
            <button onClick={() => set({ fase: "grabar" })} className={BTN2}>
              Volver a los guiones
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Piezas ─────────────────────────────────────────────────────────────── */

function Opcion({
  icono,
  titulo,
  texto,
  onClick,
}: {
  icono: string;
  titulo: string;
  texto: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-xl border border-line bg-panel p-5 text-left transition hover:border-brand/60 hover:bg-brand/5"
    >
      <div className="mb-3 text-3xl">{icono}</div>
      <div className="font-medium">{titulo}</div>
      <div className="text-sm text-slate-400">{texto}</div>
    </button>
  );
}

function Casilla({
  n,
  paso,
  marcado,
  onToggle,
}: {
  n: number;
  paso: Paso;
  marcado: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 rounded-xl border p-4 text-left transition ${
        marcado
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-line bg-panel/40 hover:bg-white/5"
      }`}
    >
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
          marcado
            ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
            : "border-line text-slate-500"
        }`}
      >
        {marcado ? "✓" : n}
      </span>
      <span className="min-w-0">
        <span
          className={`block text-sm ${
            marcado ? "text-slate-500 line-through" : "text-slate-100"
          }`}
        >
          {paso.texto}
        </span>
        {paso.pista && !marcado && (
          <span className="block text-xs text-slate-500">{paso.pista}</span>
        )}
      </span>
    </button>
  );
}

function Lista({
  titulo,
  nota,
  items,
  abierto,
  cuerpos,
  guardando,
  onAbrir,
  onGrabado,
  soloLectura = false,
}: {
  titulo?: string;
  nota?: string;
  items: GuionListado[];
  abierto: string | null;
  cuerpos: Record<string, string>;
  guardando: string | null;
  onAbrir: (slug: string) => void;
  onGrabado: (slug: string) => void;
  soloLectura?: boolean;
}) {
  return (
    <section>
      {titulo && (
        <h2 className="mb-1 text-sm font-semibold text-slate-300">
          {titulo}{" "}
          <span className="font-normal text-slate-500">({items.length})</span>
        </h2>
      )}
      {nota && <p className="mb-2 text-xs text-slate-500">{nota}</p>}

      <div className="flex flex-col gap-2">
        {items.map((g) => (
          <div key={g.slug} className="rounded-xl border border-line bg-panel/40">
            <button
              onClick={() => onAbrir(g.slug)}
              className="flex w-full items-center gap-3 p-4 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-slate-100">
                  {limpiarTitulo(g.titulo)}
                </span>
                <span className="mt-0.5 block text-xs text-slate-500">
                  {[g.duracion, g.plataforma].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="shrink-0 text-slate-500">
                {abierto === g.slug ? "▾" : "▸"}
              </span>
            </button>

            {abierto === g.slug && (
              <div className="border-t border-line p-4">
                {cuerpos[g.slug] === undefined ? (
                  <p className="text-sm text-slate-500">Cargando…</p>
                ) : (
                  <VistaGuion cuerpo={cuerpos[g.slug]} />
                )}
                {soloLectura ? (
                  <p className="mt-4 text-xs text-slate-500">
                    Ya está grabado, esperando edición.
                  </p>
                ) : (
                  <button
                    onClick={() => onGrabado(g.slug)}
                    disabled={guardando === g.slug}
                    className={`${BTN} mt-4`}
                  >
                    {guardando === g.slug ? "Guardando…" : "✓ Ya lo grabé"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
