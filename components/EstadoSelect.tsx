"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ESTADOS, ESTADO_LABEL, type Estado } from "@/lib/types";
import { patchGuion } from "@/lib/api";

export default function EstadoSelect({
  slug,
  estado,
}: {
  slug: string;
  estado: Estado;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  async function change(nuevo: string) {
    setSaving(true);
    await patchGuion(slug, { estado: nuevo });
    setSaving(false);
    startTransition(() => router.refresh());
  }

  return (
    <select
      value={estado}
      disabled={saving}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => change(e.target.value)}
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
