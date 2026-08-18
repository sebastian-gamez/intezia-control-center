import { Toaster } from "sonner";
import Sidebar from "@/components/Sidebar";
import GuionModalProvider from "@/components/GuionModalProvider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <GuionModalProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
      {/* Un fallo al guardar, mover o eliminar tiene que verse: antes se perdía en la
          consola y en la interfaz no pasaba nada. */}
      <Toaster theme="dark" position="bottom-right" richColors closeButton />
    </GuionModalProvider>
  );
}
