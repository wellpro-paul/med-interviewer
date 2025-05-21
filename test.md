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
- **Navigation:** Test that navigation between pages (Import, Chat, Logs) works as expected. _(not yet implemented)_
- **Import:** Test that questionnaire import (FHIR/Markdown) is robust and errors are handled gracefully. _(not yet implemented)_
- **State preservation:** Test that state (loaded questionnaire) is preserved between pages and after refresh. _(not yet implemented)_
- **Logs accessibility:** Test that logs are accessible and manageable from the Logs page. _(not yet implemented)_
- **Large questionnaire edge cases:** Test that very large Markdown files are handled or chunked as needed. _(not yet implemented)_

## Future E2E/Integration Tests
- **Full workflow:** Test the complete user flow from import to chat to log export and review. _(not yet implemented)_
- **Accessibility:** Test keyboard navigation and screen reader support for all major UI elements. _(not yet implemented)_
- **Voice input/output:** Test voice scaffolding when implemented. _(not yet implemented)_
- **Medplum/cloud integration:** Test cloud export and authentication when implemented. _(not yet implemented)_

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