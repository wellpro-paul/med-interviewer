# Conversational Medical Intake App (Prototype)

This is a prototype of a conversational medical intake app. It uses a chat interface powered by an LLM (OpenAI or Gemini) to interview patients in natural language using questionnaires defined in FHIR Questionnaire JSON. It runs locally using Node, Vite, and the local browser.

## Features
- Multi-page app with navigation:
  1. **Questionnaire Import:** Paste, upload, or extract from PDF a FHIR Questionnaire JSON or Markdown. Transform Markdown or extracted PDF text to FHIR JSON using Gemini LLM (no regex). Upload FHIR JSON directly. Save the questionnaire to the catalog for use in the interview.
  2. **Chat Interview:** Conversational intake flow, driven by the loaded FHIR Questionnaire. Hybrid scoring system (0–4 scale) for each symptom, with support for FHIR itemWeight extensions. Chips-only UI for questions with a small number of options (configurable).
  3. **Logs:** View, download, or delete chat logs (Markdown and FHIR JSON) in a full-page UI. Download all logs as a zip file, with filenames including questionnaire titles and timestamps for easy sorting.
  4. **Catalog:** View, rename, delete, and start chat with any saved questionnaire. Toggle between raw JSON and a human-readable summary of questions/answers.
- Responsive chat UI (works on mobile and desktop)
- Adaptive, conversational intake flow
- Local storage of responses and chat logs (Markdown and FHIR JSON, grouped by day/session)
- Logs are saved automatically at the end of each chat session (no explicit End Chat button required for normal use)
- **Debug: End Chat Early** button allows you to end a chat at any time and log the partial session (useful for debugging LLM issues)
- After each chat, both a Markdown transcript and a FHIR QuestionnaireResponse JSON (with LOINC codes) are generated and stored per session
- Export results as Markdown and FHIR JSON (with LOINC codes)
- Scaffolding for voice input/output (VAPI-ready)
- (Future) ValueSet/LOINC mapping for imported questionnaires
- (Future) Cloud/Medplum integration
- Domain-specific prompt/rules for medical best practices (e.g., only consider biological relatives for family history, clarify ambiguous answers, etc.)
- Guided by questions from a source questionnaire (FHIR, Markdown, or PDF)
- **Navigation tabs always match the current page, even after programmatic navigation.**

- **LLM prompts are now loaded from editable text files in `public/prompts/`** (for conversion, FHIR export, conversational phrasing, and full interview flow). See below for details.

## Key Updates (2024-06 & Recent LLM Enhancements)
- **Vite-based UI:** The app is now built and run using Vite for faster development and modern tooling.
- **Batched Conversational Text Generation:** Questionnaire import performance has been improved by generating conversational phrasing for items in batches, reducing individual LLM calls. This uses the new `generateConversationalTextForItemsBatch.txt` prompt.
- **Enhanced "LLM Full Interview" Mode:**
    - The interview flow is now more robust, managed by structured JSON responses from the LLM (using the updated `fullQuestionnaireInterview.txt` prompt). This allows for clearer actions like asking questions, requesting clarification, summarizing, or completing the interview.
    - The LLM receives improved contextual information, including lists of unanswered questions, already answered questions (with their text and answers), and recent chat history, leading to more intelligent and relevant interactions.
- **PDF Upload & Extraction:** Upload a PDF, extract text in-browser, and convert to FHIR JSON using the LLM workflow.
- **FHIR JSON Upload:** Upload a FHIR Questionnaire JSON file directly.
- **Import Page Workflow:** All controls (Upload PDF, Convert to FHIR, Upload FHIR JSON, Save to Catalog, Reset) are above a single scrollable text box. Button order matches the logical workflow. Only Save to Catalog is enabled for valid FHIR JSON.
- **Chips Threshold:** The number of answer options for which only chips (and skip) are shown in the chat UI is now configurable via `.env` (`REACT_APP_CHIPS_THRESHOLD`, default 5).
- **Catalog Summary Toggle:** In the Catalog viewer, toggle between raw JSON and a human-readable summary of questions and answer options.
- **No 'Import for Chat':** Users start a chat from the Catalog page, not from Import.
- **Chips-Only UI:** For questions with <= threshold options, only chips and skip are shown (no free text input).
- **FHIR Scoring:** The app supports FHIR itemWeight extensions for answer scoring, automatically summing scores for each session and displaying the grand total at the end of the interview and in logs.
- **Download All Logs:** Download all chat logs as a zip file, with filenames including ISO date/time and questionnaire title for easy sorting.
- **Prompt Customization:** LLM prompts for conversion, FHIR export, and conversational phrasing are now loaded from editable text files in `intake-interviewer-ui/public/prompts`.
- **Debug: End Chat Early:** A small debug button lets you end a chat early and log the partial session for troubleshooting LLM issues.

