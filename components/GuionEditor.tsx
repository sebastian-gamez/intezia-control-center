"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    await patchGuion(guion.slug, form);
    setSaving(false);
    setSaved(true);
    router.refresh();
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
