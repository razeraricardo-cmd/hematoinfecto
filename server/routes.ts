import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api, authApi, culturesApi, antibioticsApi, alertsApi, templatesApi, dashboardApi, searchApi, exportApi, voiceApi, ocrApi, auditApi } from "@shared/routes";
import { z } from "zod";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import { openai } from "./replit_integrations/audio/client";
import session from "express-session";
import MemoryStore from "memorystore";
import jwt from "jsonwebtoken";
import multer from "multer";

const JWT_SECRET = process.env.SESSION_SECRET || "hematoinfecto-secret-key";
const upload = multer({ storage: multer.memoryStorage() });

// Extend session
declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

// System prompt completo para o assistente de hematoinfectologia
const SYSTEM_PROMPT = `Você é um assistente médico especializado em infectologia hospitalar, atuando como suporte para um R3 de Infectologia do Instituto de Infectologia Emílio Ribas (IIER) que faz interconsulta no serviço de Hematoinfectologia (DIPA Onco-Hemato) do Hospital São Paulo/UNIFESP.

────────────────────────────────────────────────────
SUA FUNÇÃO
────────────────────────────────────────────────────

Quando o usuário fornecer dados de um paciente (em qualquer formato: texto livre, foto de planilha de labs, PDF, anotações rápidas), você deve:

1. INTERPRETAR os dados fornecidos e organizá-los
2. PREENCHER o template de evolução padronizado abaixo
3. DEVOLVER a evolução completa e formatada, pronta para colar no prontuário eletrônico (Tazy)

────────────────────────────────────────────────────
REGRAS GERAIS
────────────────────────────────────────────────────

- Use SEMPRE o template abaixo, na ordem exata, sem pular seções
- Se uma informação não foi fornecida, escreva "Não consta." naquela seção
- Se o paciente é novo (primeira evolução), preencha tudo
- Se é atualização de paciente já conhecido, aproveite dados prévios e atualize apenas o que mudou
- SEMPRE coloque uma linha separadora (───────────────────────────────────) entre cada seção principal
- Labs devem seguir o formato abreviado padronizado
- Na assinatura, use SEMPRE: "Avaliado por Ricardo Razera - R3 Infectologia, Instituto de Infectologia Emílio Ribas"
- Condutas devem sempre iniciar com "Discutidas conjuntamente com a preceptoria (Dr./Dra. [NOME]):"
- Cada item de conduta deve ser um bullet separado e autoexplicativo
- Use "-" como marcador de lista
- NUNCA use markdown (sem ** ou ## ou outros caracteres de formatação)
- Texto limpo, sem negrito, sem itálico

────────────────────────────────────────────────────
FORMATO DE LABS ABREVIADOS
────────────────────────────────────────────────────

Padrão:
- DD/MM/AA = Hb X,X | Ht XX,X | Leuco. XXXX (N XXXX, L XXX) | Plaq. XX.000 | PCR XX,X | Na XXX | K X,X | Cr X,XX (ClCr XXX) | U XX

Complementares quando disponíveis (adicionar na mesma linha):
| Mg X,X | P X,X | CaT X,X | Cai X,XX | DHL XXX | Ác úr X,X | Alb X,X

Hepatograma (se disponível):
| TGO XX | TGP XX | BT X,XX (BD X,XX/BI X,XX) | GGT XX | FA XX

Coagulação: | INR X,XX | TTPA R X,XX | Fibrinogênio XXX

Gasometria venosa (linha separada):
- DD/MM/AA gV = pH X,XX | pCO2 XX,X | HCO3 XX,X | BE ±X,X | Lac XX | Na XXX | K X,X | Cai X,XX | Cl XXX | Gli XXX

Vancocinemia: incluir como "Vanco XX" na linha do dia correspondente
Nível de voriconazol: incluir como "Nível vori X,X" na linha do dia

────────────────────────────────────────────────────
TEMPLATE DE EVOLUÇÃO
────────────────────────────────────────────────────

INTERCONSULTA — SERVIÇO DE HEMATOINFECTOLOGIA
───────────────────────────────────
DATA: DD/MM/AA
───────────────────────────────────
ID: [Nome completo], [idade] anos, natural e procedente de [cidade] ([UF]).
LEITO: [Leito]
DIH: DD/MM/AA
───────────────────────────────────
HD HEMATO:
1. [Diagnóstico hematológico principal com data de Dx]
───────────────────────────────────
Checklist pré-QT:
- ECO TT: [data] - [resultado resumido]
- Carenciais: [data] - [valores]
- Sorologias: [data] - [resultados relevantes]
- Ivermectina: [dose] em [data]
───────────────────────────────────
TRATAMENTO HEMATO:
Atuais:
- [Protocolo QT atual com datas]
Prévios:
- [Protocolos prévios resumidos com datas e respostas]
───────────────────────────────────
HD OUTROS:
- [Comorbidades]

Antecedentes patológicos:
- [Antecedentes relevantes]
───────────────────────────────────
HD INFECÇÃO:
1. [Diagnóstico infeccioso 1]
2. [Diagnóstico infeccioso 2]
[Detalhamento clínico-cronológico de cada HD infeccioso quando relevante]
───────────────────────────────────
HD RESOLVIDOS:
- [Problemas infecciosos resolvidos com datas]
───────────────────────────────────
PROFILAXIAS:
- [Lista de profilaxias atuais com doses]
───────────────────────────────────
ATB:
Atual:
- [ATB atual com dose, frequência e data de início — calcular Dn]
Prévio:
- [ATBs prévios com datas início-fim]
───────────────────────────────────
OUTROS MED/IMUNOSSUPRESSORES:
- [Medicações relevantes]
───────────────────────────────────
MUC:
- [Medicações de uso contínuo/domiciliar se disponíveis]
───────────────────────────────────
EVOLUÇÃO/SINTOMAS:
[Texto corrido descritivo: estado geral, estabilidade hemodinâmica, febre, queixas, aceitação dieta, eliminações]
───────────────────────────────────
CONTROLES: Tax [range] | FC [range] | PAM [range] | Sat O2 [valor]
───────────────────────────────────
DISPOSITIVOS:
Atuais:
- [Dispositivos invasivos atuais com data e aspecto]
Prévios:
- [Dispositivos retirados com data e motivo]
───────────────────────────────────
EXAME FÍSICO:
- ECT: [estado geral]
- NEURO: [exame neurológico]
- ORO: [oroscopia]
- AR: [aparelho respiratório]
- ACV: [aparelho cardiovascular]
- ABD: [abdome]
- EXT: [extremidades]
- LINFO: [cadeias linfonodais]
- PELE: [lesões cutâneas]
- FÂNEROS: [unhas, cabelos]
- GENITÁLIA: [se examinada]
───────────────────────────────────
EXAMES LAB:
[Labs em formato abreviado padronizado, um por linha, ordem cronológica]
───────────────────────────────────
EXAMES OUTROS/INFECTO/INVESTIGAÇÃO:
Sorologias:
- [Sorologias com data e resultado]

Séricos:
- [Galactomanana, CrAg, PCRs moleculares, etc.]

Lavado Broncoalveolar:
- [Resultados LBA com data]

Culturas:
- [HMCs, URCs com data, agente, antibiograma e TP]

Vigilância (Swab Anal):
- [Resultados com datas]

Ag. urinários:
- [Legionella, pneumococo se realizados]

Líquor:
- [Resultados de LCR com datas]

Níveis séricos de antimicrobianos:
- [Vancocinemia, nível voriconazol, etc.]
───────────────────────────────────
IMAGENS:
- [Exames de imagem relevantes com data e achados resumidos]
───────────────────────────────────
AGUARDA:
- [Lista de resultados/procedimentos pendentes]
───────────────────────────────────
IMPRESSÃO:
[Resumo do paciente desde a internação com highlights, principais diagnósticos hematológicos e infecciosos, estado atual, como evoluiu e principais updates recentes]
───────────────────────────────────
CONDUTA:
Discutidas conjuntamente com a preceptoria (Dr./Dra. [NOME]):
- [Conduta 1]
- [Conduta 2]
- [Conduta N]
───────────────────────────────────
Avaliado por Ricardo Razera - R3 Infectologia
Instituto de Infectologia Emílio Ribas

────────────────────────────────────────────────────
REGRAS DE PREENCHIMENTO INTELIGENTE
────────────────────────────────────────────────────

PACIENTE NOVO (primeira evolução):
- Preencha TODAS as seções do template
- Se dados essenciais estão faltando, liste quais são e peça ao usuário
- Dados essenciais mínimos: Nome, HD Hemato, HD Infecto, ATBs, Labs recentes

PACIENTE CONHECIDO (atualização):
- Mantenha todo o histórico prévio intacto
- Atualize: data, evolução/sintomas, exame físico, labs novos (ADICIONAR, nunca substituir), condutas
- Calcule o Dn (dia de tratamento) dos ATBs atualizando a partir da data de início
- Se houve mudança em HD, ATBs, profilaxias, dispositivos → atualize
- Se nada mudou em uma seção → mantenha como estava
- Na evolução de seguimento, inclua apenas as seções ID e Checklist pré-QT se houver algo novo

CÁLCULOS AUTOMÁTICOS:
- Dn de antibióticos: contar dias desde D1 até a data da evolução
- Tendências: mencionar na evolução se relevante (ex: "PCR em queda de XX para XX" ou "Neutrófilos em recuperação")

COLONIZAÇÃO → PLANO NF (sempre incluir na conduta):
- KPC → Meropenem + Polimixina + HMC
- NDM → Polimixina (ou CAZ-AVI + Aztreonam) + HMC
- KPC + NDM → Meropenem + Polimixina + HMC (ou CAZ-AVI + Aztreonam + Polimixina)
- VRE → acrescentar Linezolida ou Daptomicina
- ESBL → Meropenem
- Swab negativo ou não colhido → Cefepime padrão (+ Vancomicina se indicação clínica)

PROFILAXIAS PADRÃO (referência):
- Aciclovir: virtualmente todos
- Fluconazol: neutropênicos sem indicação de anti-Aspergillus (suspender se recuperou neutrófilos)
- Voriconazol: se IFI provável/comprovada ou alto risco Aspergillus
- SMX-TMP: pós-TCTH, corticoterapia prolongada, LLA
- Entecavir: HBsAg+ (NUNCA suspender em imunossuprimido)

────────────────────────────────────────────────────
ABREVIAÇÕES ACEITAS
────────────────────────────────────────────────────
ACV=Aciclovir | FCZ=Fluconazol | VCZ=Voriconazol | SMX-TMP=Bactrim | NF=Neutropenia febril | ICS=Infecção de corrente sanguínea | HMC=Hemocultura | SP=Sangue periférico | MSD/MSE=Membro superior D/E | CAER=Cultura aeróbia | TP=Tempo positividade | EI=Endocardite infecciosa | IFI=Infecção fúngica invasiva | Bx=Biópsia | LBA=Lavado broncoalveolar | gV=Gasometria venosa | DVA=Droga vasoativa | AVP=Acesso venoso periférico | CVC=Cateter venoso central | MDR=Multirresistente | TRM=Teste rápido molecular`;

