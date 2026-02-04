import { useState } from "react";
import { usePatients } from "@/hooks/use-patients";
import { Link } from "wouter";
import { CreatePatientDialog } from "@/components/CreatePatientDialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  User, 
  CalendarDays, 
  MapPin, 
  ArrowRight,
  Activity,
  Loader2,
  Bed,
  Shield,
  Stethoscope
} from "lucide-react";
import { format } from "date-fns";

export default function Patients() {
  const { data: patients, isLoading, error } = usePatients();
  const [search, setSearch] = useState("");
  const [unitFilter, setUnitFilter] = useState("all");

  const filteredPatients = patients?.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.hematologicalDiagnosis?.toLowerCase().includes(search.toLowerCase()) ||
      p.leito?.toLowerCase().includes(search.toLowerCase());
    
    const matchesUnit = unitFilter === "all" || p.unidade === unitFilter;
    
    return matchesSearch && matchesUnit && p.isActive;
  });

  const patientsByUnit = {
    Hematologia: filteredPatients?.filter(p => p.unidade === "Hematologia") || [],
    TMO: filteredPatients?.filter(p => p.unidade === "TMO") || [],
    Externos: filteredPatients?.filter(p => p.unidade === "Externos") || [],
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background" data-testid="loading-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground font-medium">Carregando pacientes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-destructive/10">
        <div className="text-center">
          <h2 className="text-xl font-bold text-destructive">Erro ao Carregar</h2>
          <p className="text-destructive/80 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  const PatientCard = ({ patient }: { patient: typeof patients extends (infer T)[] | undefined ? T : never }) => (
    <Link href={`/patient/${patient.id}`} className="block group" data-testid={`patient-card-${patient.id}`}>
      <div className="bg-card rounded-xl p-4 border shadow-sm hover-elevate transition-all duration-200 h-full flex flex-col relative overflow-hidden">
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg shrink-0">
              {patient.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-base leading-tight group-hover:text-primary transition-colors truncate" data-testid={`text-patient-name-${patient.id}`}>
                {patient.name}
              </h3>
              <p className="text-sm text-muted-foreground">{patient.age}a</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {patient.leito && (
              <Badge variant="outline" className="font-mono text-xs" data-testid={`badge-leito-${patient.id}`}>
                <Bed className="h-3 w-3 mr-1" />
                {patient.leito}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-2 flex-1">
          <div className="flex items-start gap-2 text-sm">
            <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <span className="font-medium line-clamp-2">{patient.hematologicalDiagnosis || "Sem diagnóstico"}</span>
          </div>
          
          {patient.colonization && (
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-destructive shrink-0" />
              <Badge variant="destructive" className="text-xs">
                {patient.colonization}
              </Badge>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span>DIH {format(new Date(patient.dih), "dd/MM/yy")}</span>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t flex items-center justify-between text-primary font-medium">
          <span className="text-sm group-hover:underline">Ver Evolução</span>
          <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Stethoscope className="h-8 w-8 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Hematoinfectologia</h1>
            </div>
            <p className="text-muted-foreground mt-1">DIPA Onco-Hemato - Hospital São Paulo/UNIFESP</p>
          </div>
          <CreatePatientDialog />
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            className="pl-10 h-11 bg-card text-base shadow-sm rounded-lg" 
            placeholder="Buscar por nome, diagnóstico ou leito..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="input-search"
          />
        </div>

        {/* Tabs by Unit */}
        <Tabs defaultValue="all" value={unitFilter} onValueChange={setUnitFilter}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="all" data-testid="tab-all">
              Todos ({filteredPatients?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="Hematologia" data-testid="tab-hematologia">
              Hematologia ({patientsByUnit.Hematologia.length})
            </TabsTrigger>
            <TabsTrigger value="TMO" data-testid="tab-tmo">
              TMO ({patientsByUnit.TMO.length})
            </TabsTrigger>
            <TabsTrigger value="Externos" data-testid="tab-externos">
              Externos ({patientsByUnit.Externos.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPatients?.map((patient) => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="Hematologia" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {patientsByUnit.Hematologia.map((patient) => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="TMO" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {patientsByUnit.TMO.map((patient) => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="Externos" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {patientsByUnit.Externos.map((patient) => (
                <PatientCard key={patient.id} patient={patient} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        {filteredPatients?.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 bg-card rounded-xl border border-dashed">
            <User className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Nenhum paciente encontrado</h3>
            <p className="text-muted-foreground">Ajuste a busca ou cadastre um novo paciente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
