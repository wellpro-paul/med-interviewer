# Conversational Medical Intake App (Prototype)

This is a local prototype of a conversational medical intake app inspired by the Medical Symptoms Questionnaire (MSQ). It uses a chat interface powered by an LLM (OpenAI or Gemini) to interview patients in natural language.

## Features
- Responsive chat UI (works on mobile and desktop)
- Adaptive, conversational intake flow
- Local storage of responses and chat logs (Markdown and FHIR JSON, grouped by day/session)
- Browse Chat Logs: view, download, or delete logs in a folder-by-day, file-by-session modal
- End Chat button disables input, saves log, triggers FHIR export, and resets for new chat
- After each chat, both a Markdown transcript and a FHIR QuestionnaireResponse JSON (with LOINC codes) are generated and stored per session
- Both files are viewable in the Browse Chat Logs UI (no user editing required)
- Export results as Markdown and FHIR JSON (with LOINC codes)
- Scaffolding for voice input/output (VAPI-ready)
- (Future) ValueSet/LOINC mapping for imported questionnaires
- (Future) Cloud/Medplum integration
- Domain-specific prompt/rules for medical best practices (e.g., only consider biological relatives for family history, clarify ambiguous answers, etc.)
- Guided by questions from a source questionnaire (e.g., stat-msq.md)

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
   npm start
   # or
   yarn start
   ```

## Usage
- Open the app in your browser (mobile or desktop)
- Begin the intake by chatting with the virtual interviewer
- Answer questions in natural language
- When finished, click the End Chat (🔚) button to save, trigger FHIR export, and reset for a new session
- Browse previous chat logs using the Browse Chat Logs button in the app bar
- View, download, or delete Markdown and FHIR JSON logs in the modal dialog

## Exporting Results
- After completing the intake, the chat log is automatically saved as a Markdown file and a FHIR QuestionnaireResponse JSON (with LOINC codes where possible), both stored to localStorage
- Download or delete logs from the Browse Chat Logs modal
- (Future) ValueSet/LOINC mapping for imported questionnaires
- (Future) Export as FHIR QuestionnaireResponse JSON to Medplum/cloud

## Future Features
- Voice input/output (VAPI integration)
- ValueSet/LOINC mapping for imported questionnaires
- FHIR export for Medplum/HL7 compatibility
- Cloud deployment and authentication
- Multi-language support
- Custom questionnaire upload/ingestion (Markdown, PDF-to-text, CSV, etc.) to guide the interview flow
- Multi-session support or "start new chat" option

## License
For internal prototyping and evaluation only. 