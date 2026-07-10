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
    </GuionModalProvider>
  );
}
