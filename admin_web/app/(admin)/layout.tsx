import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[248px_1fr] min-h-screen">
      <Sidebar />
      <main className="px-10 py-7 pb-16">{children}</main>
    </div>
  );
}
