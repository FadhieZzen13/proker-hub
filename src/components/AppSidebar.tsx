import { LayoutDashboard, Users, Megaphone, BookOpen, Heart, Newspaper, DollarSign, Palette, Camera, HelpCircle, CalendarDays } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useMemberStore } from "@/hooks/useMemberStore";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
} from "@/components/ui/sidebar";

const divisionItems = [
  { title: "BPH", url: "/division/BPH", icon: Users },
  { title: "AKSI", url: "/division/AKSI", icon: Heart },
  { title: "POSDM", url: "/division/POSDM", icon: BookOpen },
  { title: "ROMAS", url: "/division/ROMAS", icon: Megaphone },
  { title: "HUMAS", url: "/division/HUMAS", icon: Newspaper },
  { title: "DANUS", url: "/division/DANUS", icon: DollarSign },
  { title: "SEBURA", url: "/division/SEBURA", icon: Palette },
  { title: "MEDIFO", url: "/division/MEDIFO", icon: Camera },
];

export function AppSidebar() {
  const { isAdmin } = useMemberStore();

  return (
    <Sidebar className="border-r-0">
      <SidebarHeader className="p-5 gradient-navy">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="PPI UPM" className="h-10 w-10 rounded-full object-contain" />
          <div>
            <h1 className="font-extrabold text-sidebar-primary text-lg leading-tight">PPI UPM</h1>
            <p className="text-xs text-sidebar-foreground/70">Management Dashboard</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="gradient-navy">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/" end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/members" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                    <Users className="mr-2 h-4 w-4" />
                    <span>Members</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/bhep" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      <span>BHEP Submissions</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/guide" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                    <HelpCircle className="mr-2 h-4 w-4" />
                    <span>Guide</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest font-semibold px-4">
            Divisions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {divisionItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>


      </SidebarContent>
    </Sidebar>
  );
}
