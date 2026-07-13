import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getGuion } from "@/lib/data";
import GuionEditor from "@/components/GuionEditor";
import { EstadoBadge } from "@/components/badges";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function GuionDetail({
  params,
}: {
  params: { slug: string };
}) {
  const slug = decodeURIComponent(params.slug);
  const guion = await getGuion(slug);
  if (!guion) notFound();

  // Quita el primer H1 del cuerpo (ya se muestra como título arriba)
  const cuerpo = guion.cuerpo.replace(/^#\s+.+\n/, "");

  return (
    <div className="px-5 py-5">
      <Link
        href="/guiones"
        className="text-sm text-slate-400 hover:text-slate-200"
      >
        ← Todos los guiones
      </Link>

      <div className="mt-3 flex flex-col gap-5 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold">{guion.titulo}</h1>
            <EstadoBadge estado={guion.estado} />
          </div>
          <article className="prose-guion max-w-none rounded-xl border border-line bg-panel/40 p-5">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{cuerpo}</ReactMarkdown>
          </article>
        </div>

        <div className="w-full lg:w-80 lg:shrink-0">
          <GuionEditor guion={guion} />
          <div className="mt-3 rounded-xl border border-line bg-panel/40 p-4 text-xs text-slate-400">
            <div className="mb-1">
              <span className="text-slate-500">Fuente:</span>{" "}
              {guion.fuente || "—"}
            </div>
            <div>
              <span className="text-slate-500">Insight:</span>{" "}
              {guion.insight || "—"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
