# Architecture: Conversational Medical Intake App

## Components

### 1. Frontend (React)
- Responsive chat UI (Material UI or similar)
- Adaptive conversation engine (drives question flow)
- LOINC mapping utility (via Gemini 2.5, post-chat)
- Export module (Markdown, FHIR QuestionnaireResponse JSON)
- Voice input/output scaffolding (VAPI-ready)
- Questionnaire upload/ingestion UI (Markdown, PDF-to-text, CSV, etc.)
- Chat log browser modal (folders by day, files by session, view/download/delete)
- End Chat button triggers log save and FHIR export, then resets for new chat

### 2. LLM Integration
- API client for OpenAI/Gemini (configurable, Gemini 2.5 for coding/export)
- Handles prompt/response for chat and post-chat coding
- Domain-specific prompt/rules engine (injects medical best practices, e.g., biological relatives, clarification prompts, etc.)
- Specialized post-chat prompt for mapping transcript to FHIR QuestionnaireResponse with LOINC codes

### 3. Local Storage
- Store session data and responses in browser (localStorage or IndexedDB)
- Store chat logs as Markdown and FHIR JSON, grouped by day/session
- Export/import support for files

### 4. Export
- Markdown export (with LOINC codes where possible)
- FHIR QuestionnaireResponse JSON export (via Gemini 2.5, post-chat)
- (Future) Medplum integration for FHIR resource upload

### 5. Voice Integration (Scaffold)
- Hooks/components for VAPI or similar
- (Future) Voice-to-text and text-to-voice pipeline

### 6. Questionnaire Ingestion/Parsing
- Parse and store uploaded questionnaires (Markdown, PDF-to-text, CSV, etc.)
- Guide LLM interview flow using parsed questions
- (Future) ValueSet/LOINC mapping for imported questionnaires

## Data Flow
1. User interacts with chat UI
2. Conversation engine determines next question (adaptive, guided by parsed questionnaire if present)
3. Domain-specific rules engine injects best practices and clarifications into LLM prompts
4. LLM generates/augments questions and interprets answers
5. Responses and chat logs stored locally (grouped by day/session)
6. On completion, export module generates Markdown and triggers Gemini 2.5 to generate FHIR QuestionnaireResponse JSON (with LOINC codes)
7. Both files are stored and viewable in the Browse Chat Logs UI
8. (Future) Voice input/output handled via VAPI
9. (Optional) Questionnaire upload/ingestion updates question set for interview
10. User can browse, view, download, or delete chat logs and FHIR JSON via modal UI

## Extensibility
- Modular LLM integration
- Pluggable export formats
- Easy to add cloud hooks (Medplum, Vertex AI)
- ValueSet/LOINC mapping for imported questionnaires (future) 