# Intake Interviewer: Development Plan

## Current Focus
- **Keep the current question and answer input always visible** (sticky/fixed at the bottom or top of the Chat page).
- **Allow access to chat history** (scrollable, but not editable for now).

## Implementation Steps
1. Refactor Chat page layout to split into:
   - A. Chat History: Scrollable area showing all previous questions, answers, and bot messages.
   - B. Current Question & Input: Always visible (sticky at the bottom or top), showing the current question and input field/buttons.
2. Make the current question and input sticky/fixed.
3. Optionally, auto-scroll chat history to the latest message when a new message is added (unless the user is reviewing history).

## Recent Changes
- Added a progress indicator (spinner and message) to the Import page for long-running tasks (e.g., PDF to FHIR conversion).

## Future Enhancements (Deferred)
- **Editable Chat History:**
  - Allow users to edit previous answers directly in the chat history.
  - On editing, update the answer and re-run any dependent logic (e.g., follow-up questions, scores).
  - Add UI affordances (e.g., “Edit” button, inline editing).
  - This feature is planned for a future iteration. 