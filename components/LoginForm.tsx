"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(params.get("from") || "/");
      router.refresh();
    } else {
      // El servidor distingue "clave incorrecta" de "no hay clave configurada".
      // Mostrar el motivo real evita horas buscando el error donde no está.
      const msg = await res.json().then((d) => d?.error).catch(() => null);
      setError(msg || "Clave incorrecta.");
    }
  }

  return (
    <form
      onSubmit={submit}
      className="w-full max-w-sm rounded-2xl border border-line bg-panel p-8"
    >
      <div className="mb-6 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">
          IN
        </div>
        <div>
          <div className="font-semibold">Centro de Control</div>
          <div className="text-xs text-slate-400">Intezia · Contenido</div>
        </div>
      </div>
      <label className="mb-1 block text-sm text-slate-300">
        Clave de acceso del equipo
      </label>
      <input
        type="password"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        autoFocus
        className="w-full rounded-lg border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-brand"
        placeholder="••••••••"
      />
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-4 w-full rounded-lg bg-brand py-2 text-sm font-medium text-white transition hover:bg-brand/90 disabled:opacity-50"
      >
        {loading ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
