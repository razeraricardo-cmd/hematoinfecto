# HematoInfecto - Medical Evolution Assistant

Sistema de assistência médica especializado para interconsultas de Infectologia no serviço de Hematoinfectologia (DIPA Onco-Hemato).

## Sobre

Aplicação desenvolvida para residentes R3 de Infectologia do Instituto de Infectologia Emílio Ribas (IIER) que realizam interconsultas no Hospital São Paulo/UNIFESP. O sistema gera evoluções clínicas padronizadas seguindo o template Tazy, gerencia dados de pacientes hematológicos e proporciona interações via chat com IA.

## Funcionalidades

### Gestão de Pacientes
- Organização por unidade (Hematologia, TMO, Externos)
- Rastreamento de leito/quarto
- Alertas visuais de colonização por organismos MDR (KPC, NDM, VRE, ESBL)
- Captura completa de dados: protocolos QT, status TCTH, profilaxias, preceptor

### Geração de Evolução com IA
- Template completo conforme exigido pelo prontuário eletrônico Tazy
- Cálculo automático de dias de antibiótico (Dn)
- Análise de tendência laboratorial
- Impressão do caso gerada automaticamente
- Alertas de dados faltantes
- Sugestões de leitura baseadas no caso

### Interface de Chat
- Conversas separadas por paciente
- Mensagens rápidas para atualizações informais
- Geração de evolução completa com um clique
- Contexto preservado entre interações

### Exportação
- Download de evoluções em formato Word (.docx)
- Formatação pronta para colar no prontuário eletrônico

## Stack Tecnológica

### Frontend
- React 18 + TypeScript
- Vite
- TanStack Query
- shadcn/ui + Tailwind CSS
- Wouter (routing)

### Backend
- Express.js + TypeScript
- PostgreSQL + Drizzle ORM
- OpenAI API (via Replit AI Integrations)
- docx (geração de documentos Word)

## Estrutura do Projeto

```
client/           # Frontend React
  src/
    components/   # Componentes UI
    hooks/        # Hooks React Query
    pages/        # Páginas (Patients, PatientDetail)
    lib/          # Utilitários

server/           # Backend Express
  routes.ts       # Endpoints da API
  storage.ts      # Camada de acesso ao banco
  
shared/           # Compartilhado
  schema.ts       # Schema do banco (Drizzle)
  routes.ts       # Definições de tipos de rotas
```

## Variáveis de Ambiente

- `DATABASE_URL` - URL de conexão PostgreSQL
- `SESSION_SECRET` - Segredo para sessões
- `AI_INTEGRATIONS_OPENAI_API_KEY` - Chave API OpenAI
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - URL base da API

## Instalação

```bash
npm install
npm run db:push
npm run dev
```

## Licença

MIT

---

Desenvolvido para uso no Instituto de Infectologia Emílio Ribas (IIER) e Hospital São Paulo/UNIFESP.
