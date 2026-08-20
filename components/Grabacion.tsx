"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchGuion, patchGuion } from "@/lib/api";
import { ESTADO_LABEL, type Estado } from "@/lib/types";
import VistaGuion from "./VistaGuion";
import { SelectField } from "./fields";

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
type Fase = "modo" | "checklist" | "voz" | "guiones" | "subida";

type Guardado = {
  fase: Fase;
  modo: Modo | null;
  pasos: string[];
  voz: string;
  grabados: string[];
};

const CLAVE = "icc_grabacion";
const VACIO: Guardado = {
  fase: "modo",
  modo: null,
  pasos: [],
  voz: "",
  grabados: [],
};

type Paso = { id: string; texto: string; detalle?: string };

// Los pasos de prueba se desmarcan juntos cuando algo sale mal: no tiene sentido dar por
// buena la grabación de prueba si la revisión falló.
const PASOS_PRUEBA = ["prueba", "revision"];

const PASOS_ESTUDIO: Paso[] = [
  {
    id: "materiales",
    texto: "Materiales listos: luz principal, trípode y micrófono",
    detalle: "Comprueba que estén cargados y funcionando antes de empezar.",
  },
  {
    id: "encuadre",
    texto: "Teléfono en el trípode, en vertical, y quedas centrado en la toma",
  },
  { id: "microfono", texto: "Micrófono conectado al teléfono" },
  {
    id: "prueba",
    texto: "Prueba grabada: sentado, en el encuadre y con el micrófono puesto",
  },
  {
    id: "revision",
    texto: "Prueba revisada — el video y el audio se ven y se oyen bien",
  },
];

const PASOS_FUERA: Paso[] = [
  {
    id: "lugar",
    texto: "Lugar callado y bien iluminado",
    detalle:
      "No hace falta equipo de luz. Con estar en un sitio bien iluminado basta.",
  },
  { id: "prueba", texto: "Prueba grabada: sentado y en el encuadre" },
  {
    id: "revision",
    texto: "Prueba revisada — el video y el audio se ven y se oyen bien",
  },
];

const CIERRE_ESTUDIO: Paso[] = [
  { id: "cargar", texto: "Luz y micrófonos puestos a cargar" },
  { id: "limpiar", texto: "Todo limpio y en su sitio para el siguiente" },
];

