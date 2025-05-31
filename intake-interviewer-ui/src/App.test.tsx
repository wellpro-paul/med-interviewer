import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { fireEvent, waitFor } from '@testing-library/react';

import { MemoryRouter, Routes, Route } from 'react-router-dom';
// Ensure QuestionnaireContext is imported as a named import.
import { QuestionnaireContext } from './App';

// Mock Element.prototype.scrollIntoView
const mockScrollIntoView = jest.fn();
Element.prototype.scrollIntoView = mockScrollIntoView; 

// Mock Element.prototype.scrollIntoView
Element.prototype.scrollIntoView = jest.fn();

// Mock llmService comprehensively
const mockLlmService = {
  sendMessageToLLM: jest.fn(),
  generateFhirQuestionnaireResponse: jest.fn(),
  markdownToFhirQuestionnaire: jest.fn(),
  conductFullQuestionnaireInterview: jest.fn(),
  generateConversationalTextForItem: jest.fn(),
  addConversationalTextToItems: jest.fn(), // Assuming this might be called if not fully isolated
  generateConversationalTextForItemsBatch: jest.fn(),
};
jest.mock('./llmService', () => mockLlmService);

// Mock localStorage
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock file-saver
jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

// Mock catalogUtils if needed for providing questionnaire
jest.mock('./catalogUtils', () => ({
  loadCatalog: jest.fn(() => []), // Default to empty catalog
  saveQuestionnaireToCatalog: jest.fn(),
  deleteFromCatalog: jest.fn(),
  updateQuestionnaireTitle: jest.fn(),
}));


const mockQuestionnaire = {
  id: 'test-q',
  resourceType: 'Questionnaire',
  title: 'Test Questionnaire',
  item: [
    { linkId: 'q1', text: 'Question 1 Text', type: 'string' },
    { linkId: 'q2', text: 'Question 2 Text', type: 'choice', answerOption: [{valueCoding: {code: 'a1', display: 'Answer 1'}}, {valueCoding: {code: 'a2', display: 'Answer 2'}}]},
    { linkId: 'q3', text: 'Question 3 Text', type: 'boolean' },
  ],
};


