# Architecture: Conversational Medical Intake App

## Components

### 1. Frontend (React)
- Multi-page navigation using React Router:
  1. **Questionnaire Import Page:** Paste or upload FHIR Questionnaire JSON or Markdown. Transform Markdown to FHIR JSON using Gemini LLM. Load the questionnaire for use in the interview.
  2. **Chat Interview Page:** Conversational chat UI, driven by the loaded FHIR Questionnaire. Hybrid scoring UI for each symptom.
  3. **Logs Page:** View, download, or delete chat logs (Markdown and FHIR JSON) in a full-page UI.
- Responsive chat UI (Material UI or similar)
- Adaptive conversation engine (drives question flow)
- **Symptom scoring UI:** For each symptom, a 0–4 scale (buttons/chips) is shown for the user to select a score, in addition to the conversational chat. The AI prompts for a score if not provided. Section and grand totals are calculated and shown.
- LOINC mapping utility (via Gemini 2.5, post-chat)
- Export module (Markdown, FHIR QuestionnaireResponse JSON)
- Voice input/output scaffolding (VAPI-ready)
- **Accessibility:** All UI components are keyboard and screen-reader accessible.
- **Navigation tabs** are always in sync with the current route, even after programmatic navigation.

### 2. LLM Integration
- API client for OpenAI/Gemini (configurable, Gemini 2.5 for coding/export)
- Handles prompt/response for chat and post-chat coding
- Domain-specific prompt/rules engine (injects medical best practices, e.g., biological relatives, clarification prompts, etc.)
- **Prompt instructs AI to ask for a numeric score (0–4) for each symptom, summarize section/grand totals, and accept both button and typed input.**
- Specialized post-chat prompt for mapping transcript to FHIR QuestionnaireResponse with LOINC codes
- **Markdown-to-FHIR conversion is LLM-powered (Gemini).**
- For very large Markdown questionnaires, chunking may be required for reliable LLM conversion.

### 3. Local Storage
- Store session data and responses in browser (localStorage or IndexedDB)
- Store chat logs as Markdown and FHIR JSON, grouped by day/session
- **Logs are saved automatically at interview completion, including both Markdown and FHIR JSON.**
- Export/import support for files

### 4. Export
- Markdown export (with LOINC codes and symptom scores, section/grand totals)
- FHIR QuestionnaireResponse JSON export (via Gemini 2.5, post-chat)
- (Future) Medplum integration for FHIR resource upload

### 5. Voice Integration (Scaffold)
- Hooks/components for VAPI or similar
- (Future) Voice-to-text and text-to-voice pipeline

### 6. Questionnaire Ingestion/Parsing
- **Questionnaire Import Page:**
  - User pastes or uploads FHIR JSON or Markdown.
  - If Markdown, the app transforms it to FHIR JSON using Gemini LLM.
  - The loaded questionnaire is stored in app state (React context or top-level state) and drives the chat flow.
- The app always uses a FHIR-like structure internally, even if some questions/answers lack LOINC codes.
- Parsed FHIR Questionnaires (with or without codes) drive the chat and scoring UI.
- (Future) ValueSet/LOINC mapping for imported questionnaires
- **Extensibility:** The import workflow can be extended to support CSV, PDF-to-text, or other formats in the future.

## Data Flow
1. User navigates to the Questionnaire Import page
2. User pastes or uploads a questionnaire (FHIR JSON or Markdown)
3. If Markdown, the app transforms it to FHIR JSON using Gemini LLM (may require chunking for large files)
4. The loaded questionnaire is stored in app state
5. User navigates to the Chat Interview page, which uses the loaded questionnaire to drive the chat and scoring UI
6. After the interview, responses and chat logs (Markdown and FHIR JSON) are stored locally, automatically at completion
7. User can view/download/delete logs on the Logs page

## Extensibility
- Modular LLM integration
- Pluggable export formats
- Easy to add cloud hooks (Medplum, Vertex AI)
- ValueSet/LOINC mapping for imported questionnaires (future)
- Import workflow can be extended to support additional formats 