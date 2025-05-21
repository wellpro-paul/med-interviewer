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
    - Questionnaire Import page (paste/upload FHIR JSON or Markdown, transform and load)
    - Chat Interview page (driven by loaded questionnaire)
    - Logs page (view/download/delete logs)
- [x] **Implement questionnaire import workflow:**
    - Transform Markdown to FHIR JSON in the UI using Gemini LLM (LLM-powered, not regex)
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
- [ ] Improve LOINC mapping and question coverage
- [ ] Add summary/confirmation step before export (optional)
- [ ] Add file-based import/export for responses
- [ ] Polish UI/UX further (animations, avatars, etc.)
- [ ] Support for custom questionnaire upload/ingestion (Markdown, PDF-to-text, CSV, etc.)
- [ ] Parse uploaded questionnaires and use to drive LLM interview flow
- [ ] (Future) ValueSet/LOINC mapping for imported questionnaires
- [ ] (Future) Multi-session support or "start new chat" option

### Phase 3: FHIR & Cloud Readiness
- [ ] Export results as FHIR QuestionnaireResponse JSON (already in Phase 1 for local export)
- [ ] Prepare for Medplum/Vertex AI integration
- [ ] Add authentication/logging hooks (for cloud)
- [ ] Add multi-language support (scaffold only)

## Milestones
- **M1:** Multi-page navigation and import workflow (Questionnaire Import, Chat Interview, Logs)
- **M2:** Hybrid scoring system for MSQ (per-symptom, section, and grand total scoring with UI and LLM integration)
- **M3:** LLM-powered Markdown-to-FHIR conversion for admin import of freeform questionnaires
- **M4:** Voice scaffolding, improved LOINC mapping, import/export, custom questionnaire upload/ingestion, multi-session support, ValueSet/LOINC mapping for imported questionnaires
- **M5:** Medplum/cloud integration, FHIR enhancements, authentication

## Out of Scope (for now)
- Production authentication/logging
- Full Medplum integration
- Multi-language support
- Advanced analytics
- Note: Large Markdown questionnaires may require chunking for LLM conversion. 