describe('App.tsx - LLM Full Interview Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clears all mock usage data
    localStorageMock.clear(); // Clear localStorage for each test
  });

  const renderChatPageWithMode = async (questionnaire: any, mode: 'llm-full-interview' | 'step') => {
    // @ts-ignore
    const setQuestionnaire = jest.fn(); // Mock setter for context
    
    render(
      <QuestionnaireContext.Provider value={{ questionnaire, setQuestionnaire }}>
        <MemoryRouter initialEntries={[{ pathname: '/chat', state: { interviewMode: mode } }]}> 
          <Routes>
            <Route path="/chat" element={<App />} /> {/* Assuming ChatPage is rendered by App at /chat */}
          </Routes>
        </MemoryRouter>
      </QuestionnaireContext.Provider>
    );
    return { setQuestionnaire };
  };

  test('initial load in LLM Full Interview mode displays first question from LLM', async () => {
    const initialLLMResponse = {
      action: 'ask',
      linkId_asked: 'q1',
      text_response: 'LLM First Question: Question 1 Text?',
      requires_answer_options: false,
    };
    mockLlmService.conductFullQuestionnaireInterview.mockResolvedValueOnce(initialLLMResponse);

    await renderChatPageWithMode(mockQuestionnaire, 'llm-full-interview');
    
    // Verify initial welcome message from App.tsx and then the first LLM question
    await screen.findByText("Welcome! I'll conduct this intake interview conversationally. Let's get started.");
    await screen.findByText('LLM First Question: Question 1 Text?');

    // Verify conductFullQuestionnaireInterview was called correctly for initialization
    expect(mockLlmService.conductFullQuestionnaireInterview).toHaveBeenCalledTimes(1);
    expect(mockLlmService.conductFullQuestionnaireInterview).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ linkId: 'q1', text: 'Question 1 Text' }),
        expect.objectContaining({ linkId: 'q2', text: 'Question 2 Text' }),
        expect.objectContaining({ linkId: 'q3', text: 'Question 3 Text' }),
      ]), // unansweredQuestions
      [], // answeredQuestions
      expect.stringContaining("Welcome! I'll conduct this intake interview conversationally.") // chatHistory
    );
    // Further check on currentLlmQuestionLinkId would require exposing state or testing behavior dependent on it.
  });

  test('handleLlmFullInterview processes "ask" action correctly', async () => {
    const initialLLMResponse = { action: 'ask', linkId_asked: 'q1', text_response: 'LLM Q1?' };
    const secondLLMResponse = { action: 'ask', linkId_asked: 'q2', text_response: 'LLM Q2?' };
    mockLlmService.conductFullQuestionnaireInterview
      .mockResolvedValueOnce(initialLLMResponse) // For startLlmInterview
      .mockResolvedValueOnce(secondLLMResponse);  // For the first handleLlmFullInterview call

    await renderChatPageWithMode(mockQuestionnaire, 'llm-full-interview');
    
    await screen.findByText('LLM Q1?');

    const inputElement = screen.getByPlaceholderText('Type your answer...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(inputElement, { target: { value: 'User Answer to Q1' } });
    fireEvent.click(sendButton);

    await screen.findByText('User Answer to Q1');
    await screen.findByText('LLM Q2?');
    
    expect(mockLlmService.conductFullQuestionnaireInterview).toHaveBeenCalledTimes(2);
    // Check arguments of the second call (the one from handleLlmFullInterview)
    const secondCallArgs = mockLlmService.conductFullQuestionnaireInterview.mock.calls[1];
    expect(secondCallArgs[0]).toEqual(expect.arrayContaining([ // unanswered
      expect.objectContaining({ linkId: 'q2' }),
      expect.objectContaining({ linkId: 'q3' }),
    ]));
    expect(secondCallArgs[0].length).toBe(2); // q2 and q3 are unanswered
    expect(secondCallArgs[1]).toEqual([ // answered
      { linkId: 'q1', questionText: 'Question 1 Text', answer: 'User Answer to Q1' }
    ]);
    // currentLlmQuestionLinkId should now be 'q2' (verified by next interaction or state exposure)
  });

  test('handleLlmFullInterview processes "complete" action and triggers log saving', async () => {
    const initialLLMResponse = { action: 'ask', linkId_asked: 'q1', text_response: 'LLM Q1?' };
    const finalLLMResponse = { action: 'complete', text_response: 'Interview complete! Thanks.' };
    mockLlmService.conductFullQuestionnaireInterview
      .mockResolvedValueOnce(initialLLMResponse)
      .mockResolvedValueOnce(finalLLMResponse);
    // Mock generateFhirQuestionnaireResponse for the log saving part
    mockLlmService.generateFhirQuestionnaireResponse.mockResolvedValueOnce({ resourceType: 'QuestionnaireResponse', item: [] });


    await renderChatPageWithMode(mockQuestionnaire, 'llm-full-interview');
    await screen.findByText('LLM Q1?');

    const inputElement = screen.getByPlaceholderText('Type your answer...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(inputElement, { target: { value: 'User Final Answer' } });
    fireEvent.click(sendButton);
    
    await screen.findByText('User Final Answer');
    await screen.findByText('Interview complete! Thanks.');
    
    // Verify interview completion UI if any (e.g., input disabled)
    expect(inputElement).toBeDisabled();
    expect(sendButton).toBeDisabled();

    // Check if log saving was triggered
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'chatLogs',
        expect.stringContaining('Interview complete! Thanks.') // Check if transcript was part of the saved log
      );
    });
    expect(mockLlmService.generateFhirQuestionnaireResponse).toHaveBeenCalled();
  });
  
  test('handleLlmFullInterview processes "error" action from LLM', async () => {
    const initialLLMResponse = { action: 'ask', linkId_asked: 'q1', text_response: 'LLM Q1?' };
    const errorLLMResponse = { action: 'error', text_response: 'Sorry, an LLM error occurred.' };
    mockLlmService.conductFullQuestionnaireInterview
      .mockResolvedValueOnce(initialLLMResponse)
      .mockResolvedValueOnce(errorLLMResponse);

    await renderChatPageWithMode(mockQuestionnaire, 'llm-full-interview');
    await screen.findByText('LLM Q1?');

    const inputElement = screen.getByPlaceholderText('Type your answer...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(inputElement, { target: { value: 'User input causing error' } });
    fireEvent.click(sendButton);

    await screen.findByText('User input causing error');
    await screen.findByText('Sorry, an LLM error occurred.');
    // Input should still be enabled for user to try again or for app to offer other options
    expect(inputElement).not.toBeDisabled(); 
  });
});
