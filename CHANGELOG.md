## [v0.1] - 2025-05-29
### Added
- Initial prototype release.
- Import page for Markdown, FHIR JSON, and PDF (with LLM conversion).
- Catalog page for saving, viewing, and starting chat with questionnaires.
- Chat page with conversational interview, scoring, and logs.
- Progress indicator (spinner/message) on Import page for long-running tasks.
- Sticky current question and input on Chat page; scrollable chat history.
- Custom favicon and app icons; browser tab shows "Intake Interviewer".
- Improved and comprehensive documentation.
- Root-level npm scripts (`start`, `build`, `test`, `lint`, `format`) delegate to the UI app for convenience.
- **Environment variable support for Gemini models:** You can now set `REACT_APP_GEMINI_MODEL` for chat/interview and `REACT_APP_GEMINI_MODEL_FHIR` for FHIR conversion separately in your `.env` file. 
- **LLM 'score' action:** The LLM prompt and app logic now support a `score` action, so score/summary messages are displayed as bot messages and not treated as questions. This prevents the app from prompting the user to answer scores or summaries. 