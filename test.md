# Testing Documentation

## Overview
This document summarizes the approach to testing for the Conversational Medical Intake App, the test files implemented, and the current status and known issues with the test suites as of this writing.

## Testing Approach
- **Unit Testing:** We use Jest as the test runner and assertion library, and React Testing Library for component testing.
- **Mocking:** External dependencies (LLM API calls, localStorage, file-saver, etc.) are mocked to isolate component and utility logic.
- **Test Coverage:** Focus is on utility functions, LLM service logic, and core UI rendering/interaction.

## Test Files and Their Purpose

### 1. `src/App.utils.test.ts`
- **Purpose:** Unit tests for utility functions exported from `App.tsx` (e.g., date/time helpers, markdown transcript generation, localStorage handling).
- **Status:**
  - All tests are passing.
  - Includes tests for:
    - `getToday` and `getTime` (date/time formatting)
    - `generateMarkdownTranscript` (markdown log generation)
    - `saveSessionToLocalStorage` and `loadLogsFromLocalStorage` (localStorage structure, migration, and error handling)
  - Handles invalid JSON in localStorage gracefully (logs error, returns empty object).

### 2. `src/llmService.test.ts`
- **Purpose:** Unit tests for LLM service functions (OpenAI/Gemini API calls, FHIR export logic, error handling).
- **Status:**
  - Most tests are passing.
  - Tests include:
    - Correct API call structure for OpenAI and Gemini
    - Error handling for failed API calls
    - FHIR export logic and error handling
    - Handling of missing API keys
  - **Known Issue:**
    - The test for missing API keys (`sendMessageToLLM should throw an error if no API keys are set`) is failing due to a mismatch between the test's expectation and the actual function's behavior in the test environment. This appears to be related to module mocking and environment variable handling in Jest.

### 3. `src/App.test.tsx`
- **Purpose:** Component tests for the main `App` React component (UI rendering, user interaction, scroll behavior).
- **Status:**
  - All tests are currently failing due to environment and mocking issues.
  - Tests attempted:
    - Rendering the initial UI and checking for key elements
    - Simulating user input and verifying scroll behavior
  - **Known Issues:**
    - `AggregateError` and `TypeError: Cannot set properties of undefined (setting 'current')` during render, likely due to incompatibility between Material UI's use of refs and the jsdom test environment.
    - Multiple attempts to mock `useRef`, `Element.prototype.scrollIntoView`, and `useEffect` did not resolve the issue.
    - This may require a different testing strategy or more advanced setup for Material UI components.

## Key Update: Natural Language Conversational Flow (2024-06)
- The Chat Interview now supports a fully interactive, LLM-driven conversation:
  - Free-text input and LLM-driven conversation for each question.
  - LLM-driven score prompting (only when relevant).
  - Skipping questions and validation for special types (email, date).
  - Both FHIR and Markdown questionnaire flows.
  - UI always shows text input, score buttons only when needed.
  - LLM prompt and response parsing are now central to the chat flow.

## Numeric Scale and Answer Handling (2024-06)
- For FHIR 'choice' questions:
  - 'no', 'never', etc. auto-assigns score 0 and moves on (no LLM confirmation).
  - Valid score (0–4) is recorded and moves on.
  - Any other answer prompts the numeric scale UI.
  - LLM is only used for clarification if the answer is ambiguous and not a 'choice' type.
- For non-choice questions, LLM is used for clarification/validation as before.
- This ensures a streamlined, user-friendly experience for structured questionnaires.

## Structured Answer Handling Update (2024-06)
- Test that for questions with answerOption, chips/buttons and a Skip button are shown immediately if the number of options is <= threshold (configurable via .env).
- Test that users can answer by clicking or skipping. For more options, free text is also allowed.
- Test that typed input is matched to options; ambiguous input triggers a nudge.
- Test that no redundant prompts are shown.
- Test accessibility for all options and skip.
- This makes the chat more natural and efficient for structured questions.

