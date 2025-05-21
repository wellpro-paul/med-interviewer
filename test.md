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