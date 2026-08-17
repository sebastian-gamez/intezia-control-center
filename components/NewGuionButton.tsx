"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGuionModal } from "./GuionModalProvider";
import { createGuion } from "@/lib/api";

export default function NewGuionButton() {
  const router = useRouter();
  const { open } = useGuionModal();
  const [busy, setBusy] = useState(false);

  async function crear() {
    const titulo = prompt("Título del nuevo guion:", "Nuevo guion");
    if (titulo == null) return;
    setBusy(true);
    try {
      const g = await createGuion(titulo.trim() || "Nuevo guion");
      router.refresh();
      if (g?.slug) open(g.slug);
    } catch (e) {
      toast.error(`No se pudo crear: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={crear}
      disabled={busy}
      className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white hover:bg-brand/90 disabled:opacity-50"
    >
      + Nuevo guion
    </button>
  );
}