## PDF and FHIR JSON Upload (2024-06)
- Test that PDF upload and extraction works, and extracted text can be converted to FHIR JSON via LLM.
- Test that FHIR JSON upload works and only valid FHIR Questionnaire JSON enables Save to Catalog.
- Test that Import page controls are all above the text box and follow the new workflow.

## Chips Threshold Configuration (2024-06)
- Test that the chips threshold can be set via `.env` and the UI updates accordingly.
- Test that questions with <= threshold options show only chips and skip, and more options show free text as well.

## Catalog Summary Toggle (2024-06)
- Test that the Catalog viewer allows toggling between raw JSON and a human-readable summary of questions/answers.

## Catalog and Chat Workflow (2024-06)
- Test that users start a chat from the Catalog page, not from Import.
- Test that Catalog page allows viewing, renaming, deleting, and toggling JSON/summary for each questionnaire.
- Test that Chat page loads the selected questionnaire and interview proceeds as expected.

## Future Tests for LLM-Driven Conversational Flow
- Test that the chat accepts free-text answers and the LLM determines the next step (score, clarify, skip, move on).
- Test that score input is only shown when the LLM says a score is needed.
- Test that skipping and validation for special question types work as expected.
- Test both FHIR and Markdown questionnaire flows.
- Test that the UI always shows a text input, and score buttons only when needed.

## Future Tests for Hybrid Scoring System
- **Scoring UI rendering:** Ensure the 0–4 scale is shown at the correct time in the chat flow.
- **Accessibility:** Verify that scoring buttons are keyboard and screen-reader accessible.
- **Score collection:** Test that selected scores are correctly stored per symptom.
- **Section and grand total calculation:** Test that section and overall totals are calculated and displayed correctly.
- **Export logic:** Test that scores are included in Markdown and FHIR exports.
- **LLM prompt/response:** Test that the AI prompts for a score, explains the scale, and handles ambiguous or missing input appropriately.

## Future Tests for LLM-powered Markdown-to-FHIR Conversion
- **Success cases:** Test that Markdown is correctly converted to FHIR JSON for typical questionnaires. _(not yet implemented)_
- **Error handling:** Test that errors from Gemini (invalid JSON, code fencing, etc.) are handled gracefully and shown in the UI. _(not yet implemented)_
- **Chunking/large input:** Test that large Markdown questionnaires are chunked and merged correctly, or that the UI provides guidance. _(not yet implemented)_

## Future Tests for Automatic Log Saving
- **At chat completion:** Test that logs (Markdown and FHIR JSON) are saved automatically when the interview is complete. _(not yet implemented)_
- **Error handling:** Test that Markdown is saved even if FHIR export fails. _(not yet implemented)_

## Future Tests for Logs Page
- **View:** Test that Markdown and FHIR logs can be viewed in a dialog. _(not yet implemented)_
- **Download:** Test that logs can be downloaded in the correct format. _(not yet implemented)_
- **Delete:** Test that logs can be deleted and the UI updates. _(not yet implemented)_
- **Error handling:** Test that the UI handles missing or corrupted logs gracefully. _(not yet implemented)_

## Future Tests for Navigation and Import Workflow
- **Tab sync:** Test that navigation tabs always match the current route, even after programmatic navigation. _(not yet implemented)_
- **Navigation:** Test that navigation between pages (Import, Chat, Logs, Catalog) works as expected. _(not yet implemented)_
- **Import:** Test that questionnaire import (FHIR/Markdown/PDF) is robust and errors are handled gracefully. _(not yet implemented)_
- **State preservation:** Test that state (loaded questionnaire) is preserved between pages and after refresh. _(not yet implemented)_
- **Logs accessibility:** Test that logs are accessible and manageable from the Logs page. _(not yet implemented)_
- **Large questionnaire edge cases:** Test that very large Markdown or PDF files are handled or chunked as needed. _(not yet implemented)_

