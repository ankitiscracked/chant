import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";

interface AppLayoutProps {
  email: string;
  onLogout: () => void;
  children: React.ReactNode;
}

export function AppLayout({ email, onLogout, children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar email={email} onLogout={onLogout} />
      <SidebarInset>
        <main className="flex-1">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}