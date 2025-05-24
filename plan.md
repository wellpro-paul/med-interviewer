# Project Plan: Conversational Medical Intake App

## Overview
A React-based web app that interviews patients using natural language, powered by an LLM (OpenAI or Gemini). The app mimics a medical intake questionnaire (inspired by MSQ) but uses a conversational, adaptive chat interface. It runs locally for rapid prototyping, with future plans for cloud deployment and integration with Medplum/HL7 FHIR.

## Phases & Milestones

### Phase 1: Prototype Core Experience
- [x] Set up React app with Material UI (or similar) for polished, responsive chat UI
- [x] Integrate with LLM API (OpenAI/Gemini) for conversational flow
- [x] Implement adaptive question flow inspired by MSQ
- [x] Store responses and chat logs locally (localStorage/IndexedDB), grouped by day/session
- [x] Export results as Markdown (with LOINC mapping where possible)
- [x] **Implement multi-page navigation:**
    - Questionnaire Import page (paste/upload FHIR JSON, Markdown, or PDF, transform and load)
    - Chat Interview page (driven by loaded questionnaire)
    - Logs page (view/download/delete logs)
    - Catalog page (view, rename, delete, start chat, toggle JSON/summary)
- [x] **Implement questionnaire import workflow:**
    - Transform Markdown or PDF-extracted text to FHIR JSON in the UI using Gemini LLM (LLM-powered, not regex)
    - Validate and load FHIR JSON
    - Store loaded questionnaire in app state
- [x] Automatic log saving: At interview completion, the app saves both Markdown and FHIR JSON logs (no explicit End Chat button required)
- [x] Post-chat LOINC/FHIR export: After chat ends, send transcript to Gemini 2.5 to generate FHIR QuestionnaireResponse JSON (with LOINC codes where possible)
- [x] Store and view FHIR JSON alongside Markdown logs in Logs page
- [x] Navigation tabs are always in sync with the current route, even after programmatic navigation
- [x] Basic scaffolding for voice input/output (VAPI-ready)
- [x] Enhance system prompt with domain-specific rules (e.g., biological relatives for family history, clarify ambiguous answers, etc.)
- [x] **Update documentation:** README, architecture, and test documentation reflect the new navigation, import workflow, and log management.
- [x] **Plan for future tests:** Placeholders for navigation, import, state management, LLM-powered Markdown-to-FHIR, and log management in test.md.

### Phase 2: Enhanced Features
- [x] PDF upload and extraction, FHIR JSON upload on Import page
- [x] Chips threshold configurable via .env
- [x] Catalog summary toggle (JSON vs. human-readable)
- [ ] Improve LOINC mapping and question coverage
- [ ] Add summary/confirmation step before export (optional)
- [ ] Add file-based import/export for responses
- [ ] Polish UI/UX further (animations, avatars, etc.)
- [ ] Support for custom questionnaire upload/ingestion (Markdown, PDF-to-text, CSV, etc.)
- [ ] Parse uploaded questionnaires and use to drive LLM interview flow
- [ ] (Future) ValueSet/LOINC mapping for imported questionnaires
- [ ] (Future) Multi-session support or "start new chat" option
- [ ] (Future) FHIR JSON editing in Catalog (power user feature)

### Phase 3: FHIR & Cloud Readiness
- [ ] Export results as FHIR QuestionnaireResponse JSON (already in Phase 1 for local export)
- [ ] Prepare for Medplum/Vertex AI integration
- [ ] Add authentication/logging hooks (for cloud)
- [ ] Add multi-language support (scaffold only)

## Milestones
- **M1:** Multi-page navigation and import workflow (Questionnaire Import, Chat Interview, Logs, Catalog)
- **M2:** Hybrid scoring system for MSQ (per-symptom, section, and grand total scoring with UI and LLM integration)
- **M3:** LLM-powered Markdown/PDF-to-FHIR conversion for admin import of freeform questionnaires
- **M4:** Voice scaffolding, improved LOINC mapping, import/export, custom questionnaire upload/ingestion, multi-session support, ValueSet/LOINC mapping for imported questionnaires
- **M5:** Medplum/cloud integration, FHIR enhancements, authentication

## Out of Scope (for now)
- Production authentication/logging
- Full Medplum integration
- Multi-language support
- Advanced analytics
- Note: Large Markdown or PDF questionnaires may require chunking for LLM conversion.

## Key Update: Natural Language Conversational Flow (2024-06)
- The Chat Interview now supports:
  - Free-text answers for each question, analyzed by the LLM.
  - LLM-driven decision to prompt for a score, clarify, skip, or move on.
  - Score input (chips or typed) only shown if the LLM says a score is needed.
  - Skipping and validation for special question types (email, date) are supported.
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
- Users can save imported questionnaires to a persistent catalog (localStorage).
- The Catalog page allows viewing, renaming, deleting, starting chat, and toggling between JSON and a human-readable summary.
- The Import page allows saving to the catalog (no longer loads from catalog or imports for chat).
- Catalog persists across app restarts (unless browser storage is cleared).
- Implementation uses catalogUtils.ts for catalog management.
- (Future) FHIR JSON editing may be added for power users.

## Conversational Phrasing for All Questions (2024-06)
- On import, all questions are run through Gemini to generate a friendly, conversational phrasing, stored as `item.conversationalText`.
- This is now the default for FHIR, Markdown, and PDF imports, and is done recursively for all items.
- The chat UI always uses this phrasing, making the experience more natural and robust to poor-quality source questionnaires.

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

## Updated Import, Catalog, and Chat Workflow (2024-06)

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
- The Catalog Page lists all saved questionnaires and allows starting a new chat/interview for each entry ("Start Chat" button). Editing, renaming, deleting, and toggling between JSON and summary are available.
- The Chat Page is used to conduct the interview. If accessed directly, the user can select a questionnaire from the catalog.

- LLM prompts are now loaded from intake-interviewer-ui/public/prompts/*.txt files for easy editing in the IDE.
- FUTURE: Allow editing of these prompt files from the UI (e.g., an admin prompt editor page).
