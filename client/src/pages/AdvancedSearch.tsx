import { useState } from "react";
import { Link } from "wouter";
import { useAdvancedSearch, type AdvancedSearchParams } from "@/hooks/use-search";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Filter,
  User,
  Bed,
  Shield,
  Activity,
  Pill,
  FlaskConical,
  Calendar,
  ArrowRight,
  Loader2,
  ChevronLeft,
  X,
} from "lucide-react";
import { format } from "date-fns";

const colonizationOptions = ["KPC", "NDM", "VRE", "ESBL", "MRSA"];
const unitOptions = ["Hematologia", "TMO", "Externos"];

export default function AdvancedSearch() {
  const search = useAdvancedSearch();

  const [params, setParams] = useState<AdvancedSearchParams>({
    query: "",
    colonization: [],
    unit: [],
    hasActiveATB: false,
    hasPendingCultures: false,
    sortBy: "name",
    sortOrder: "asc",
  });

  const handleSearch = () => {
    search.mutate(params);
  };

  const toggleColonization = (col: string) => {
    const current = params.colonization || [];
    if (current.includes(col)) {
      setParams({ ...params, colonization: current.filter(c => c !== col) });
    } else {
      setParams({ ...params, colonization: [...current, col] });
    }
  };

  const toggleUnit = (unit: string) => {
    const current = params.unit || [];
    if (current.includes(unit)) {
      setParams({ ...params, unit: current.filter(u => u !== unit) });
    } else {
      setParams({ ...params, unit: [...current, unit] });
    }
  };

  const clearFilters = () => {
    setParams({
      query: "",
      colonization: [],
      unit: [],
      hasActiveATB: false,
      hasPendingCultures: false,
      sortBy: "name",
      sortOrder: "asc",
    });
  };

  const hasFilters =
    params.query ||
    (params.colonization && params.colonization.length > 0) ||
    (params.unit && params.unit.length > 0) ||
    params.hasActiveATB ||
    params.hasPendingCultures ||
    params.dateFrom ||
    params.dateTo;

  return (
    <div className="min-h-screen bg-background p-6 lg:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" />
              Busca Avançada
            </h1>
            <p className="text-muted-foreground">
              Encontre pacientes com filtros específicos
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Panel */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Filtros
                </span>
                {hasFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="h-4 w-4 mr-1" />
                    Limpar
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Text Search */}
              <div className="space-y-2">
                <Label>Buscar</Label>
                <Input
                  placeholder="Nome, diagnóstico, leito..."
                  value={params.query || ""}
                  onChange={(e) => setParams({ ...params, query: e.target.value })}
                />
              </div>

              {/* Colonization */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-destructive" />
                  Colonização
                </Label>
                <div className="flex flex-wrap gap-2">
                  {colonizationOptions.map((col) => (
                    <Badge
                      key={col}
                      variant={params.colonization?.includes(col) ? "destructive" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleColonization(col)}
                    >
                      {col}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Unit */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Bed className="h-4 w-4" />
                  Unidade
                </Label>
                <div className="flex flex-wrap gap-2">
                  {unitOptions.map((unit) => (
                    <Badge
                      key={unit}
                      variant={params.unit?.includes(unit) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleUnit(unit)}
                    >
                      {unit}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Status Filters */}
              <div className="space-y-3">
                <Label>Status</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasATB"
                    checked={params.hasActiveATB}
                    onCheckedChange={(checked) =>
                      setParams({ ...params, hasActiveATB: checked as boolean })
                    }
                  />
                  <label htmlFor="hasATB" className="text-sm flex items-center gap-2 cursor-pointer">
                    <Pill className="h-4 w-4 text-orange-500" />
                    Em uso de ATB
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasCultures"
                    checked={params.hasPendingCultures}
                    onCheckedChange={(checked) =>
                      setParams({ ...params, hasPendingCultures: checked as boolean })
                    }
                  />
                  <label htmlFor="hasCultures" className="text-sm flex items-center gap-2 cursor-pointer">
                    <FlaskConical className="h-4 w-4 text-amber-500" />
                    Culturas pendentes
                  </label>
                </div>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Período de Internação
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="date"
                    placeholder="De"
                    value={params.dateFrom || ""}
                    onChange={(e) => setParams({ ...params, dateFrom: e.target.value })}
                  />
                  <Input
                    type="date"
                    placeholder="Até"
                    value={params.dateTo || ""}
                    onChange={(e) => setParams({ ...params, dateTo: e.target.value })}
                  />
                </div>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <Label>Ordenar por</Label>
                <Select
                  value={params.sortBy}
                  onValueChange={(value) => setParams({ ...params, sortBy: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">Nome</SelectItem>
                    <SelectItem value="dih">Data de Internação</SelectItem>
                    <SelectItem value="leito">Leito</SelectItem>
                    <SelectItem value="unidade">Unidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleSearch} className="w-full" disabled={search.isPending}>
                {search.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                Resultados
                {search.data && (
                  <span className="text-muted-foreground font-normal ml-2">
                    ({search.data.length} pacientes)
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                {!search.data && !search.isPending && (
                  <div className="text-center py-20 text-muted-foreground">
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Use os filtros e clique em Buscar</p>
                  </div>
                )}

                {search.isPending && (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                )}

                {search.data && search.data.length === 0 && (
                  <div className="text-center py-20 text-muted-foreground">
                    <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhum paciente encontrado</p>
                  </div>
                )}

                <div className="space-y-3">
                  {search.data?.map((patient) => (
                    <Link key={patient.id} href={`/patient/${patient.id}`}>
                      <div className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                              {patient.name.charAt(0)}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{patient.name}</p>
                                <span className="text-sm text-muted-foreground">
                                  {patient.age}a
                                </span>
                                {patient.colonization && (
                                  <Badge variant="destructive" className="text-xs">
                                    {patient.colonization}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                                {patient.leito && (
                                  <span className="flex items-center gap-1">
                                    <Bed className="h-3 w-3" />
                                    {patient.leito}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Activity className="h-3 w-3" />
                                  {patient.hematologicalDiagnosis}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  DIH {format(new Date(patient.dih), "dd/MM/yy")}
                                </span>
                              </div>
                            </div>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
