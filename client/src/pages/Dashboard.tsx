import { Link } from "wouter";
import { useDashboardStats, useATBTimeline } from "@/hooks/use-dashboard";
import { useUnreadAlerts, useResolveAlert, useMarkAlertRead } from "@/hooks/use-alerts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Activity,
  AlertTriangle,
  Pill,
  FlaskConical,
  Bell,
  CheckCircle2,
  Clock,
  Shield,
  Bed,
  Calendar,
  ArrowRight,
  Loader2,
  Stethoscope,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Dashboard() {
  const { data: stats, isLoading: loadingStats } = useDashboardStats();
  const { data: atbTimeline, isLoading: loadingTimeline } = useATBTimeline();
  const { data: unreadAlerts } = useUnreadAlerts();
  const resolveAlert = useResolveAlert();
  const markRead = useMarkAlertRead();

  if (loadingStats) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  const priorityColors = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500",
  };

  const priorityLabels = {
    critical: "Crítico",
    high: "Alto",
    medium: "Médio",
    low: "Baixo",
  };

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold">Dashboard</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Visão geral do serviço de Hematoinfectologia
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Ver Pacientes
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pacientes Ativos</p>
                  <p className="text-3xl font-bold">{stats?.activePatients || 0}</p>
                </div>
                <Users className="h-8 w-8 text-primary opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Colonizados</p>
                  <p className="text-3xl font-bold text-destructive">{stats?.colonizedPatients || 0}</p>
                </div>
                <Shield className="h-8 w-8 text-destructive opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ATBs Ativos</p>
                  <p className="text-3xl font-bold text-orange-500">{stats?.activeAntibiotics || 0}</p>
                </div>
                <Pill className="h-8 w-8 text-orange-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Culturas Pendentes</p>
                  <p className="text-3xl font-bold text-amber-500">{stats?.pendingCultures || 0}</p>
                </div>
                <FlaskConical className="h-8 w-8 text-amber-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Reavaliações Hoje</p>
                  <p className="text-3xl font-bold text-blue-500">{stats?.atbReviewsToday || 0}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500 opacity-80" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Alertas</p>
                  <p className="text-3xl font-bold text-red-500">{unreadAlerts?.length || 0}</p>
                </div>
                <Bell className="h-8 w-8 text-red-500 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Alerts Panel */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-primary" />
                Alertas Recentes
              </CardTitle>
              <CardDescription>
                {unreadAlerts?.length || 0} alertas não lidos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-3">
                  {unreadAlerts?.slice(0, 10).map((alert) => (
                    <div
                      key={alert.id}
                      className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-2 ${priorityColors[alert.priority as keyof typeof priorityColors]}`} />
                          <div>
                            <p className="font-medium text-sm">{alert.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{alert.message}</p>
                            {alert.dueDate && (
                              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(alert.dueDate), "dd/MM HH:mm")}
                              </p>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          onClick={() => resolveAlert.mutate(alert.id)}
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {(!unreadAlerts || unreadAlerts.length === 0) && (
                    <div className="text-center py-10 text-muted-foreground">
                      <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Nenhum alerta pendente</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* ATB Timeline */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Pill className="h-5 w-5 text-primary" />
                Timeline de Antibióticos
              </CardTitle>
              <CardDescription>
                Pacientes em uso de ATB com dias de tratamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {atbTimeline?.map((entry) => (
                    <Link key={entry.patient.id} href={`/patient/${entry.patient.id}`}>
                      <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {entry.patient.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{entry.patient.name}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Bed className="h-3 w-3" />
                                {entry.patient.leito || "Sem leito"}
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                          {entry.antibiotics.map((atbEntry) => (
                            <div key={atbEntry.antibiotic.id} className="flex items-center gap-3">
                              <Badge variant="outline" className="font-mono">
                                D{atbEntry.currentDay}
                              </Badge>
                              <span className="text-sm font-medium">{atbEntry.antibiotic.name}</span>
                              <span className="text-xs text-muted-foreground">
                                {atbEntry.antibiotic.dose} {atbEntry.antibiotic.frequency}
                              </span>
                              <div className="flex-1" />
                              <div className="flex gap-1">
                                {atbEntry.reviewDates.map((review) => (
                                  <Badge
                                    key={review.day}
                                    variant={review.isPast ? "secondary" : atbEntry.currentDay >= review.day ? "destructive" : "outline"}
                                    className="text-xs"
                                  >
                                    D{review.day}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Link>
                  ))}
                  {(!atbTimeline || atbTimeline.length === 0) && (
                    <div className="text-center py-10 text-muted-foreground">
                      <Pill className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p>Nenhum paciente em uso de ATB</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Unit */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bed className="h-5 w-5 text-primary" />
                Por Unidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.byUnit && Object.entries(stats.byUnit).map(([unit, count]) => {
                  const percentage = stats.activePatients > 0
                    ? Math.round((count / stats.activePatients) * 100)
                    : 0;
                  return (
                    <div key={unit}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{unit}</span>
                        <span className="text-muted-foreground">{count} ({percentage}%)</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
                {(!stats?.byUnit || Object.keys(stats.byUnit).length === 0) && (
                  <p className="text-center text-muted-foreground py-4">Sem dados</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* By Colonization */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-5 w-5 text-destructive" />
                Por Colonização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {stats?.byColonization && Object.entries(stats.byColonization).map(([col, count]) => {
                  const colonizationColors: Record<string, string> = {
                    KPC: "bg-red-500",
                    NDM: "bg-purple-500",
                    VRE: "bg-orange-500",
                    ESBL: "bg-yellow-500",
                  };
                  return (
                    <div key={col} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${colonizationColors[col] || "bg-gray-500"}`} />
                        <span className="font-medium">{col}</span>
                      </div>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  );
                })}
                {(!stats?.byColonization || Object.keys(stats.byColonization).length === 0) && (
                  <p className="text-center text-muted-foreground py-4">Nenhum paciente colonizado</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