## Future E2E/Integration Tests
- **Full workflow:** Test the complete user flow from import to chat to log export and review. _(not yet implemented)_
- **Accessibility:** Test keyboard navigation and screen reader support for all major UI elements. _(not yet implemented)_
- **Voice input/output:** Test voice scaffolding when implemented. _(not yet implemented)_
- **Medplum/cloud integration:** Test cloud export and authentication when implemented. _(not yet implemented)_

## Future Tests for Numeric Scale and Answer Handling
- Test that 'no', 'never', etc. auto-assigns score 0 and moves on for 'choice' questions.
- Test that valid score (0–4) is recorded and moves on for 'choice' questions.
- Test that any other answer prompts the numeric scale UI for 'choice' questions.
- Test that LLM is only used for clarification if the answer is ambiguous and not a 'choice' type.
- Test that for non-choice questions, LLM is used for clarification/validation as before.

## Questionnaire Catalog (2024-06)
- Test saving a questionnaire to the catalog from the Import page.
- Test loading a questionnaire from the catalog (from Catalog page).
- Test renaming and deleting questionnaires in the catalog.
- Test catalog persistence across app restarts.
- Test that catalog is cleared if browser storage is cleared.
- Test that duplicate questionnaires are not added.
- Test catalog management via catalogUtils.ts.
- Test Catalog summary toggle (JSON/summary).

## Conversational Phrasing with LLM (2024-06)
- Test that on import, all questions are run through the LLM and item.conversationalText is set.
- Test that the chat UI uses item.conversationalText if present.
- Test that only defined answer options (including frequency scales) are shown; never invent a scale.
- Test that the experience is robust to different questionnaire styles.

## Conversational Phrasing Enrichment (2024-06)
- Test that on import, all questions are run through Gemini and `item.conversationalText` is set.
- Test that the chat UI uses `item.conversationalText` if present.
- Test that the experience is robust to poor-quality or awkwardly worded source questionnaires.
- Test that the process works for both FHIR and Markdown imports.

## Home Page and Routing Update (2024-06)
- Test that the Home page at /home (and /) displays the README.md file, formatted as HTML/Markdown.
- Test that navigation tabs (Home, Import, Chat, Logs, Catalog) are always in sync with the current route.
- Test that the Import page is at /import.
- Test that unknown routes redirect to Home.
- Test that Markdown is rendered using vite-plugin-raw and react-markdown.

## Summary of Remaining Issues
- **App.test.tsx:**
  - Fails to render the main component in the test environment due to ref and DOM mocking issues with Material UI and Emotion.
  - Further progress may require breaking up the component, using a different test renderer, or accepting limited test coverage for the main UI.
- **llmService.test.ts:**
  - The missing API key error test does not behave as expected due to Jest module/environment limitations.

## Recommendations
- Focus on utility and service function tests for robust coverage.
- For complex UI (especially with Material UI), consider integration tests in a real browser environment (e.g., Cypress, Playwright) or break components into smaller, more testable units.
- Revisit main component tests if/when the test environment or component structure changes.

## Key Update: Prompt Customization (2024-06)
- LLM prompts for Markdown-to-FHIR conversion, FHIR export, and conversational phrasing are now loaded from editable text files in `src/prompts/`.
- Test that editing these files changes the app's LLM behavior as expected.
- (Future) Test in-app prompt editing UI when implemented.

## Download All Logs (zip)
- Test that the 'Download All Logs' button on the Logs page downloads a zip file containing all session logs.
- Test that each file in the zip is named with the ISO date, time, and questionnaire title for easy sorting.
- Test that both Markdown and FHIR JSON are included for each session.

## Debug: End Chat Early
- Test that clicking the 'End Chat Early' button ends the chat, saves the partial log, and displays the completion UI.
- Test that the partial session is saved and appears in the Logs page.
- Test that normal sessions still auto-save at completion.

## Future Tests for Prompt Editing UI
- Test that an admin can edit LLM prompt files from the UI (when implemented).
- Test that changes made in the UI are reflected in the app's LLM behavior. 