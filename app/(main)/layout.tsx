import { Sidebar } from "@/components/layout/sidebar";
import { Navbar } from "@/components/layout/navbar";
import { SessionProvider } from "@/components/providers/session-provider";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen">
        <aside className="hidden w-64 border-r lg:block">
          <Sidebar className="sticky top-0" />
        </aside>
        <div className="flex flex-1 flex-col min-w-0">
          <Navbar />
          <main className="flex-1 p-4 lg:p-6">{children}</main>
        </div>
      </div>
    </SessionProvider>
  );
}
