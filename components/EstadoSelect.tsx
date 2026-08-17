"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ESTADOS, ESTADO_LABEL, type Estado } from "@/lib/types";
import { patchGuion } from "@/lib/api";

/**
 * Selector de etapa. El valor que se ve es LOCAL y cambia al instante; la prop del
 * servidor solo lo pisa cuando llega ya actualizada. Antes el select "rebotaba" al valor
 * viejo durante todo el PATCH y parecía que no había funcionado.
 *
 * Con `alCambiar` el guardado lo hace el padre (el tablero, que además mueve la tarjeta);
 * sin él, guarda por su cuenta. Así el mismo componente sirve en la tabla y en el Kanban.
 */
export default function EstadoSelect({
  slug,
  estado,
  alCambiar,
}: {
  slug: string;
  estado: Estado;
  alCambiar?: (nuevo: Estado) => Promise<void>;
}) {
  const router = useRouter();
  const [valor, setValor] = useState<Estado>(estado);
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  // El servidor manda: cuando la prop llega con otro valor (nuestro guardado, o el
  // cambio de otra persona), se adopta.
  useEffect(() => setValor(estado), [estado]);

  async function change(nuevo: Estado) {
    const previo = valor;
    setValor(nuevo); // optimista: la interfaz responde ya
    setSaving(true);
    try {
      if (alCambiar) await alCambiar(nuevo);
      else {
        await patchGuion(slug, { estado: nuevo });
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setValor(previo); // solo se revierte si de verdad falló
      toast.error(
        `No se pudo cambiar la etapa: ${e instanceof Error ? e.message : "error"}`
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <select
      value={valor}
      disabled={saving}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => change(e.target.value as Estado)}
      className="rounded-md border border-line bg-ink px-2 py-1 text-xs text-slate-200 outline-none focus:border-brand disabled:opacity-50"
    >
      {ESTADOS.map((s) => (
        <option key={s} value={s}>
          {ESTADO_LABEL[s]}
        </option>
      ))}
    </select>
  );
}