/** Fecha local, no UTC: grabar a las 9 de la noche en Caracas no es mañana. */
function hoyLocal(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

const uniq = (xs: string[]) =>
  Array.from(new Set(xs.filter(Boolean))).sort();

export default function Grabacion({
  guiones,
  driveUrl,
}: {
  guiones: GuionListado[];
  driveUrl: string;
}) {
  const router = useRouter();
  const [s, setS] = useState<Guardado>(VACIO);
  const [listo, setListo] = useState(false); // evita pintar antes de leer localStorage
  const [abierto, setAbierto] = useState<string | null>(null);
  const [cuerpos, setCuerpos] = useState<Record<string, string>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cierre, setCierre] = useState<string[]>([]);

  // ── Memoria en el navegador ──────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(CLAVE);
      if (raw) setS({ ...VACIO, ...JSON.parse(raw) });
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
      // Modo incógnito o almacenamiento lleno: se pierde el progreso, no la función.
    }
  }, [s, listo]);

  const set = (parcial: Partial<Guardado>) =>
    setS((prev) => ({ ...prev, ...parcial }));

  // Alterna una casilla a partir del estado ANTERIOR, no del que capturó este render.
  // Con dos toques seguidos en un móvil, leer `s.pasos` del closure hace que el segundo
  // pise al primero y se pierda una marca.
  const alternarPaso = (id: string) =>
    setS((prev) => ({
      ...prev,
      pasos: prev.pasos.includes(id)
        ? prev.pasos.filter((x) => x !== id)
        : [...prev.pasos, id],
    }));

  const pasos = s.modo === "estudio" ? PASOS_ESTUDIO : PASOS_FUERA;
  const completa = pasos.every((p) => s.pasos.includes(p.id));

  const voces = useMemo(() => uniq(guiones.map((g) => g.voz)), [guiones]);

  // Un guion recién marcado se trata como grabado sin esperar a que el servidor
  // devuelva la lista actualizada.
  const estadoDe = (g: GuionListado): Estado =>
    s.grabados.includes(g.slug) ? "en_proceso" : g.estado;

  const mios = useMemo(
    () => guiones.filter((g) => g.voz === s.voz),
    [guiones, s.voz]
  );
  const listos = mios.filter((g) => estadoDe(g) === "por_hacer");
  const borradores = mios.filter((g) => estadoDe(g) === "borrador");
  const grabados = mios.filter((g) => estadoDe(g) === "en_proceso");

  async function abrir(slug: string) {
    if (abierto === slug) {
      setAbierto(null);
      return;
    }
    setAbierto(slug);
    if (cuerpos[slug] !== undefined) return;
    try {
      const g = await fetchGuion(slug);
      setCuerpos((prev) => ({
        ...prev,
        [slug]: (g.cuerpo || "").replace(/^#\s+.+\n/, ""),
      }));
    } catch (e) {
      setCuerpos((prev) => ({
        ...prev,
        [slug]: "_No se pudo cargar el guion. Recarga la página._",
      }));
    }
  }

  async function marcarGrabado(slug: string) {
    setGuardando(slug);
    setError(null);
    try {
      await patchGuion(slug, {
        estado: "en_proceso",
        fecha_grabacion: hoyLocal(),
      });
      setS((prev) => ({ ...prev, grabados: [...prev.grabados, slug] }));
      setAbierto(null);
      router.refresh();
    } catch (e) {
      // Si no se guardó, no se marca: es peor creer que quedó registrado y que no esté.
      setError(
        `No se pudo marcar como grabado: ${
          e instanceof Error ? e.message : "error"
        }. Vuelve a intentarlo.`
      );
    } finally {
      setGuardando(null);
    }
  }

  function empezarDeCero() {
    setS(VACIO);
    setAbierto(null);
    setCierre([]);
    setError(null);
  }

  if (!listo) return <div className="px-5 py-5" />;

  return (
    <div className="px-5 py-5 pb-24">
      <Encabezado fase={s.fase} modo={s.modo} onReset={empezarDeCero} />

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* ── 1 · Dónde grabas ────────────────────────────────────────────── */}
      {s.fase === "modo" && (
        <div>
          <h2 className="mb-1 text-lg font-semibold">¿Dónde vas a grabar?</h2>
          <p className="mb-4 text-sm text-slate-400">
            No siempre grabamos en el estudio, y la preparación cambia.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Tarjeta
              icono="🎬"
              titulo="En el estudio"
              texto="Con luz principal, trípode y micrófono."
              onClick={() => set({ modo: "estudio", fase: "checklist", pasos: [] })}
            />
            <Tarjeta
              icono="📍"
              titulo="Fuera del estudio"
              texto="En casa, en la oficina o de viaje."
              onClick={() => set({ modo: "fuera", fase: "checklist", pasos: [] })}
            />
          </div>
        </div>
      )}

      {/* ── 2 · Lista de verificación ───────────────────────────────────── */}
      {s.fase === "checklist" && (
        <div>
          <h2 className="mb-1 text-lg font-semibold">Antes de grabar</h2>
          <p className="mb-4 text-sm text-slate-400">
            Márcalo todo. Diez videos con el audio mal se descubren al editar, y
            entonces ya hay que repetirlos.
          </p>

          <div className="flex flex-col gap-2">
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

          <button
            onClick={() =>
              setS((prev) => ({
                ...prev,
                pasos: prev.pasos.filter((x) => !PASOS_PRUEBA.includes(x)),
              }))
            }
            className="mt-3 text-xs text-slate-400 underline decoration-dotted underline-offset-4 hover:text-slate-200"
          >
            Algo no quedó bien — repetir la prueba
          </button>

          <div className="mt-5 flex items-center gap-3">
            <button
              disabled={!completa}
              onClick={() => set({ fase: "voz" })}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
            >
              Todo listo — vamos a grabar
            </button>
            <button
              onClick={() => set({ fase: "modo" })}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
            >
              Atrás
            </button>
            {!completa && (
              <span className="text-xs text-slate-500">
                Faltan {pasos.length - s.pasos.filter((x) => pasos.some((p) => p.id === x)).length} pasos
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── 3 · Quién eres ──────────────────────────────────────────────── */}
      {s.fase === "voz" && (
        <div className="max-w-sm">
          <h2 className="mb-1 text-lg font-semibold">¿Quién eres?</h2>
          <p className="mb-4 text-sm text-slate-400">
            Sirve para mostrarte solo los guiones escritos para tu voz.
          </p>
          <SelectField
            label="Tu voz"
            value={s.voz}
            onChange={(v) => set({ voz: v })}
            options={voces.map((v) => [v, v] as const)}
            placeholder="Elige tu voz…"
          />
          <div className="mt-5 flex items-center gap-3">
            <button
              disabled={!s.voz}
              onClick={() => set({ fase: "guiones" })}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
            >
              Ver mis guiones
            </button>
            <button
              onClick={() => set({ fase: "checklist" })}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
            >
              Atrás
            </button>
          </div>
        </div>
      )}

      {/* ── 4 · Los guiones ─────────────────────────────────────────────── */}
      {s.fase === "guiones" && (
        <div>
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Guiones de {s.voz}</h2>
              <p className="text-sm text-slate-400">
                Ábrelos uno por uno. Al terminar cada video, márcalo como grabado.
              </p>
            </div>
            <button
              onClick={() => set({ fase: "voz" })}
              className="text-xs text-slate-400 underline decoration-dotted underline-offset-4 hover:text-slate-200"
            >
              No soy {s.voz}
            </button>
          </div>

          <Grupo
            titulo="Listos para grabar"
            items={listos}
            vacio="No hay guiones aprobados para tu voz ahora mismo. Mira los borradores de abajo."
            abierto={abierto}
            cuerpos={cuerpos}
            guardando={guardando}
            onAbrir={abrir}
            onGrabado={marcarGrabado}
            defaultOpen
          />

          <Grupo
            titulo="Borradores — aún sin aprobar"
            aviso="Todavía no han pasado revisión editorial. Confírmalo con Marketing antes de grabarlos."
            items={borradores}
            abierto={abierto}
            cuerpos={cuerpos}
            guardando={guardando}
            onAbrir={abrir}
            onGrabado={marcarGrabado}
          />

          <Grupo
            titulo="Ya grabados"
            aviso="Están esperando edición. No hace falta volver a grabarlos."
            items={grabados}
            abierto={abierto}
            cuerpos={cuerpos}
            guardando={guardando}
            onAbrir={abrir}
            onGrabado={marcarGrabado}
            soloLectura
          />

          {/* El botón de terminar va fuera de la lista, siempre a la vista. */}
          <div className="fixed inset-x-0 bottom-0 border-t border-line bg-panel/95 px-5 py-3 backdrop-blur md:left-60">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-400">
                {s.grabados.length === 0
                  ? "Aún no has marcado ninguno"
                  : `${s.grabados.length} grabado${s.grabados.length === 1 ? "" : "s"} en esta sesión`}
              </span>
              <button
                onClick={() => set({ fase: "subida" })}
                className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90"
              >
                He terminado de grabar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 5 · Subir el material ───────────────────────────────────────── */}
      {s.fase === "subida" && (
        <div className="max-w-2xl">
          <h2 className="mb-1 text-lg font-semibold">Sube lo que grabaste</h2>
          <p className="mb-4 text-sm text-slate-400">
            Hasta que el material no esté en Drive, Marketing no puede editarlo.
          </p>

          {s.grabados.length > 0 && (
            <div className="mb-4 rounded-xl border border-line bg-panel/40 p-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-slate-400">
                Grabaste {s.grabados.length}
              </div>
              <ul className="flex flex-col gap-1 text-sm text-slate-300">
                {s.grabados.map((slug) => (
                  <li key={slug}>
                    ✓ {guiones.find((g) => g.slug === slug)?.titulo || slug}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-xl border border-line bg-panel p-4">
            <p className="mb-3 text-sm text-slate-300">
              Abre la carpeta compartida y busca dentro la que lleva tu cargo:{" "}
              <strong className="text-white">{s.voz}</strong>. Sube ahí los
              videos.
            </p>
            {driveUrl ? (
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90"
              >
                Abrir la carpeta de Drive ↗
              </a>
            ) : (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
                Falta configurar <code>DRIVE_GRABACIONES_URL</code> en el
                entorno. Pídeselo al CMO y sube el material a la carpeta
                compartida mientras tanto.
              </div>
            )}
          </div>

          {s.modo === "estudio" && (
            <div className="mt-5">
              <h3 className="mb-1 text-sm font-semibold">
                Antes de irte del estudio
              </h3>
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

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={empezarDeCero}
              className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90"
            >
              Terminar
            </button>
            <button
              onClick={() => set({ fase: "guiones" })}
              className="rounded-lg border border-line px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
            >
              Volver a los guiones
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Piezas ─────────────────────────────────────────────────────────────── */

const FASES: { id: Fase; label: string }[] = [
  { id: "modo", label: "Dónde" },
  { id: "checklist", label: "Preparación" },
  { id: "voz", label: "Quién" },
  { id: "guiones", label: "Grabar" },
  { id: "subida", label: "Subir" },
];

function Encabezado({
  fase,
  modo,
  onReset,
}: {
  fase: Fase;
  modo: Modo | null;
  onReset: () => void;
}) {
  const i = FASES.findIndex((f) => f.id === fase);
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Grabar</h1>
          <p className="text-sm text-slate-400">
            El proceso de principio a fin.
            {modo === "estudio" && " Estás en el estudio."}
            {modo === "fuera" && " Estás grabando fuera del estudio."}
          </p>
        </div>
        {fase !== "modo" && (
          <button
            onClick={onReset}
            className="whitespace-nowrap text-xs text-slate-400 underline decoration-dotted underline-offset-4 hover:text-slate-200"
          >
            Empezar de nuevo
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {FASES.map((f, n) => (
          <span
            key={f.id}
            className={`rounded-full px-2.5 py-0.5 text-[11px] ${
              n === i
                ? "bg-brand/15 font-medium text-brand"
                : n < i
                  ? "text-slate-400"
                  : "text-slate-600"
            }`}
          >
            {n < i ? "✓" : n + 1} {f.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Tarjeta({
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
      <div className="mb-2 text-2xl">{icono}</div>
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
      className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
        marcado
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-line bg-panel/40 hover:bg-white/5"
      }`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
          marcado
            ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
            : "border-line text-slate-500"
        }`}
      >
        {marcado ? "✓" : n}
      </span>
      <span>
        <span
          className={`block text-sm ${marcado ? "text-slate-400 line-through" : "text-slate-200"}`}
        >
          {paso.texto}
        </span>
        {paso.detalle && (
          <span className="block text-xs text-slate-500">{paso.detalle}</span>
        )}
      </span>
    </button>
  );
}

function Grupo({
  titulo,
  aviso,
  vacio,
  items,
  abierto,
  cuerpos,
  guardando,
  onAbrir,
  onGrabado,
  defaultOpen = false,
  soloLectura = false,
}: {
  titulo: string;
  aviso?: string;
  vacio?: string;
  items: GuionListado[];
  abierto: string | null;
  cuerpos: Record<string, string>;
  guardando: string | null;
  onAbrir: (slug: string) => void;
  onGrabado: (slug: string) => void;
  defaultOpen?: boolean;
  soloLectura?: boolean;
}) {
  const [desplegado, setDesplegado] = useState(defaultOpen);
  if (items.length === 0 && !vacio) return null;

  return (
    <section className="mb-4">
      <button
        onClick={() => setDesplegado((v) => !v)}
        className="mb-2 flex w-full items-center gap-2 text-left"
      >
        <span className="text-xs text-slate-500">{desplegado ? "▾" : "▸"}</span>
        <span className="text-sm font-medium">{titulo}</span>
        <span className="rounded-full bg-slate-700/40 px-2 text-xs text-slate-300">
          {items.length}
        </span>
      </button>

      {desplegado && (
        <>
          {aviso && items.length > 0 && (
            <p className="mb-2 text-xs text-slate-500">{aviso}</p>
          )}
          {items.length === 0 ? (
            <p className="rounded-xl border border-line bg-panel/40 p-4 text-sm text-slate-500">
              {vacio}
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {items.map((g) => (
                <div
                  key={g.slug}
                  className="rounded-xl border border-line bg-panel/40"
                >
                  <button
                    onClick={() => onAbrir(g.slug)}
                    className="flex w-full items-start justify-between gap-3 p-3 text-left"
                  >
                    <span>
                      <span className="block text-sm text-slate-200">
                        {g.titulo}
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">
                        {[
                          g.slug,
                          g.duracion,
                          g.palabras_objetivo
                            ? `${g.palabras_objetivo} palabras`
                            : null,
                          g.plataforma,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </span>
                    </span>
                    <span className="mt-0.5 shrink-0 text-xs text-slate-500">
                      {abierto === g.slug ? "Cerrar" : "Abrir"}
                    </span>
                  </button>

                  {abierto === g.slug && (
                    <div className="border-t border-line p-3">
                      {cuerpos[g.slug] === undefined ? (
                        <p className="text-sm text-slate-500">Cargando…</p>
                      ) : (
                        <VistaGuion cuerpo={cuerpos[g.slug]} />
                      )}
                      {!soloLectura && (
                        <button
                          onClick={() => onGrabado(g.slug)}
                          disabled={guardando === g.slug}
                          className="mt-3 rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
                        >
                          {guardando === g.slug
                            ? "Guardando…"
                            : "✓ Ya lo grabé"}
                        </button>
                      )}
                      {soloLectura && (
                        <p className="mt-3 text-xs text-slate-500">
                          Marcado como {ESTADO_LABEL.en_proceso.toLowerCase()}.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
