# Architecture: Conversational Medical Intake App

## Components

### 1. Frontend (React)
- Multi-page navigation using React Router:
  1. **Questionnaire Import Page:** Paste, upload, or extract from PDF a FHIR Questionnaire JSON or Markdown. Transform Markdown or extracted PDF text to FHIR JSON using Gemini LLM. Upload FHIR JSON directly. All controls are above the text box. Save the questionnaire to the catalog for use in the interview.
  2. **Chat Interview Page:** Conversational chat UI, driven by the loaded FHIR Questionnaire. Hybrid scoring UI for each symptom. Chips-only UI for questions with a small number of options (configurable via .env).
  3. **Logs Page:** View, download, or delete chat logs (Markdown and FHIR JSON) in a full-page UI.
  4. **Catalog Page:** View, rename, delete, start chat, and toggle between raw JSON and a human-readable summary of questions/answers. (Future: FHIR JSON editing.)
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
- **All LLM prompts (for conversion, FHIR export, and conversational phrasing) are now loaded from editable text files in `src/prompts/`.**
- (Future) UI-based prompt editor for admins to edit prompts in-app.
- For very large Markdown or PDF questionnaires, chunking may be required for reliable LLM conversion.

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
  - User pastes, uploads, or extracts from PDF a FHIR JSON or Markdown.
  - If Markdown or PDF text, the app transforms it to FHIR JSON using Gemini LLM.
  - The loaded questionnaire is stored in app state (React context or top-level state) and drives the chat flow.
  - FHIR JSON can be uploaded directly.
- The app always uses a FHIR-like structure internally, even if some questions/answers lack LOINC codes.
- Parsed FHIR Questionnaires (with or without codes) drive the chat and scoring UI.
- (Future) ValueSet/LOINC mapping for imported questionnaires
- **Extensibility:** The import workflow can be extended to support CSV, PDF-to-text, or other formats in the future.
- (Future) FHIR JSON editing in Catalog for power users.

## Data Flow
1. User navigates to the Questionnaire Import page
2. User pastes, uploads, or extracts a questionnaire (FHIR JSON, Markdown, or PDF)
3. If Markdown or PDF text, the app transforms it to FHIR JSON using Gemini LLM (may require chunking for large files)
4. The loaded questionnaire is stored in app state
5. User navigates to the Catalog page, selects a questionnaire, and starts a chat interview
6. The Chat Interview page uses the loaded questionnaire to drive the chat and scoring UI
7. After the interview, responses and chat logs (Markdown and FHIR JSON) are stored locally, automatically at completion
8. User can view/download/delete logs on the Logs page

## Extensibility
- Modular LLM integration
- Pluggable export formats
- Easy to add cloud hooks (Medplum, Vertex AI)
- ValueSet/LOINC mapping for imported questionnaires (future)
- Import workflow can be extended to support additional formats
- (Future) FHIR JSON editing in Catalog for power users

## Key Update: Natural Language Conversational Flow (2024-06)
- The Chat Interview Page now supports a fully interactive, LLM-driven conversation:
  - Each question is asked in natural language.
  - The patient responds in free text (typed or, in the future, voice).
  - The LLM analyzes the response and determines whether to prompt for a score, clarify, skip, or move on.
  - Score input (chips or typed) is only shown if the LLM says a score is needed.
  - Skipping and validation for special question types (email, date) are supported.
  - The LLM prompt includes the full chat history, current question, and answer, and is engineered to follow the new rules (score only if relevant, skip allowed, validation for special types).
  - Both FHIR and Markdown questionnaires are supported, with freeform and validated questions handled appropriately.
  - Section and grand total summaries are still calculated and shown.
  - Voice input/output remains scaffolded for future integration.

## Numeric Scale and Answer Handling (2024-06)
- For FHIR 'choice' questions (numeric scale):
  - If the user answers 'no', 'never', etc., the app automatically assigns a score of 0, shows a bot message, and moves on—no LLM confirmation.
  - If the user enters a valid score (0–4), it is recorded, the bot confirms, and the chat moves on.
  - For any other answer, the numeric scale UI is always shown and the bot prompts for a score.
  - The LLM is only used for clarification if the answer is ambiguous and the question is not a 'choice' type.
- For non-choice questions, the LLM is used for clarification, confirmation, or validation as before.
- This ensures a streamlined, user-friendly experience for structured questionnaires.

## Questionnaire Catalog (2024-06)
- Imported questionnaires can be saved to a persistent catalog (browser localStorage).
- The Catalog page (tab) lists all saved questionnaires, with actions: Start Chat, View (toggle JSON/summary), Rename, Delete.
- The Import page allows saving a new questionnaire to the catalog (no longer loads from catalog or imports for chat).
- Catalog is managed by catalogUtils.ts and persists across app restarts.
- No backend is required; catalog is browser-specific.
- (Future) FHIR JSON editing may be added for power users.

## Conversational Phrasing Enrichment (2024-06)
- On import, all questionnaire items are recursively run through Gemini to generate a conversational phrasing, stored as `item.conversationalText`.
- The enriched FHIR JSON is used throughout the app (catalog, chat, logs, etc.).
- The chat UI always uses `item.conversationalText` if present, falling back to a cleaned-up version of the original text if not.
- This ensures robust, patient-friendly questions regardless of the original questionnaire authoring quality.

## Structured Answer Handling Update (2024-06)
- For questions with answerOption, chips/buttons and a Skip button are shown immediately if the number of options is <= threshold (configurable via .env).
- Users can answer by clicking or skipping. For more options, free text is also allowed.
- Typed input is matched to options; ambiguous input triggers a nudge.
- No redundant prompts are shown.
- Accessibility is ensured for all options and skip.
- This makes the chat more natural and efficient for structured questions.

## Home Page and Routing Update (2024-06)
- The app now has a Home page at /home (and /) that displays the contents of the README.md file, formatted as rich HTML/Markdown.
- Navigation tabs include Home, Import, Chat, Logs, and Catalog, always in sync with the current route.
- The Import page is now at /import.
- Unknown routes redirect to Home.
- Uses Vite and vite-plugin-raw to import and render Markdown as the landing page.

## Updated Questionnaire Import and Catalog Workflow (2024-06)

```
+----------------+         +----------------+         +----------------+
|   Import Page  |         |  Catalog Page  |         |   Chat Page    |
| (Import,       |         | (List,         |         | (Interview,    |
|  Convert,      |         |  Start Chat)  |         |  Select Q if   |
|  Save)         |         |                |         |  needed)       |
+-------+--------+         +-------+--------+         +--------+-------+
        |                          |                           ^
        |  (After Save)            |  (Start Chat)            |
        +------------------------->+-------------------------->+
```

- The navigation order is: Home, Import, Catalog, Chat, Logs.
- The Import Page is for adding new questionnaires (Markdown, FHIR JSON, or PDF), converting, and saving to the catalog. All controls are above the text box. No 'Import for Chat' button.
- The Catalog Page lists all saved questionnaires and allows starting a new chat/interview for each entry ("Start Chat" button). Editing, renaming, deleting, and toggling between JSON and summary are available. (Future: FHIR JSON editing.)
- The Chat Page is used to conduct the interview. If accessed directly, the user can select a questionnaire from the catalog. 