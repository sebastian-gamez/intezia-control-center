import { listGuiones } from "@/lib/data";
import GuionesTable from "@/components/GuionesTable";
import NewGuionButton from "@/components/NewGuionButton";

export const dynamic = "force-dynamic";

export default async function GuionesPage() {
  const guiones = await listGuiones();
  return (
    <div className="px-5 py-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="mb-1 text-xl font-semibold">Todos los guiones</h1>
          <p className="text-sm text-slate-400">
            Filtra y abre cualquier guion en un panel para editar texto y
            metadatos. El estado se edita en línea.
          </p>
        </div>
        <NewGuionButton />
      </div>
      <GuionesTable guiones={guiones} />
    </div>
  );
}
