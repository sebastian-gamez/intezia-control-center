"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import VistaGuion from "./VistaGuion";
import type { Guion } from "@/lib/types";
import { contarPalabras, soloHablado } from "@/lib/hablado";
import {
  fetchGuion,
  patchGuion,
  removeGuion,
  duplicateGuion,
} from "@/lib/api";
import ProductionFields, {
  toMetaForm,
  type MetaForm,
} from "./ProductionFields";

type Ctx = { open: (slug: string) => void; close: () => void };
const ModalContext = createContext<Ctx>({ open: () => {}, close: () => {} });
export const useGuionModal = () => useContext(ModalContext);

export default function GuionModalProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [slug, setSlug] = useState<string | null>(null);
  const [guion, setGuion] = useState<Guion | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"editar" | "vista">("vista");
  const [body, setBody] = useState("");
  const [form, setForm] = useState<MetaForm>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const open = useCallback((s: string) => {
    setSlug(s);
    setSaved(false);
    setTab("vista");
  }, []);
  const close = useCallback(() => {
    setSlug(null);
    setGuion(null);
  }, []);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchGuion(slug)
      .then((g) => {
        setGuion(g);
        setBody(g.cuerpo);
        setForm(toMetaForm(g));
      })
      .catch((e) => toast.error(`No se pudo abrir el guion: ${msg(e)}`))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    if (slug) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slug, close]);

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function save() {
    if (!slug) return;
    setSaving(true);
    try {
      const r = await patchGuion(slug, { ...form, cuerpo: body });
      setSaved(true);
      // "Guardado" a secas mentía cuando la bóveda sí y NocoDB no: ahora se distingue.
      if (r.aviso) toast.warning(r.aviso);
      else toast.success("Guardado y sincronizado con NocoDB");
      router.refresh();
    } catch (e) {
      toast.error(`No se pudo guardar: ${msg(e)}`);
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (!slug) return;
    if (!confirm("¿Eliminar este guion? No se puede deshacer.")) return;
    try {
      await removeGuion(slug);
      close();
      router.refresh();
    } catch (e) {
      toast.error(`No se pudo eliminar: ${msg(e)}`);
    }
  }

  async function dup() {
    if (!slug) return;
    try {
      const nuevo = await duplicateGuion(slug);
      router.refresh();
      if (nuevo?.slug) open(nuevo.slug);
    } catch (e) {
      toast.error(`No se pudo duplicar: ${msg(e)}`);
    }
  }

  return (
    <ModalContext.Provider value={{ open, close }}>
      {children}
      {slug && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-0 sm:p-6"
          onClick={close}
        >
          <div
            className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-none border-line bg-ink sm:h-[90vh] sm:rounded-2xl sm:border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">
                  {guion?.titulo || "Cargando…"}
                </div>
                <div className="text-xs text-slate-500">{slug}</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={dup}
                  className="rounded-md border border-line px-2.5 py-1 text-xs text-slate-300 hover:bg-white/5"
                  title="Duplicar"
                >
                  ⧉ Duplicar
                </button>
                <button
                  onClick={del}
                  className="rounded-md border border-rose-500/30 px-2.5 py-1 text-xs text-rose-300 hover:bg-rose-500/10"
                  title="Eliminar"
                >
                  🗑 Eliminar
                </button>
                <button
                  onClick={close}
                  className="rounded-md px-2 py-1 text-slate-400 hover:bg-white/5"
                  title="Cerrar (Esc)"
                >
                  ✕
                </button>
              </div>
            </div>

            {loading || !guion ? (
              <Esqueleto />
            ) : (
              <div className="flex flex-1 flex-col overflow-hidden lg:flex-row">
                {/* Cuerpo: editar / vista */}
                <div className="flex min-h-0 flex-1 flex-col border-b border-line lg:border-b-0 lg:border-r">
                  <div className="flex items-center gap-1 px-3 pt-3">
                    <Tab active={tab === "vista"} onClick={() => setTab("vista")}>
                      Vista
                    </Tab>
                    <Tab
                      active={tab === "editar"}
                      onClick={() => setTab("editar")}
                    >
                      Editar texto
                    </Tab>
                    <ContadorPalabras
                      dichas={contarPalabras(soloHablado(body))}
                      objetivo={Number(form.palabras_objetivo) || 0}
                    />
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto p-4">
                    {tab === "vista" ? (
                      // La vista de lectura filtra a lo que se dice en cámara; la
                      // pestaña "Editar texto" sigue mostrando el guion entero, que es
                      // lo que se guarda.
                      <VistaGuion cuerpo={body} />
                    ) : (
                      <textarea
                        value={body}
                        onChange={(e) => {
                          setBody(e.target.value);
                          setSaved(false);
                        }}
                        className="h-full min-h-[300px] w-full resize-none rounded-lg border border-line bg-panel p-3 font-mono text-sm leading-relaxed text-slate-200 outline-none focus:border-brand"
                      />
                    )}
                  </div>
                </div>

                {/* Ficha de producción (componente compartido) */}
                <div className="w-full shrink-0 overflow-auto p-4 lg:w-72">
                  <ProductionFields form={form} onField={setField} />
                  <div className="pt-3 text-xs text-slate-500">
                    <div>Fuente: {guion.fuente || "—"}</div>
                    <div>Insight: {guion.insight || "—"}</div>
                    <div>Referencia: {guion.referencia || "—"}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-line px-4 py-3">
              {saved && (
                <span className="text-xs text-emerald-400">✓ Guardado</span>
              )}
              <button
                onClick={close}
                className="rounded-lg border border-line px-3 py-1.5 text-sm text-slate-300 hover:bg-white/5"
              >
                Cerrar
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="rounded-lg bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
              >
                {saving ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ModalContext.Provider>
  );
}

const msg = (e: unknown) => (e instanceof Error ? e.message : "error");

/**
 * Presupuesto de palabras en vivo. El guion se escribe contra un número de palabras
 * habladas y hasta ahora ese número solo se comprobaba a mano, al final: se contaban solo
 * las palabras que se dicen en cámara (`soloHablado`), que es lo que mide el presupuesto.
 */
function ContadorPalabras({
  dichas,
  objetivo,
}: {
  dichas: number;
  objetivo: number;
}) {
  if (!objetivo)
    return (
      <span className="ml-auto self-center text-xs text-slate-500">
        {dichas} palabras habladas
      </span>
    );
  const desvio = Math.abs(dichas - objetivo) / objetivo;
  const color =
    desvio <= 0.1
      ? "text-emerald-400"
      : desvio <= 0.25
      ? "text-amber-400"
      : "text-rose-400";
  return (
    <span
      className={`ml-auto self-center text-xs font-medium ${color}`}
      title="Palabras que se dicen en cámara, contra el objetivo de la ficha"
    >
      {dichas} / {objetivo} palabras
    </span>
  );
}

/** Silueta del editor mientras carga: menos salto visual que un "Cargando…" suelto. */
function Esqueleto() {
  return (
    <div className="flex flex-1 animate-pulse flex-col gap-4 overflow-hidden p-4 lg:flex-row">
      <div className="flex flex-1 flex-col gap-3">
        <div className="flex gap-2">
          <div className="h-7 w-20 rounded-lg bg-white/5" />
          <div className="h-7 w-24 rounded-lg bg-white/5" />
        </div>
        <div className="h-4 w-2/3 rounded bg-white/5" />
        <div className="h-4 w-full rounded bg-white/5" />
        <div className="h-4 w-5/6 rounded bg-white/5" />
        <div className="h-32 w-full rounded-lg bg-white/5" />
        <div className="h-4 w-1/2 rounded bg-white/5" />
      </div>
      <div className="w-full shrink-0 space-y-3 lg:w-72">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-3 w-24 rounded bg-white/5" />
            <div className="h-8 w-full rounded-lg bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-t-lg px-3 py-1.5 text-sm ${
        active ? "bg-panel text-white" : "text-slate-400 hover:text-slate-200"
      }`}
    >
      {children}
    </button>
  );
}
