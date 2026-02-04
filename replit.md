# HematoInfecto - Medical Evolution Assistant

## Overview

This is a specialized medical application for infectious disease consultants (R3 Infectologia) at Instituto de Infectologia Emílio Ribas (IIER). The system helps manage hematology-infectious disease patients by generating standardized clinical evolutions from raw patient data, lab results, and notes using AI assistance.

The application enables:
- Patient registry management with detailed hematological and infectious disease data
- AI-powered generation of standardized clinical evolution documents using the complete Tazy template
- Real-time chat-based interaction for each patient's case
- Export of evolutions to Word documents for electronic medical records (Tazy)
- Automatic calculation of antibiotic days (Dn) and trend analysis
- Missing data alerts to identify incomplete patient information
- Reading suggestions for relevant medical literature
- Colonization-based treatment recommendations (KPC, NDM, VRE, ESBL protocols)

## Key Features

### Patient Management
- **Unit-based organization**: Patients grouped by Hematologia, TMO, or Externos
- **Leito tracking**: Bed/room number display and filtering
- **Colonization alerts**: Visual badges for MDR organisms (KPC, NDM, VRE, ESBL)
- **Comprehensive data capture**: QT protocols, TCTH status, prophylaxis, preceptor

### Evolution Generation
- **Complete template**: All sections required for Tazy electronic records
- **Intelligent updates**: New patient vs. follow-up handling
- **Lab formatting**: Standardized abbreviated format for clinical data
- **Impression section**: AI-generated case summary with highlights

### Chat Interface
- **Per-patient conversations**: Separate chat history for each patient
- **Quick messages**: Send informal updates via Enter key
- **Full evolution**: Generate complete formatted evolution with one click
- **Context awareness**: AI uses previous evolutions and patient data

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom medical-themed color palette (blue/professional)
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Style**: RESTful JSON API with typed route definitions
- **AI Integration**: OpenAI API (via Replit AI Integrations) for:
  - Clinical evolution generation from raw patient data
  - Text-to-speech and speech-to-text capabilities
  - Image generation support
- **Document Generation**: docx library for Word document export

### Data Layer
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Management**: Drizzle Kit for migrations (`db:push` command)
- **Validation**: Zod schemas with drizzle-zod integration for type-safe database operations

### Key Data Models
- **Patients**: Comprehensive hematology patient records including diagnosis, protocols, colonization status, prophylaxis
- **Evolutions**: Clinical evolution documents linked to patients with raw input and AI-generated content
- **PatientMessages**: Chat history for AI-assisted patient management
- **Conversations/Messages**: General chat storage for voice/text AI interactions

### Project Structure
```
client/           # React frontend
  src/
    components/   # UI components including shadcn/ui
    hooks/        # React Query hooks for data fetching
    pages/        # Route components (Patients, PatientDetail)
    lib/          # Utilities and query client
server/           # Express backend
  routes.ts       # API endpoints with AI integration
  storage.ts      # Database access layer
  replit_integrations/  # AI capabilities (audio, chat, image, batch)
shared/           # Shared types and schemas
  schema.ts       # Drizzle database schema
  routes.ts       # API route type definitions
```

## External Dependencies

### Database
- **PostgreSQL**: Primary database via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage for Express

### AI Services (via Replit AI Integrations)
- **OpenAI API**: Configured through `AI_INTEGRATIONS_OPENAI_API_KEY` and `AI_INTEGRATIONS_OPENAI_BASE_URL`
- Used for clinical text generation, voice transcription, and text-to-speech

### Key npm Packages
- **drizzle-orm/drizzle-kit**: Database ORM and migration tooling
- **@tanstack/react-query**: Async state management
- **docx**: Microsoft Word document generation
- **date-fns**: Date formatting and manipulation
- **zod**: Schema validation
- **Radix UI**: Accessible component primitives

### Development Tools
- **Vite**: Frontend build tool with HMR
- **esbuild**: Server bundling for production
- **tsx**: TypeScript execution for development