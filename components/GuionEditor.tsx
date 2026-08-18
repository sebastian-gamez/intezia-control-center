"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { Guion } from "@/lib/types";
import { patchGuion } from "@/lib/api";
import ProductionFields, { toMetaForm, type MetaForm } from "./ProductionFields";

export default function GuionEditor({ guion }: { guion: Guion }) {
  const router = useRouter();
  const [form, setForm] = useState<MetaForm>(toMetaForm(guion));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    try {
      const r = await patchGuion(guion.slug, form);
      setSaved(true);
      // Guardar en la bóveda y guardar TAMBIÉN en NocoDB no son lo mismo: se distingue.
      if (r.aviso) toast.warning(r.aviso);
      else toast.success("Guardado y sincronizado con NocoDB");
      router.refresh();
    } catch (e) {
      toast.error(`No se pudo guardar: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-panel p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-200">
        Ficha de producción
      </h3>
      <ProductionFields form={form} onField={setField} />
      <button
        onClick={save}
        disabled={saving}
        className="mt-4 w-full rounded-lg bg-brand py-2 text-sm font-medium text-white transition hover:bg-brand/90 disabled:opacity-50"
      >
        {saving ? "Guardando…" : saved ? "✓ Guardado" : "Guardar cambios"}
      </button>
    </div>
  );
}
