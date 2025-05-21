# Conversational Medical Intake App (Prototype)

This is a local prototype of a conversational medical intake app inspired by the Medical Symptoms Questionnaire (MSQ). It uses a chat interface powered by an LLM (OpenAI or Gemini) to interview patients in natural language.

## Features
- Multi-page app with navigation:
  1. **Questionnaire Import:** Paste or upload a FHIR Questionnaire JSON or Markdown. Transform Markdown to FHIR JSON with a button. Load the questionnaire for use in the interview.
  2. **Chat Interview:** Conversational intake flow, driven by the loaded FHIR Questionnaire. Hybrid scoring system (0–4 scale) for each symptom.
  3. **Logs:** View, download, or delete chat logs (no modal; full page).
- Responsive chat UI (works on mobile and desktop)
- Adaptive, conversational intake flow
- Local storage of responses and chat logs (Markdown and FHIR JSON, grouped by day/session)
- End Chat button disables input, saves log, triggers FHIR export, and resets for new chat
- After each chat, both a Markdown transcript and a FHIR QuestionnaireResponse JSON (with LOINC codes) are generated and stored per session
- Export results as Markdown and FHIR JSON (with LOINC codes)
- Scaffolding for voice input/output (VAPI-ready)
- (Future) ValueSet/LOINC mapping for imported questionnaires
- (Future) Cloud/Medplum integration
- Domain-specific prompt/rules for medical best practices (e.g., only consider biological relatives for family history, clarify ambiguous answers, etc.)
- Guided by questions from a source questionnaire (FHIR or Markdown)

## Workflow
1. **Import Questionnaire:**
   - Paste FHIR Questionnaire JSON or Markdown into the import page.
   - If Markdown, click the "Transform" button to convert to FHIR JSON.
   - Click "Load" to use the questionnaire for the interview.
2. **Chat Interview:**
   - The chat UI guides the user through the questionnaire, presenting questions and scoring options as defined in the loaded FHIR Questionnaire.
   - Section and grand totals are calculated and shown to the user for confirmation.
3. **Logs:**
   - View, download, or delete previous chat logs on a dedicated page.

## Extensibility
- Supports both fully coded (FHIR/LOINC) and freeform (Markdown) questionnaires.
- Admins can convert Markdown to FHIR using the built-in workflow.
- The app can be extended to support other formats (CSV, PDF-to-text, etc.) in the future.

## Requirements
- Node.js (v18+ recommended)
- npm or yarn
- OpenAI or Gemini API key (for LLM integration)

## Setup
1. Clone this repository
2. Install dependencies:
   ```
   npm install
   # or
   yarn install
   ```
3. Create a `.env` file with your LLM API key:
   ```
   OPENAI_API_KEY=your-key-here
   # or
   GEMINI_API_KEY=your-key-here
   ```
4. Start the app:
   ```
   cd intake-interviewer-ui
   npm start
   # or
   yarn start
   ```