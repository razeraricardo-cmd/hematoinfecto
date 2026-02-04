import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useCreateEvolution, useGenerateEvolution } from "@/hooks/use-evolutions";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Wand2, Save, FileText, Loader2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EvolutionEditorProps {
  patientId: number;
  lastEvolutionId?: number;
  onSuccess?: () => void;
}

export function EvolutionEditor({ patientId, lastEvolutionId, onSuccess }: EvolutionEditorProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("raw");
  const [rawInput, setRawInput] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  
  const createEvolution = useCreateEvolution();
  const generateEvolution = useGenerateEvolution();

  const handleGenerate = async () => {
    if (!rawInput.trim()) {
      toast({
        title: "Input required",
        description: "Please enter some notes or lab results first.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await generateEvolution.mutateAsync({
        patientId,
        rawInput,
        previousEvolutionId: lastEvolutionId,
      });
      
      setGeneratedContent(result.content);
      setActiveTab("preview");
      toast({
        title: "Generated",
        description: "Evolution draft created from your notes.",
      });
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Could not process the input with AI.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!generatedContent.trim()) {
       toast({
        title: "Empty content",
        description: "Cannot save an empty evolution.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createEvolution.mutateAsync({
        patientId,
        content: generatedContent,
        rawInput,
        date: new Date(),
        isDraft: false,
      });
      
      toast({
        title: "Saved",
        description: "Evolution recorded successfully.",
      });
      
      setRawInput("");
      setGeneratedContent("");
      setActiveTab("raw");
      onSuccess?.();
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Could not save the evolution.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-display font-semibold text-slate-800">New Evolution</h2>
        <div className="flex gap-2">
          {activeTab === "raw" ? (
            <Button 
              onClick={handleGenerate} 
              disabled={generateEvolution.isPending || !rawInput.trim()}
              className="bg-accent hover:bg-accent/90 text-white"
            >
              {generateEvolution.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Generate with AI
            </Button>
          ) : (
            <Button 
              onClick={handleSave} 
              disabled={createEvolution.isPending}
              className="btn-primary"
            >
              {createEvolution.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Evolution
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        {/* Left Side: Input */}
        <Card className="flex flex-col h-full shadow-md border-slate-200">
          <CardHeader className="bg-slate-50 border-b py-3">
            <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Raw Notes & Lab Results
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <Textarea 
              placeholder="Paste lab results, vital signs, and quick notes here...
Ex:
Hb 7.5, Leuco 0.3, Plaq 15k
Febrile peak 38.5 overnight
Started Meropenem D1
Patient complains of mucositis"
              className="h-full w-full resize-none border-0 p-4 focus-visible:ring-0 font-mono text-sm leading-relaxed"
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Right Side: Preview */}
        <Card className={cn(
          "flex flex-col h-full shadow-md border-slate-200 transition-all",
          activeTab === "raw" && "opacity-50 lg:opacity-100"
        )}>
          <CardHeader className="bg-slate-50 border-b py-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
              <Wand2 className="h-4 w-4" />
              Generated Evolution (Tazy Template)
            </CardTitle>
            {activeTab === "raw" && (
              <span className="text-xs text-muted-foreground hidden lg:inline-flex items-center">
                Click Generate to see result <ArrowRight className="ml-1 h-3 w-3" />
              </span>
            )}
          </CardHeader>
          <CardContent className="flex-1 p-0 relative">
             {generateEvolution.isPending && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm font-medium text-muted-foreground animate-pulse">
                  Structuring medical data...
                </p>
              </div>
            )}
            <Textarea 
              className="h-full w-full resize-none border-0 p-4 focus-visible:ring-0 font-mono text-sm leading-relaxed bg-slate-50/50"
              value={generatedContent}
              onChange={(e) => setGeneratedContent(e.target.value)}
              placeholder="Generated structured evolution will appear here..."
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
