import { Switch, Route, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import NotFound from "@/pages/not-found";
import Patients from "@/pages/Patients";
import PatientDetail from "@/pages/PatientDetail";
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import AdvancedSearch from "@/pages/AdvancedSearch";
import { useCurrentUser, useLogout } from "@/hooks/use-auth";
import { useUnreadAlerts } from "@/hooks/use-alerts";
import {
  Stethoscope,
  BarChart3,
  Users,
  Search,
  Bell,
  User,
  LogOut,
  Settings,
} from "lucide-react";

function Navigation() {
  const [location] = useLocation();
  const { data: user } = useCurrentUser();
  const { data: unreadAlerts } = useUnreadAlerts();
  const logout = useLogout();

  // Don't show navigation on login page
  if (location === "/login") return null;

  const navItems = [
    { href: "/", label: "Pacientes", icon: Users },
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/search", label: "Busca", icon: Search },
  ];

  return (
    <nav className="bg-card border-b sticky top-0 z-50">
      <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-primary">
            <Stethoscope className="h-6 w-6" />
            <span className="hidden sm:inline">HematoInfecto</span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={location === item.href ? "secondary" : "ghost"}
                  size="sm"
                  className="gap-2"
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Alerts Badge */}
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadAlerts && unreadAlerts.length > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                >
                  {unreadAlerts.length > 9 ? "9+" : unreadAlerts.length}
                </Badge>
              )}
            </Button>
          </Link>

          {/* User Menu */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {user.name.charAt(0)}
                  </div>
                  <span className="hidden md:inline">{user.name.split(" ")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  Perfil
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="h-4 w-4 mr-2" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout.mutate()}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm">
                Entrar
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Patients} />
      <Route path="/patient/:id" component={PatientDetail} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/login" component={Login} />
      <Route path="/search" component={AdvancedSearch} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          <Navigation />
          <Router />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
