import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertPatientSchema, type InsertPatient } from "@shared/schema";
import { useCreatePatient } from "@/hooks/use-patients";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { CalendarIcon, Plus, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function CreatePatientDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createPatient = useCreatePatient();

  const form = useForm<InsertPatient>({
    resolver: zodResolver(insertPatientSchema),
    defaultValues: {
      name: "",
      age: 0,
      city: "São Paulo",
      state: "SP",
      leito: "",
      unidade: "Hematologia",
      hematologicalDiagnosis: "",
      currentProtocol: "",
      colonization: "",
      prophylaxis: "Aciclovir 400mg 8/8h",
      defaultPreceptor: "",
      isActive: true,
    },
  });

  async function onSubmit(data: InsertPatient) {
    try {
      await createPatient.mutateAsync(data);
      toast({
        title: "Sucesso",
        description: "Paciente cadastrado com sucesso",
      });
      setOpen(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Falha ao cadastrar paciente",
        variant: "destructive",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2" data-testid="button-new-patient">
          <UserPlus className="h-4 w-4" />
          Novo Paciente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Paciente</DialogTitle>
          <DialogDescription>
            Preencha os dados do paciente para interconsulta de hematoinfectologia.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* ID Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Identificação</h3>
                
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do paciente" {...field} data-testid="input-patient-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Idade</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            {...field} 
                            onChange={e => field.onChange(parseInt(e.target.value) || 0)} 
                            data-testid="input-patient-age"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="leito"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Leito</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: CMM A0307" {...field} value={field.value || ""} data-testid="input-leito" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unidade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidade</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || "Hematologia"}>
                          <FormControl>
                            <SelectTrigger data-testid="select-unidade">
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Hematologia">Hematologia</SelectItem>
                            <SelectItem value="TMO">TMO</SelectItem>
                            <SelectItem value="Externos">Externos</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cidade</FormLabel>
                        <FormControl>
                          <Input placeholder="São Paulo" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>UF</FormLabel>
                        <FormControl>
                          <Input placeholder="SP" maxLength={2} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dih"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Internação (DIH)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                              data-testid="button-dih"
                            >
                              {field.value ? (
                                format(field.value, "dd/MM/yyyy")
                              ) : (
                                <span>Selecione a data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Hemato Section */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dados Hematológicos</h3>
                
                <FormField
                  control={form.control}
                  name="hematologicalDiagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HD Hemato</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: LMA M4, LLA-B, Linfoma DGCB" {...field} data-testid="input-hd-hemato" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentProtocol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Protocolo QT Atual</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: VIALE-A, HiDAC, R-CHOP" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tcth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>TCTH</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Alogênico D+30" {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Infecto Section */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dados Infectológicos</h3>
                
                <FormField
                  control={form.control}
                  name="colonization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Colonização (Swab Anal)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-colonization">
                            <SelectValue placeholder="Selecione ou deixe vazio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Negativo">Negativo</SelectItem>
                          <SelectItem value="KPC">KPC</SelectItem>
                          <SelectItem value="NDM">NDM</SelectItem>
                          <SelectItem value="KPC + NDM">KPC + NDM</SelectItem>
                          <SelectItem value="VRE">VRE</SelectItem>
                          <SelectItem value="ESBL">ESBL</SelectItem>
                          <SelectItem value="Não colhido">Não colhido</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="prophylaxis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Profilaxias</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Ex: Aciclovir 400mg 8/8h + Fluconazol 200mg/dia" 
                          className="min-h-[60px]"
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="defaultPreceptor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preceptor</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Dr. Ponzio" {...field} value={field.value || ""} data-testid="input-preceptor" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Comorbidades */}
              <div className="space-y-3 pt-4 border-t">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Outros</h3>
                
                <FormField
                  control={form.control}
                  name="comorbidities"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comorbidades</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Ex: HAS, DM2, IRC dialítica" 
                          className="min-h-[50px]"
                          {...field} 
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={createPatient.isPending}
                data-testid="button-submit-patient"
              >
                {createPatient.isPending ? "Cadastrando..." : "Cadastrar Paciente"}
              </Button>
            </form>
          </Form>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
