import { useState, useRef, useEffect } from "react";
import { useRoute, Link } from "wouter";
import { usePatient, useUpdatePatient } from "@/hooks/use-patients";
import { useEvolutions, useExportEvolution, useGenerateEvolution, useCreateEvolution } from "@/hooks/use-evolutions";
import { useMessages, useSendMessage } from "@/hooks/use-messages";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ChevronLeft, 
  Calendar, 
  Download, 
  FileText, 
  User, 
  Activity,
  MapPin,
  Clock,
  Send,
  Loader2,
  AlertCircle,
  BookOpen,
  Bed,
  Shield,
  Pill,
  Copy,
  Check,
  MessageSquare,
  History,
  Settings,
  Sparkles
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function PatientDetail() {
  const [, params] = useRoute("/patient/:id");
  const id = parseInt(params?.id || "0");
  const { toast } = useToast();
  
  const { data: patient, isLoading: loadingPatient } = usePatient(id);
  const { data: evolutions, isLoading: loadingEvolutions } = useEvolutions(id);
  const { data: messages, isLoading: loadingMessages } = useMessages(id);
  const exportEvolution = useExportEvolution();
  const sendMessage = useSendMessage();
  const generateEvolution = useGenerateEvolution();
  const createEvolution = useCreateEvolution();

  const [chatInput, setChatInput] = useState("");
  const [activeTab, setActiveTab] = useState("chat");
  const [generatedContent, setGeneratedContent] = useState("");
  const [missingAlerts, setMissingAlerts] = useState<string[]>([]);
  const [readingSuggestions, setReadingSuggestions] = useState<{title: string; source: string; summary: string}[]>([]);
  const [copied, setCopied] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loadingPatient || loadingEvolutions) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" data-testid="loading-spinner">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!patient) return <div data-testid="patient-not-found">Paciente não encontrado</div>;

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;
    
    const content = chatInput;
    setChatInput("");
    
    try {
      await sendMessage.mutateAsync({ patientId: id, content });
    } catch {
      toast({ title: "Erro", description: "Falha ao enviar mensagem", variant: "destructive" });
    }
  };

  const handleGenerateEvolution = async () => {
    if (!chatInput.trim()) {
      toast({ title: "Aviso", description: "Insira os dados do dia para gerar a evolução" });
      return;
    }

    try {
      const result = await generateEvolution.mutateAsync({
        patientId: id,
        rawInput: chatInput,
        includeImpression: true,
        includeSuggestions: true,
      });
      
      setGeneratedContent(result.content);
      setMissingAlerts(result.missingDataAlerts || []);
      setReadingSuggestions(result.readingSuggestions || []);
      setActiveTab("editor");
      setChatInput("");
      
    } catch {
      toast({ title: "Erro", description: "Falha ao gerar evolução", variant: "destructive" });
    }
  };

  const handleSaveEvolution = async () => {
    try {
      await createEvolution.mutateAsync({
        patientId: id,
        content: generatedContent,
        date: new Date(),
      });
      toast({ title: "Sucesso", description: "Evolução salva com sucesso" });
      setGeneratedContent("");
    } catch {
      toast({ title: "Erro", description: "Falha ao salvar evolução", variant: "destructive" });
    }
  };

  const handleExport = async (evolutionId: number) => {
    try {
      const blob = await exportEvolution.mutateAsync(evolutionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Evolucao_${patient.name}_${format(new Date(), "yyyy-MM-dd")}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast({ title: "Erro", description: "Falha ao exportar documento", variant: "destructive" });
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const lastEvolution = evolutions?.[0];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b px-6 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" data-testid="link-back">
              <Button variant="ghost" size="icon">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold" data-testid="text-patient-name">{patient.name}</h1>
                {patient.leito && (
                  <Badge variant="outline" className="font-mono" data-testid="badge-leito">
                    <Bed className="h-3 w-3 mr-1" />
                    {patient.leito}
                  </Badge>
                )}
                {patient.colonization && (
                  <Badge variant="destructive" data-testid="badge-colonization">
                    <Shield className="h-3 w-3 mr-1" />
                    {patient.colonization}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> {patient.age}a
                </span>
                <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                <span className="flex items-center gap-1 text-primary font-medium">
                  <Activity className="h-3.5 w-3.5" /> {patient.hematologicalDiagnosis}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="hidden md:flex flex-col items-end">
              <span className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> 
                DIH: {format(new Date(patient.dih), "dd/MM/yyyy")}
              </span>
              <span className="flex items-center gap-1.5 text-xs">
                <MapPin className="h-3 w-3" /> {patient.city}, {patient.state}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1600px] mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar - Patient Info Card */}
        <div className="lg:col-span-3 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Dados do Paciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              {/* Unidade */}
              <div>
                <label className="text-xs text-muted-foreground uppercase">Unidade</label>
                <p className="font-medium">{patient.unidade || "Não informada"}</p>
              </div>
              
              {/* Protocolo Atual */}
              {patient.currentProtocol && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase">Protocolo QT Atual</label>
                  <p className="font-medium">{patient.currentProtocol}</p>
                </div>
              )}
              
              {/* TCTH */}
              {patient.tcth && (
                <div>
                  <label className="text-xs text-muted-foreground uppercase">TCTH</label>
                  <p className="font-medium">{patient.tcth}</p>
                </div>
              )}
              
              {/* Colonização */}
              <div>
                <label className="text-xs text-muted-foreground uppercase">Vigilância (Swab)</label>
                <p className={`font-medium ${patient.colonization ? "text-destructive" : "text-muted-foreground"}`}>
                  {patient.colonization || "Não colhido / Negativo"}
                </p>
              </div>
              
              {/* Profilaxias */}
              <div>
                <label className="text-xs text-muted-foreground uppercase flex items-center gap-1">
                  <Pill className="h-3 w-3" />
                  Profilaxias
                </label>
                <p className="text-xs whitespace-pre-wrap">{patient.prophylaxis || "Não informadas"}</p>
              </div>
              
              {/* Preceptor */}
              <div>
                <label className="text-xs text-muted-foreground uppercase">Preceptor</label>
                <p className="font-medium">{patient.defaultPreceptor || "Não informado"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Alerts Card */}
          {missingAlerts.length > 0 && (
            <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  Dados Faltantes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-xs space-y-1 text-amber-700 dark:text-amber-400">
                  {missingAlerts.map((alert, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-500">-</span>
                      {alert}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Reading Suggestions */}
          {readingSuggestions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Leituras Sugeridas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {readingSuggestions.map((reading, i) => (
                  <div key={i} className="text-xs space-y-1">
                    <p className="font-medium">{reading.title}</p>
                    <p className="text-muted-foreground">{reading.source}</p>
                    <p className="text-muted-foreground/80">{reading.summary}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-6">
          <Card className="h-[calc(100vh-160px)] flex flex-col">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <CardHeader className="pb-0 border-b">
                <TabsList className="w-full justify-start gap-4 bg-transparent">
                  <TabsTrigger value="chat" className="gap-2" data-testid="tab-chat">
                    <MessageSquare className="h-4 w-4" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="editor" className="gap-2" data-testid="tab-editor">
                    <FileText className="h-4 w-4" />
                    Editor
                  </TabsTrigger>
                </TabsList>
              </CardHeader>
              
              <TabsContent value="chat" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages?.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        data-testid={`message-${msg.role}-${msg.id}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg px-4 py-2 text-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{msg.content}</p>
                          <span className="text-xs opacity-60 mt-1 block">
                            {format(new Date(msg.createdAt!), "HH:mm")}
                          </span>
                        </div>
                      </div>
                    ))}
                    {sendMessage.isPending && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-lg px-4 py-3">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                {/* Chat Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Textarea
                      ref={textareaRef}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Digite os dados do dia: labs, sintomas, exame físico..."
                      className="resize-none min-h-[80px]"
                      data-testid="input-chat"
                    />
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="icon"
                        onClick={handleSendMessage}
                        disabled={sendMessage.isPending || !chatInput.trim()}
                        data-testid="button-send"
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={handleGenerateEvolution}
                        disabled={generateEvolution.isPending || !chatInput.trim()}
                        title="Gerar Evolução Completa"
                        data-testid="button-generate"
                      >
                        {generateEvolution.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Enter = enviar mensagem rápida | Clique em <Sparkles className="h-3 w-3 inline" /> para gerar evolução completa
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="editor" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
                <div className="flex-1 p-4 flex flex-col">
                  <Textarea
                    value={generatedContent}
                    onChange={(e) => setGeneratedContent(e.target.value)}
                    className="flex-1 font-mono text-sm resize-none"
                    placeholder="A evolução gerada aparecerá aqui. Use o chat para enviar os dados e gerar."
                    data-testid="textarea-evolution"
                  />
                </div>
                <div className="p-4 border-t flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCopy}
                      disabled={!generatedContent}
                      data-testid="button-copy"
                    >
                      {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copied ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                  <Button 
                    onClick={handleSaveEvolution}
                    disabled={!generatedContent || createEvolution.isPending}
                    data-testid="button-save-evolution"
                  >
                    {createEvolution.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Salvar Evolução
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Right Sidebar - History */}
        <div className="lg:col-span-3">
          <Card className="h-[calc(100vh-160px)] flex flex-col">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico de Evoluções
              </CardTitle>
            </CardHeader>
            <ScrollArea className="flex-1">
              <CardContent className="p-3 space-y-3">
                {evolutions?.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    Nenhuma evolução registrada.
                  </div>
                ) : (
                  evolutions?.map((evo) => (
                    <div 
                      key={evo.id} 
                      className="group p-3 rounded-lg border hover-elevate cursor-pointer"
                      onClick={() => {
                        setGeneratedContent(evo.content);
                        setActiveTab("editor");
                      }}
                      data-testid={`evolution-item-${evo.id}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                          {format(new Date(evo.date), "dd/MM")}
                        </span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExport(evo.id);
                          }}
                          title="Baixar Word"
                          data-testid={`button-export-${evo.id}`}
                        >
                          <Download className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-4 font-mono leading-relaxed">
                        {evo.content.substring(0, 200)}...
                      </p>
                    </div>
                  ))
                )}
              </CardContent>
            </ScrollArea>
          </Card>
        </div>
      </main>
    </div>
  );
}