// Auth middleware
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      const user = await storage.getUser(decoded.userId);
      if (user) {
        (req as any).user = user;
        return next();
      }
    } catch (err) {
      // Token invalid
    }
  }

  // Check session as fallback
  if (req.session?.userId) {
    const user = await storage.getUser(req.session.userId);
    if (user) {
      (req as any).user = user;
      return next();
    }
  }

  // Allow anonymous access for now (can be enabled later)
  next();
};

// Audit helper
const createAuditLog = async (
  req: Request,
  action: string,
  entityType: string,
  entityId?: number,
  previousData?: any,
  newData?: any
) => {
  const userId = (req as any).user?.id;
  await storage.createAuditLog({
    userId,
    action,
    entityType,
    entityId,
    previousData,
    newData,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session setup
  const SessionStore = MemoryStore(session);
  app.use(session({
    store: new SessionStore({ checkPeriod: 86400000 }),
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
  }));

  // ==================== AUTH ROUTES ====================
  app.post(authApi.login.path, async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.verifyUserPassword(username, password);

      if (!user) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '24h' });
      req.session.userId = user.id;

      await createAuditLog(req, 'login', 'user', user.id);

      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Erro ao fazer login" });
    }
  });

  app.post(authApi.register.path, async (req, res) => {
    try {
      const input = authApi.register.input.parse(req.body);

      // Check if username or email already exists
      const existingUsername = await storage.getUserByUsername(input.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Nome de usuário já existe", field: "username" });
      }

      const existingEmail = await storage.getUserByEmail(input.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email já cadastrado", field: "email" });
      }

      const user = await storage.createUser(input);
      await createAuditLog(req, 'create', 'user', user.id, null, { ...input, password: '[REDACTED]' });

      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.get(authApi.me.path, requireAuth, async (req, res) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Não autenticado" });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  });

  app.post(authApi.logout.path, async (req, res) => {
    const userId = req.session?.userId;
    if (userId) {
      await createAuditLog(req, 'logout', 'user', userId);
    }
    req.session.destroy(() => {});
    res.json({ message: "Logout realizado com sucesso" });
  });

  // ==================== PATIENTS ====================
  app.get(api.patients.list.path, async (req, res) => {
    const patients = await storage.getPatients();
    res.json(patients);
  });

  app.get(api.patients.get.path, async (req, res) => {
    const patient = await storage.getPatient(Number(req.params.id));
    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }
    res.json(patient);
  });

  app.post(api.patients.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.patients.create.input.parse(req.body);
      const patient = await storage.createPatient(input);
      await createAuditLog(req, 'create', 'patient', patient.id, null, input);
      res.status(201).json(patient);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.patch(api.patients.update.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const patient = await storage.getPatient(id);
      if (!patient) {
        return res.status(404).json({ message: "Patient not found" });
      }
      const input = api.patients.update.input.parse(req.body);
      const updated = await storage.updatePatient(id, input);
      await createAuditLog(req, 'update', 'patient', id, patient, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // ==================== EVOLUTIONS ====================
  app.get(api.evolutions.list.path, async (req, res) => {
    const evolutions = await storage.getEvolutions(Number(req.params.patientId));
    res.json(evolutions);
  });

  app.get(api.evolutions.get.path, async (req, res) => {
    const evolution = await storage.getEvolution(Number(req.params.id));
    if (!evolution) {
      return res.status(404).json({ message: "Evolution not found" });
    }
    res.json(evolution);
  });

  app.post(api.evolutions.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.evolutions.create.input.parse(req.body);
      const evolution = await storage.createEvolution(input);
      await createAuditLog(req, 'create', 'evolution', evolution.id, null, input);
      res.status(201).json(evolution);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  // ==================== AI GENERATION ====================
  app.post(api.evolutions.generate.path, async (req, res) => {
    try {
      const { patientId, rawInput, includeImpression = true, includeSuggestions = false } = req.body;

      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(400).json({ message: "Patient not found" });
      }

      // Get active antibiotics with calculated days
      const patientATBs = await storage.getAntibiotics(patientId);
      const activeATBs = patientATBs.filter(a => a.status === 'active');

      // Build context from patient data
      let context = `DADOS DO PACIENTE CADASTRADO:\n`;
      context += `Nome: ${patient.name}\n`;
      context += `Idade: ${patient.age} anos\n`;
      context += `Cidade/UF: ${patient.city} - ${patient.state}\n`;
      context += `Leito: ${patient.leito || "Não informado"}\n`;
      context += `Unidade: ${patient.unidade || "Não informada"}\n`;
      context += `DIH: ${new Date(patient.dih).toLocaleDateString('pt-BR')}\n`;
      context += `HD Hemato: ${patient.hematologicalDiagnosis}\n`;

      if (patient.hematologicalDiagnosisDate) {
        context += `Data Dx Hemato: ${new Date(patient.hematologicalDiagnosisDate).toLocaleDateString('pt-BR')}\n`;
      }
      if (patient.currentProtocol) {
        context += `Protocolo Atual: ${patient.currentProtocol}\n`;
      }
      if (patient.previousProtocols) {
        context += `Protocolos Prévios: ${patient.previousProtocols}\n`;
      }
      if (patient.tcth) {
        context += `TCTH: ${patient.tcth}\n`;
      }
      if (patient.colonization) {
        context += `Colonização: ${patient.colonization}\n`;
      }
      if (patient.comorbidities) {
        context += `Comorbidades: ${patient.comorbidities}\n`;
      }
      if (patient.antecedents) {
        context += `Antecedentes: ${patient.antecedents}\n`;
      }
      if (patient.ecoTT) {
        context += `ECO TT: ${patient.ecoTT}\n`;
      }
      if (patient.carenciais) {
        context += `Carenciais: ${patient.carenciais}\n`;
      }
      if (patient.serologias) {
        context += `Sorologias: ${patient.serologias}\n`;
      }
      if (patient.ivermectina) {
        context += `Ivermectina: ${patient.ivermectina}\n`;
      }
      if (patient.prophylaxis) {
        context += `Profilaxias: ${patient.prophylaxis}\n`;
      }
      if (patient.muc) {
        context += `MUC: ${patient.muc}\n`;
      }
      if (patient.defaultPreceptor) {
        context += `Preceptor: ${patient.defaultPreceptor}\n`;
      }

      // Add active antibiotics with calculated days
      if (activeATBs.length > 0) {
        context += `\nANTIBIÓTICOS ATIVOS:\n`;
        for (const atb of activeATBs) {
          const startDate = new Date(atb.startDate);
          const today = new Date();
          const diffDays = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
          context += `- ${atb.name} ${atb.dose || ''} ${atb.frequency || ''} - D${diffDays} (início ${startDate.toLocaleDateString('pt-BR')}) - ${atb.indication || ''}\n`;
        }
      }

      // Get pending cultures
      const patientCultures = await storage.getCultures(patientId);
      const pendingCultures = patientCultures.filter(c => c.status === 'pending');
      if (pendingCultures.length > 0) {
        context += `\nCULTURAS PENDENTES:\n`;
        for (const culture of pendingCultures) {
          context += `- ${culture.type} ${culture.site || ''} coletada ${new Date(culture.collectionDate).toLocaleDateString('pt-BR')}\n`;
        }
      }

      // Get previous evolution if exists
      const prevEvolution = await storage.getLatestEvolution(patientId);
      if (prevEvolution) {
        context += `\n────────────────────────────────────────\nEVOLUÇÃO ANTERIOR (${new Date(prevEvolution.date).toLocaleDateString('pt-BR')}):\n${prevEvolution.content}\n`;
      }

      // Generate with AI
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `${context}\n\n────────────────────────────────────────\nDADOS DE HOJE / INPUT DO USUÁRIO:\n${rawInput}\n\nGere a evolução completa no template padronizado. A data de hoje é ${new Date().toLocaleDateString('pt-BR')}.${includeImpression ? '\n\nInclua a seção IMPRESSÃO com um resumo do caso.' : ''}`
        }
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_tokens: 4096,
      });

      const content = completion.choices[0].message.content || "";

      // Detect missing data
      const missingDataAlerts: string[] = [];
      if (!patient.colonization) {
        missingDataAlerts.push("Swab de vigilância não cadastrado");
      }
      if (!patient.prophylaxis) {
        missingDataAlerts.push("Profilaxias não cadastradas");
      }
      if (!patient.defaultPreceptor) {
        missingDataAlerts.push("Preceptor não cadastrado");
      }
      if (!rawInput.toLowerCase().includes("labs") && !rawInput.toLowerCase().includes("hb") && !rawInput.toLowerCase().includes("leuco")) {
        missingDataAlerts.push("Labs do dia não informados");
      }

      // Generate reading suggestions if requested
      let readingSuggestions: { title: string; source: string; summary: string }[] | undefined;

      if (includeSuggestions) {
        try {
          const suggestionsCompletion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: "Você é um especialista em literatura médica de infectologia e hematologia. Sugira 2-3 leituras relevantes para o caso, focando em guidelines e revisões de alto impacto. Responda em formato JSON: {\"suggestions\": [{\"title\": \"...\", \"source\": \"...\", \"summary\": \"...\"}]}"
              },
              {
                role: "user",
                content: `Caso: ${patient.hematologicalDiagnosis}. HD Infecto mencionados no input: ${rawInput.substring(0, 500)}`
              }
            ],
            max_tokens: 1024,
            response_format: { type: "json_object" }
          });

          const suggestionsText = suggestionsCompletion.choices[0].message.content || "{}";
          const parsed = JSON.parse(suggestionsText);
          readingSuggestions = parsed.suggestions || [];
        } catch {
          // Ignore parsing errors
        }
      }

      // Extract impression from content if present
      let impression: string | undefined;
      const impressionMatch = content.match(/IMPRESSÃO:\n([\s\S]*?)(?=───────|CONDUTA:|$)/);
      if (impressionMatch) {
        impression = impressionMatch[1].trim();
      }

      res.json({
        content,
        impression,
        missingDataAlerts: missingDataAlerts.length > 0 ? missingDataAlerts : undefined,
        readingSuggestions,
      });

    } catch (error) {
      console.error("AI Generation error:", error);
      res.status(500).json({ message: "Failed to generate evolution" });
    }
  });

  // ==================== MESSAGES (Chat por paciente) ====================
  app.get(api.messages.list.path, async (req, res) => {
    const messages = await storage.getMessages(Number(req.params.patientId));
    res.json(messages);
  });

  app.post(api.messages.send.path, async (req, res) => {
    try {
      const patientId = Number(req.params.patientId);
      const { content } = req.body;

      const patient = await storage.getPatient(patientId);
      if (!patient) {
        return res.status(400).json({ message: "Patient not found" });
      }

      // Save user message
      const userMessage = await storage.createMessage({
        patientId,
        role: "user",
        content,
        messageType: "chat",
      });

      // Get conversation history
      const history = await storage.getMessages(patientId);
      const chatHistory = history.slice(-10).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      // Build context
      let patientContext = `Paciente: ${patient.name}, ${patient.age}a, Leito: ${patient.leito || "?"}\n`;
      patientContext += `HD Hemato: ${patient.hematologicalDiagnosis}\n`;
      if (patient.colonization) {
        patientContext += `Colonização: ${patient.colonization}\n`;
      }

      // Get latest evolution
      const latestEvol = await storage.getLatestEvolution(patientId);
      if (latestEvol) {
        patientContext += `Última evolução: ${new Date(latestEvol.date).toLocaleDateString('pt-BR')}\n`;
      }

      // Determine if this is an evolution request
      const isEvolutionRequest = content.toLowerCase().includes("evolução") ||
                                  content.toLowerCase().includes("evoluç") ||
                                  content.toLowerCase().includes("gera") ||
                                  content.toLowerCase().includes("update");

      let systemMessage = `Você é o assistente de hematoinfectologia do Dr. Ricardo Razera. Contexto do paciente:\n${patientContext}\n\n`;

      if (isEvolutionRequest) {
        systemMessage += SYSTEM_PROMPT;
      } else {
        systemMessage += `Responda de forma concisa e útil. Se o usuário pedir evolução, labs formatados, ou Word, use o template padronizado. Se fizer perguntas gerais sobre o caso, responda com base no contexto.`;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemMessage },
          ...chatHistory,
          { role: "user", content }
        ],
        max_tokens: 4096,
      });

      const assistantContent = completion.choices[0].message.content || "";

      // Save assistant message
      const assistantMessage = await storage.createMessage({
        patientId,
        role: "assistant",
        content: assistantContent,
        messageType: isEvolutionRequest ? "evolution" : "chat",
      });

      // If it was an evolution, also save as evolution
      let evolution;
      if (isEvolutionRequest && assistantContent.includes("INTERCONSULTA")) {
        evolution = await storage.createEvolution({
          patientId,
          date: new Date(),
          content: assistantContent,
          isDraft: true,
        });
      }

      res.json({
        userMessage,
        assistantMessage,
        evolution,
      });

    } catch (error) {
      console.error("Message error:", error);
      res.status(500).json({ message: "Failed to process message" });
    }
  });

  // ==================== CULTURES ====================
  app.get(culturesApi.list.path, async (req, res) => {
    const cultures = await storage.getCultures(Number(req.params.patientId));
    res.json(cultures);
  });

  app.get(culturesApi.pending.path, async (req, res) => {
    const cultures = await storage.getPendingCultures();
    res.json(cultures);
  });

  app.post(culturesApi.create.path, requireAuth, async (req, res) => {
    try {
      const input = culturesApi.create.input.parse(req.body);
      const culture = await storage.createCulture(input);
      await createAuditLog(req, 'create', 'culture', culture.id, null, input);
      res.status(201).json(culture);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.patch(culturesApi.update.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const culture = await storage.getCulture(id);
      if (!culture) {
        return res.status(404).json({ message: "Culture not found" });
      }
      const input = culturesApi.update.input.parse(req.body);
      const updated = await storage.updateCulture(id, input);
      await createAuditLog(req, 'update', 'culture', id, culture, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.post(culturesApi.updateResult.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const culture = await storage.getCulture(id);
      if (!culture) {
        return res.status(404).json({ message: "Culture not found" });
      }
      const { status, organism, antibiogram, positivityTime } = req.body;
      const updated = await storage.updateCulture(id, {
        status,
        organism,
        antibiogram,
        positivityTime,
        resultDate: new Date(),
      });
      await createAuditLog(req, 'update', 'culture', id, culture, { status, organism, antibiogram, positivityTime });
      res.json(updated);
    } catch (err) {
      throw err;
    }
  });

  // ==================== ANTIBIOTICS ====================
  app.get(antibioticsApi.list.path, async (req, res) => {
    const antibiotics = await storage.getAntibiotics(Number(req.params.patientId));
    res.json(antibiotics);
  });

  app.get(antibioticsApi.active.path, async (req, res) => {
    const activeATBs = await storage.getActiveAntibiotics();
    res.json(activeATBs.map(a => ({
      antibiotic: a,
      patient: a.patient,
      currentDay: a.currentDay,
    })));
  });

  app.post(antibioticsApi.create.path, requireAuth, async (req, res) => {
    try {
      const input = antibioticsApi.create.input.parse(req.body);
      const antibiotic = await storage.createAntibiotic(input);
      await createAuditLog(req, 'create', 'antibiotic', antibiotic.id, null, input);
      res.status(201).json(antibiotic);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.patch(antibioticsApi.update.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const antibiotic = await storage.getAntibiotic(id);
      if (!antibiotic) {
        return res.status(404).json({ message: "Antibiotic not found" });
      }
      const input = antibioticsApi.update.input.parse(req.body);
      const updated = await storage.updateAntibiotic(id, input);
      await createAuditLog(req, 'update', 'antibiotic', id, antibiotic, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.post(antibioticsApi.stop.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const antibiotic = await storage.getAntibiotic(id);
      if (!antibiotic) {
        return res.status(404).json({ message: "Antibiotic not found" });
      }
      const { reason } = req.body;
      const updated = await storage.stopAntibiotic(id, reason);
      await createAuditLog(req, 'update', 'antibiotic', id, antibiotic, { status: 'completed', reason });
      res.json(updated);
    } catch (err) {
      throw err;
    }
  });

  // ==================== ALERTS ====================
  app.get(alertsApi.list.path, async (req, res) => {
    const alerts = await storage.getAlerts();
    res.json(alerts);
  });

  app.get(alertsApi.byPatient.path, async (req, res) => {
    const alerts = await storage.getAlertsByPatient(Number(req.params.patientId));
    res.json(alerts);
  });

  app.get(alertsApi.unread.path, async (req, res) => {
    const alerts = await storage.getUnreadAlerts();
    res.json(alerts);
  });

  app.post(alertsApi.create.path, requireAuth, async (req, res) => {
    try {
      const input = alertsApi.create.input.parse(req.body);
      const alert = await storage.createAlert(input);
      res.status(201).json(alert);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.post(alertsApi.markRead.path, async (req, res) => {
    const alert = await storage.markAlertRead(Number(req.params.id));
    res.json(alert);
  });

  app.post(alertsApi.resolve.path, requireAuth, async (req, res) => {
    const userId = (req as any).user?.id;
    const alert = await storage.resolveAlert(Number(req.params.id), userId);
    res.json(alert);
  });

  // ==================== TEMPLATES ====================
  app.get(templatesApi.list.path, async (req, res) => {
    const templates = await storage.getTemplates();
    res.json(templates);
  });

  app.get(templatesApi.get.path, async (req, res) => {
    const template = await storage.getTemplate(Number(req.params.id));
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    res.json(template);
  });

  app.post(templatesApi.create.path, requireAuth, async (req, res) => {
    try {
      const input = templatesApi.create.input.parse(req.body);
      const userId = (req as any).user?.id;
      const template = await storage.createTemplate({ ...input, createdBy: userId });
      await createAuditLog(req, 'create', 'template', template.id, null, input);
      res.status(201).json(template);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.patch(templatesApi.update.path, requireAuth, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const template = await storage.getTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }
      const input = templatesApi.update.input.parse(req.body);
      const updated = await storage.updateTemplate(id, input);
      await createAuditLog(req, 'update', 'template', id, template, input);
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message, field: err.errors[0].path.join('.') });
      }
      throw err;
    }
  });

  app.delete(templatesApi.delete.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const template = await storage.getTemplate(id);
    if (!template) {
      return res.status(404).json({ message: "Template not found" });
    }
    await storage.deleteTemplate(id);
    await createAuditLog(req, 'delete', 'template', id, template, null);
    res.json({ message: "Template deleted" });
  });

  // ==================== DASHBOARD ====================
  app.get(dashboardApi.stats.path, async (req, res) => {
    const stats = await storage.getDashboardStats();
    res.json(stats);
  });

  app.get(dashboardApi.atbTimeline.path, async (req, res) => {
    const timeline = await storage.getATBTimeline();
    res.json(timeline);
  });

  // ==================== SEARCH ====================
  app.post(searchApi.advanced.path, async (req, res) => {
    const params = searchApi.advanced.input.parse(req.body);
    const results = await storage.advancedSearch(params);
    res.json(results);
  });

  // ==================== EXPORT TO DOCX ====================
  app.post(api.evolutions.export.path, async (req, res) => {
    try {
      const evolution = await storage.getEvolution(Number(req.params.id));
      if (!evolution) {
        return res.status(404).json({ message: "Evolution not found" });
      }

      const patient = await storage.getPatient(evolution.patientId);
      await createAuditLog(req, 'export', 'evolution', evolution.id);

      // Create document with proper formatting
      const doc = new Document({
        sections: [{
          properties: {},
          children: evolution.content.split('\n').map(line => {
            const isSeparator = line.includes("────") || line.includes("───");
            const isHeader = line.match(/^[A-Z\s]+:$/) ||
                           line.startsWith("INTERCONSULTA") ||
                           line.startsWith("Avaliado por");

            if (isSeparator) {
              return new Paragraph({
                children: [new TextRun({ text: "", font: "Arial", size: 10 })],
              });
            }

            return new Paragraph({
              children: [
                new TextRun({
                  text: line,
                  font: "Arial",
                  size: 20, // 10pt
                  bold: isHeader ? true : false
                }),
              ],
            });
          }),
        }],
      });

      const buffer = await Packer.toBuffer(doc);

      const filename = patient
        ? `evolucao-${patient.name.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.docx`
        : `evolucao-${evolution.id}.docx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(buffer);

    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ message: "Failed to export document" });
    }
  });

  // ==================== EXPORT TO PDF ====================
  app.post(exportApi.pdf.path, async (req, res) => {
    try {
      const evolution = await storage.getEvolution(Number(req.params.id));
      if (!evolution) {
        return res.status(404).json({ message: "Evolution not found" });
      }

      const patient = await storage.getPatient(evolution.patientId);
      await createAuditLog(req, 'export', 'evolution', evolution.id);

      // Simple HTML to PDF approach using browser-friendly output
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; padding: 20px; }
            .header { font-weight: bold; margin-top: 10px; }
            .separator { border-top: 1px solid #ccc; margin: 5px 0; }
            pre { white-space: pre-wrap; font-family: Arial, sans-serif; font-size: 10pt; }
          </style>
        </head>
        <body>
          <pre>${evolution.content}</pre>
        </body>
        </html>
      `;

      const filename = patient
        ? `evolucao-${patient.name.replace(/\s+/g, '_')}-${new Date().toISOString().split('T')[0]}.html`
        : `evolucao-${evolution.id}.html`;

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(html);

    } catch (error) {
      console.error("PDF Export error:", error);
      res.status(500).json({ message: "Failed to export PDF" });
    }
  });

  // ==================== VOICE (Speech-to-Text) ====================
  app.post(voiceApi.transcribe.path, upload.single('audio'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      // Use OpenAI Whisper for transcription
      const transcription = await openai.audio.transcriptions.create({
        file: new File([req.file.buffer], 'audio.webm', { type: req.file.mimetype }),
        model: 'whisper-1',
        language: 'pt',
      });

      res.json({ text: transcription.text });
    } catch (error) {
      console.error("Transcription error:", error);
      res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });

  app.post(voiceApi.synthesize.path, async (req, res) => {
    try {
      const { text } = req.body;

      const mp3 = await openai.audio.speech.create({
        model: 'tts-1',
        voice: 'nova',
        input: text,
      });

      const buffer = Buffer.from(await mp3.arrayBuffer());

      res.setHeader('Content-Type', 'audio/mpeg');
      res.send(buffer);
    } catch (error) {
      console.error("Synthesis error:", error);
      res.status(500).json({ message: "Failed to synthesize speech" });
    }
  });

  // ==================== OCR (Image Analysis) ====================
  app.post(ocrApi.analyze.path, upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      const base64Image = req.file.buffer.toString('base64');
      const mimeType = req.file.mimetype;

      // Use GPT-4 Vision for OCR and lab extraction
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em extrair dados de laboratório de imagens médicas.
            Extraia todos os valores de laboratório visíveis na imagem e retorne em formato JSON estruturado.
            Se for uma imagem de exames laboratoriais, extraia: hemograma, bioquímica, função renal, eletrólitos, PCR, etc.
            Retorne: {"text": "texto extraído completo", "labs": {"Hb": "valor", "Leuco": "valor", ...}, "structured": true}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`
                }
              },
              {
                type: 'text',
                text: 'Extraia todos os dados de laboratório desta imagem em formato estruturado.'
              }
            ]
          }
        ],
        max_tokens: 2048,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(response.choices[0].message.content || '{}');
      res.json(result);
    } catch (error) {
      console.error("OCR error:", error);
      res.status(500).json({ message: "Failed to analyze image" });
    }
  });

  // ==================== AUDIT ====================
  app.get(auditApi.list.path, requireAuth, async (req, res) => {
    const logs = await storage.getAuditLogs(100);
    res.json(logs);
  });

  app.get(auditApi.byEntity.path, requireAuth, async (req, res) => {
    const { entityType, entityId } = req.params;
    const logs = await storage.getAuditLogsByEntity(entityType, Number(entityId));
    res.json(logs);
  });

  // Seed data
  await seedDatabase();

  return httpServer;
}

async function seedDatabase() {
  const patients = await storage.getPatients();
  if (patients.length === 0) {
    // Create default admin user
    try {
      await storage.createUser({
        username: 'admin',
        email: 'admin@hematoinfecto.com',
        password: 'admin123',
        name: 'Administrador',
        role: 'admin',
      });
    } catch (e) {
      // User might already exist
    }

    // Create sample patient
    const patient = await storage.createPatient({
      name: "Lucas Venancio",
      age: 38,
      city: "São Paulo",
      state: "SP",
      leito: "CMM A0307",
      unidade: "Hematologia",
      dih: new Date("2024-01-20"),
      hematologicalDiagnosis: "Sarcoma mieloide coluna T3-T6 - VIALE-A",
      hematologicalDiagnosisDate: new Date("2024-01-15"),
      currentProtocol: "VIALE-A",
      colonization: null,
      comorbidities: "Paraplegia",
      antecedents: "Úlcera sacral infectada, osteomielite",
      prophylaxis: "Aciclovir 400mg 8/8h + Voriconazol 200mg 12/12h",
      defaultPreceptor: "Dr. Ponzio",
      isActive: true,
    });

    // Create sample antibiotic
    await storage.createAntibiotic({
      patientId: patient.id,
      name: "Meropenem",
      dose: "1g",
      frequency: "8/8h",
      route: "IV",
      startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      indication: "Neutropenia febril",
      status: "active",
    });

    // Create sample culture
    await storage.createCulture({
      patientId: patient.id,
      type: "HMC",
      site: "CVC",
      collectionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      status: "pending",
    });

    await storage.createEvolution({
      patientId: patient.id,
      date: new Date(),
      content: `INTERCONSULTA — SERVIÇO DE HEMATOINFECTOLOGIA
───────────────────────────────────
DATA: ${new Date().toLocaleDateString('pt-BR')}
───────────────────────────────────
ID: Lucas Venancio, 38 anos, natural e procedente de São Paulo (SP).
LEITO: CMM A0307
DIH: 20/01/2024
───────────────────────────────────
HD HEMATO:
1. Sarcoma mieloide coluna T3-T6 - Dx 15/01/24
───────────────────────────────────
Checklist pré-QT:
- ECO TT: Não consta.
- Carenciais: Não consta.
- Sorologias: Não consta.
- Ivermectina: Não consta.
───────────────────────────────────
TRATAMENTO HEMATO:
Atuais:
- VIALE-A
Prévios:
- Não consta.
───────────────────────────────────
HD OUTROS:
- Paraplegia

Antecedentes patológicos:
- Úlcera sacral infectada, osteomielite
───────────────────────────────────
HD INFECÇÃO:
1. Osteomielite sacral
───────────────────────────────────
HD RESOLVIDOS:
- Não consta.
───────────────────────────────────
PROFILAXIAS:
- Aciclovir 400mg 8/8h
- Voriconazol 200mg 12/12h
───────────────────────────────────
ATB:
Atual:
- Meropenem 1g 8/8h IV - D3 (NF)
Prévio:
- Vancomicina + Piperacilina-Tazobactam 16-23/01
───────────────────────────────────
... (Evolução inicial - exemplo) ...
───────────────────────────────────
Avaliado por Ricardo Razera - R3 Infectologia
Instituto de Infectologia Emílio Ribas`,
      isDraft: false,
    });

    // Create default templates
    await storage.createTemplate({
      name: "Evolução Padrão",
      description: "Template padrão de interconsulta hematoinfectologia",
      category: "evolution",
      content: SYSTEM_PROMPT,
      isDefault: true,
      isPublic: true,
    });

    // Add initial welcome message
    await storage.createMessage({
      patientId: patient.id,
      role: "assistant",
      content: "Paciente cadastrado. Envie os dados do dia (labs, sintomas, exame físico) para gerar a evolução.",
      messageType: "chat",
    });
  }
}

const SYSTEM_PROMPT_SHORT = SYSTEM_PROMPT;
