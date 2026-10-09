import { LayoutDashboard, Users, Megaphone, BookOpen, Heart, Newspaper, DollarSign, Palette, Camera, HelpCircle, CalendarDays, Briefcase, ClipboardList, Award, LayoutGrid, Link2, CalendarRange, Globe, Bot } from "lucide-react";
import { useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useMemberStore } from "@/hooks/useMemberStore";
import { siteEditableDivisions } from "@/lib/siteAccess";
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

const TRACKER_ROUTES = ["/trackers", "/tracker", "/evaluation"];

export function AppSidebar() {
  const { isAdmin, currentMember } = useMemberStore();
  // Division editors (Kadep/Wakadep, listed BPH) also get Public Website, for their prokers only.
  const canEditSite = isAdmin || siteEditableDivisions(currentMember).length > 0;
  const location = useLocation();
  const trackersActive = TRACKER_ROUTES.some((r) => location.pathname === r || location.pathname.startsWith(r + "/"));

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
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/lapak-kerja" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                    <Briefcase className="mr-2 h-4 w-4" />
                    <span>Lapak Kerja</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/grand-timeline" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                    <CalendarRange className="mr-2 h-4 w-4" />
                    <span>Grand Timeline</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/links" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                    <Link2 className="mr-2 h-4 w-4" />
                    <span>Links</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink to="/trackers" end activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                    <LayoutGrid className="mr-2 h-4 w-4" />
                    <span>Trackers</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {trackersActive && (
                <div className="ml-4 border-l border-sidebar-foreground/15 pl-2 my-0.5">
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm">
                      <NavLink to="/tracker" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                        <ClipboardList className="mr-2 h-3.5 w-3.5" />
                        <span>Personal Tracker</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild size="sm">
                      <NavLink to="/evaluation" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                        <Award className="mr-2 h-3.5 w-3.5" />
                        <span>Evaluasi</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </div>
              )}
              {canEditSite && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/website" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                      <Globe className="mr-2 h-4 w-4" />
                      <span>Public Website</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {isAdmin && (
                <>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink to="/admin/bhep" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      <span>BHEP Submissions</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <NavLink to="/admin/ai-monitor" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground" className="text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-colors">
                        <Bot className="mr-2 h-4 w-4" />
                        <span>AI Monitor</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
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
