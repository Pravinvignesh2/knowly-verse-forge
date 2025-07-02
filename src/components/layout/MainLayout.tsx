
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UserMenu } from "@/components/layout/UserMenu";
import { SearchBar } from "@/components/search/SearchBar";

const MainLayout = () => {
  return (
    <>
      <header className="h-14 flex items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-4">
          <SidebarTrigger />
          <h1 className="text-xl font-semibold">Knowledge Base</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="w-64 hidden md:block">
            <SearchBar />
          </div>
          <UserMenu />
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-3.5rem)] w-full">
        <AppSidebar />
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default MainLayout;