## Configuration
- You can set the chips threshold in your `.env` file:
  ```
  REACT_APP_CHIPS_THRESHOLD=5
  ```
  This controls how many answer options are shown as chips only (with skip) before free text is also allowed.

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
- The Import Page is for adding new questionnaires (Markdown, FHIR JSON, or PDF), converting, and saving to the catalog. All controls are above the text box. No 'Import for Chat' button. The Import page does not load from the catalog.
- The Catalog Page lists all saved questionnaires and allows starting a new chat/interview for each entry ("Start Chat" button). Editing, renaming, deleting, and toggling between JSON and summary are available.
- The Chat Page is used to conduct the interview. If accessed directly, the user can select a questionnaire from the catalog.
- The Logs Page allows you to view, download, or delete chat logs. You can also download all logs as a zip file, with filenames that include the date, time, and questionnaire title.

## LLM Prompt Customization

- All LLM prompts (for Markdown-to-FHIR conversion, FHIR export, conversational phrasing, batch conversational text, and full interview flow) are now loaded from editable text files in `public/prompts/`.
- Key prompts include:
    - `markdownToFhirQuestionnaire.txt`: For converting Markdown questionnaires.
    - `generateFhirQuestionnaireResponse.txt`: For generating FHIR responses from transcripts.
    - `generateConversationalTextForItem.txt`: For single item conversational text (less used now).
    - `generateConversationalTextForItemsBatch.txt`: For batch generating conversational text for questionnaire items during import.
    - `fullQuestionnaireInterview.txt`: For managing the "LLM Full Interview" mode, now updated for structured JSON I/O and richer context.
- To customize the app's behavior, simply edit the relevant `.txt` files in `public/prompts/`.

- **Future:** The app may include a UI for editing these prompts directly from the browser (admin-only feature).

## Extensibility
- Supports fully coded (FHIR/LOINC), freeform (Markdown), and PDF-extracted questionnaires.
- Admins can convert Markdown or PDF text to FHIR using the built-in LLM workflow.
- The app can be extended to support other formats (CSV, etc.) in the future.

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
3. Create a `.env` file with your LLM API key and (optionally) chips threshold:
   ```
   OPENAI_API_KEY=your-key-here
   # or
   GEMINI_API_KEY=your-key-here
   REACT_APP_CHIPS_THRESHOLD=5
   ```
4. Start the app:
   ```
   cd intake-interviewer-ui
   npm start
   # or
   yarn start
   ```

## Troubleshooting
- **Large Markdown or PDF questionnaires:** Gemini LLM may fail to convert very large questionnaires in one go. If you encounter errors, try splitting the input into smaller sections and importing them separately.
- **Local-only:** This app runs entirely locally unless you add Medplum/cloud integration.

## Questionnaire Catalog
- Imported questionnaires can be saved to a persistent catalog (localStorage).
- The Catalog page lists all saved questionnaires, with options to start chat, view (JSON or summary), rename, or delete.
- The Import page allows saving to the catalog.
- Catalog persists across app restarts (unless browser storage is cleared).
- No backend is required; catalog is browser-specific.

## Conversational Phrasing with LLM
- On import, all questions are run through the LLM to generate a friendly, patient-facing conversational phrasing, stored as item.conversationalText.
- The chat UI uses this phrasing for each question, making the experience more natural and context-aware.
- The app only shows answer options (including frequency scales) if they are defined in the questionnaire; it never invents a scale or prompt.
- This approach is robust to different questionnaire styles and ensures a patient-friendly experience.

## Home Page and Routing
- The app now has a Home page at /home (and /) that displays the contents of this README.md file, formatted as rich HTML/Markdown.
- Navigation tabs include Home, Import, Catalog, Chat, and Logs, always in sync with the current route.
- The Import page is now at /import.
- Unknown routes redirect to Home.
- Uses Vite and vite-plugin-raw to import and render Markdown as the landing page.
