import { LLMMessage } from './llmService'; // Keep the type import

// Mock the entire llmService module
const mockCallOpenAI = jest.fn();
const mockCallGemini = jest.fn();
const mockGenerateFhirQuestionnaireResponse = jest.fn();
const mockSendMessageToLLM = jest.fn(); // Mock sendMessageToLLM itself

jest.mock('./llmService', () => ({
  __esModule: true, // This is important for ES modules
  // We will mock sendMessageToLLM and generateFhirQuestionnaireResponse explicitly
  // For tests that need to check the key-checking logic, we'll use isolateModules
  // For tests that rely on the internal call logic, we will mock the calls directly
  sendMessageToLLM: mockSendMessageToLLM,
  generateFhirQuestionnaireResponse: mockGenerateFhirQuestionnaireResponse,
}));

// Mock the global fetch function (already present)
global.fetch = jest.fn();

describe('llmService', () => {
  // Store original environment variables (needed only for the isolateModules test)
  const originalOpenAIKey = process.env.REACT_APP_OPENAI_API_KEY;
  const originalGeminiKey = process.env.REACT_APP_GEMINI_API_KEY;

  // Clear ALL environment variables before ALL tests in this suite
  beforeAll(() => {
    // It's important to clear these if your tests rely on specific key states
    // For most tests here, we'll be mocking the underlying callGemini or fetch,
    // so the actual key values might not matter as much unless testing the key selection logic itself.
    // process.env.REACT_APP_OPENAI_API_KEY = undefined;
    // process.env.REACT_APP_GEMINI_API_KEY = undefined;
  });

  // Restore original environment variables after ALL tests in this suite
  afterAll(() => {
    process.env.REACT_APP_OPENAI_API_KEY = originalOpenAIKey;
    process.env.REACT_APP_GEMINI_API_KEY = originalGeminiKey;
  });

  beforeEach(async () => {
    // Reset mocks before each test
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear(); // Clear fetch mock specifically

    // Dynamically import the actual module to get the non-mocked functions for testing
    // We need to do this because the top-level jest.mock mocks all functions.
    // For testing specific functions like callGemini directly, we need the original.
    const actualLlmService = await jest.requireActual('./llmService');
    moduleToTest = actualLlmService; // Assign to a module-level variable
  });

  // This variable will hold the actual module for testing its internal functions
  let moduleToTest: any;


  // Test case for when no API keys are set (Keep this using isolateModules)
  test('sendMessageToLLM should throw an error if no API keys are set', async () => {
    await jest.isolateModules(async () => {
      // Need to re-import the actual module within isolateModules
      const { sendMessageToLLM } = await import('./llmService');

      expect(() => sendMessageToLLM([])).toThrow(
        'No LLM API key set. Please add your Gemini or OpenAI API key to the .env file.'
      );
    });
  });

  describe('sendMessageToLLM', () => {
    // Tests for sendMessageToLLM, relying on the mocked callOpenAI/callGemini
    test('should call callGemini if GEMINI_API_KEY is set', async () => {
        // This test specifically checks the API key logic in sendMessageToLLM.
        // For this, we need to ensure the actual sendMessageToLLM is called,
        // and its internal dependencies (callGemini, callOpenAI) are mocked.

        // Setup environment for this specific test
        const originalGeminiKey = process.env.REACT_APP_GEMINI_API_KEY;
        const originalOpenAIKey = process.env.REACT_APP_OPENAI_API_KEY;
        process.env.REACT_APP_GEMINI_API_KEY = 'test-gemini-key';
        delete process.env.REACT_APP_OPENAI_API_KEY;


        const localMockCallGemini = jest.fn().mockResolvedValue('Gemini reply');
        const localMockCallOpenAI = jest.fn();

        await jest.isolateModules(async () => {
          jest.doMock('./llmService', () => {
            const originalModule = jest.requireActual('./llmService');
            return {
              ...originalModule,
              callGemini: localMockCallGemini, // Mock callGemini for this isolated test
              callOpenAI: localMockCallOpenAI, // Mock callOpenAI
            };
          });
          const { sendMessageToLLM: isolatedSendMessageToLLM } = await import('./llmService');
          const mockMessages: LLMMessage[] = [{ role: 'user', content: 'Test message' }];
          const reply = await isolatedSendMessageToLLM(mockMessages);

          expect(localMockCallGemini).toHaveBeenCalledTimes(1);
          expect(localMockCallGemini).toHaveBeenCalledWith(mockMessages);
          expect(localMockCallOpenAI).not.toHaveBeenCalled();
          expect(reply).toBe('Gemini reply');
        });
        
        // Restore original environment for other tests
        process.env.REACT_APP_GEMINI_API_KEY = originalGeminiKey;
        process.env.REACT_APP_OPENAI_API_KEY = originalOpenAIKey;
    });

    test('should call callOpenAI if OPENAI_API_KEY is set and GEMINI_API_KEY is not', async () => {
        const originalGeminiKey = process.env.REACT_APP_GEMINI_API_KEY;
        const originalOpenAIKey = process.env.REACT_APP_OPENAI_API_KEY;
        process.env.REACT_APP_OPENAI_API_KEY = 'test-openai-key';
        delete process.env.REACT_APP_GEMINI_API_KEY;

        const localMockCallOpenAI = jest.fn().mockResolvedValue('OpenAI reply');
        const localMockCallGemini = jest.fn();
        
        await jest.isolateModules(async () => {
          jest.doMock('./llmService', () => {
            const originalModule = jest.requireActual('./llmService');
            return {
              ...originalModule,
              callOpenAI: localMockCallOpenAI, // Mock callOpenAI for this isolated test
              callGemini: localMockCallGemini,
            };
          });
          const { sendMessageToLLM: isolatedSendMessageToLLM } = await import('./llmService');
          const mockMessages: LLMMessage[] = [{ role: 'user', content: 'Test message' }];
          const reply = await isolatedSendMessageToLLM(mockMessages);

          expect(localMockCallOpenAI).toHaveBeenCalledTimes(1);
          expect(localMockCallOpenAI).toHaveBeenCalledWith(mockMessages);
          expect(localMockCallGemini).not.toHaveBeenCalled();
          expect(reply).toBe('OpenAI reply');
        });

        process.env.REACT_APP_GEMINI_API_KEY = originalGeminiKey;
        process.env.REACT_APP_OPENAI_API_KEY = originalOpenAIKey;
    });
  });

  describe('callOpenAI', () => {
    // Tests for the internal callOpenAI function, using fetch mock
    const openAIKey = 'test-openai-key';
    const mockMessages: LLMMessage[] = [{ role: 'user', content: 'Hello' }];

    test('should call OpenAI API with correct parameters and return text', async () => {
      process.env.REACT_APP_OPENAI_API_KEY = openAIKey; // Set key for this test

      const mockResponse = {
        choices: [{ message: { content: 'Bot reply' } }],
      };
      const mockFetchPromise = Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);
      (fetch as jest.Mock).mockImplementationOnce(() => mockFetchPromise);

      const reply = await moduleToTest.callOpenAI(mockMessages);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAIKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: mockMessages,
            temperature: 0.7,
          }),
        }
      );
      expect(reply).toBe('Bot reply');

       delete process.env.REACT_APP_OPENAI_API_KEY; // Clean up env var
    });

    test('should throw an error if OpenAI API call fails', async () => {
      process.env.REACT_APP_OPENAI_API_KEY = openAIKey; // Set key for this test

      const mockError = 'API error';
      const mockFetchPromise = Promise.resolve({
        ok: false,
        text: () => Promise.resolve(mockError),
      } as Response);
      (fetch as jest.Mock).mockImplementationOnce(() => mockFetchPromise);

      await expect(moduleToTest.callOpenAI(mockMessages)).rejects.toThrow(
        `OpenAI API error: ${mockError}`
      );

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAIKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: mockMessages,
            temperature: 0.7,
          }),
        }
      );
      delete process.env.REACT_APP_OPENAI_API_KEY; // Clean up env var
    });
  });

  describe('callGemini', () => {
    // Tests for the internal callGemini function, using fetch mock
    const geminiKey = 'test-gemini-key';
    const mockMessagesWithSystem: LLMMessage[] = [
      { role: 'system', content: 'System instruction' },
      { role: 'user', content: 'Hello' },
    ];
     const mockMessagesWithoutSystem: LLMMessage[] = [
      { role: 'user', content: 'Hello' },
    ];

    test('should call Gemini API with correct parameters and return text (with system prompt)', async () => {
      process.env.REACT_APP_GEMINI_API_KEY = geminiKey; // Set key for this test

      const mockResponse = {
        candidates: [{ content: { parts: [{ text: 'Bot reply from Gemini' }] } }],
      };
      const mockFetchPromise = Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);
      (fetch as jest.Mock).mockImplementationOnce(() => mockFetchPromise);

      const reply = await moduleToTest.callGemini(mockMessagesWithSystem);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: 'System instruction' }] }, // System prompt prepended as user message
              { role: 'user', parts: [{ text: 'Hello' }] },
            ],
            generationConfig: { temperature: 0.7 },
          }),
        }
      );
      expect(reply).toBe('Bot reply from Gemini');
      delete process.env.REACT_APP_GEMINI_API_KEY; // Clean up env var
    });

     test('should call Gemini API with correct parameters and return text (without system prompt)', async () => {
       process.env.REACT_APP_GEMINI_API_KEY = geminiKey; // Set key for this test

      const mockResponse = {
        candidates: [{ content: { parts: [{ text: 'Bot reply from Gemini' }] } }],
      };
      const mockFetchPromise = Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);
      (fetch as jest.Mock).mockImplementationOnce(() => mockFetchPromise);

      const reply = await moduleToTest.callGemini(mockMessagesWithoutSystem);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              { role: 'user', parts: [{ text: 'Hello' }] },
            ],
            generationConfig: { temperature: 0.7 },
          }),
        }
      );
      expect(reply).toBe('Bot reply from Gemini');
      delete process.env.REACT_APP_GEMINI_API_KEY; // Clean up env var
    });

    test('should throw an error if Gemini API call fails', async () => {
       process.env.REACT_APP_GEMINI_API_KEY = geminiKey; // Set key for this test

      const mockError = 'API error';
      const mockFetchPromise = Promise.resolve({
        ok: false,
        text: () => Promise.resolve(mockError),
      } as Response);
      (fetch as jest.Mock).mockImplementationOnce(() => mockFetchPromise);

      await expect(moduleToTest.callGemini(mockMessagesWithSystem)).rejects.toThrow(
        `Gemini API error: ${mockError}`
      );

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
             contents: [
              { role: 'user', parts: [{ text: 'System instruction' }] },
              { role: 'user', parts: [{ text: 'Hello' }] },
            ],
            generationConfig: { temperature: 0.7 },
          }),
        }
      );
      delete process.env.REACT_APP_GEMINI_API_KEY; // Clean up env var
    });
  });

  describe('generateFhirQuestionnaireResponse', () => {
    // Tests for generateFhirQuestionnaireResponse, relying on the mocked callGemini
    const mockTranscript = 'Patient says: Feeling good. Interviewer asks: Any headaches? Patient says: No.';
    const mockFhirJson = { resourceType: 'QuestionnaireResponse', status: 'completed' };
    const mockResponseText = JSON.stringify(mockFhirJson);

    // This test uses the mocked generateFhirQuestionnaireResponse from the top of the file
    test('should call the mocked generateFhirQuestionnaireResponse', async () => {
        mockGenerateFhirQuestionnaireResponse.mockResolvedValue(mockFhirJson);
        const fhirResponse = await mockGenerateFhirQuestionnaireResponse(mockTranscript); // Call the mock directly
        expect(mockGenerateFhirQuestionnaireResponse).toHaveBeenCalledWith(mockTranscript);
        expect(fhirResponse).toEqual(mockFhirJson);
    });
  });

  describe('generateConversationalTextForItemsBatch', () => {
    const items = [{ id: '1', text: 'Item 1 text' }, { id: '2', text: 'Item 2 text' }];
    const mockSuccessResponse = { '1': 'Conversational Item 1', '2': 'Conversational Item 2' };
    const geminiKey = 'test-gemini-key-batch';

    beforeEach(() => {
      process.env.REACT_APP_GEMINI_API_KEY = geminiKey;
       // Mock loadPrompt for this suite
      moduleToTest.loadPrompt = jest.fn().mockResolvedValue('Batch prompt template {{items}}');
    });

    afterEach(() => {
      delete process.env.REACT_APP_GEMINI_API_KEY;
    });

    test('should successfully process a batch and return mapped conversational text', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(mockSuccessResponse) }] } }] }),
      } as Response);

      const result = await moduleToTest.generateConversationalTextForItemsBatch(items);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(JSON.parse((fetch as jest.Mock).mock.calls[0][1].body).contents[0].parts[0].text).toContain(JSON.stringify(items));
      expect(result).toEqual(mockSuccessResponse);
    });

    test('should handle LLM API error and return empty map', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        text: async () => 'LLM API Error',
      } as Response);
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await moduleToTest.generateConversationalTextForItemsBatch(items);
      
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual({}); // Returns an empty map on LLM error
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error calling LLM for batch conversational text:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    test('should handle malformed JSON response from LLM and return fallback', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: 'This is not JSON' }] } }] }),
      } as Response);

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await moduleToTest.generateConversationalTextForItemsBatch(items);
      
      expect(fetch).toHaveBeenCalledTimes(1);
      // Expect fallback to original text for each item
      const expectedFallback = items.reduce((acc, item) => {
        acc[item.id] = item.text;
        return acc;
      }, {} as Record<string, string>);
      expect(result).toEqual(expectedFallback);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error parsing LLM response for batch conversational text. Raw response:', 'This is not JSON', expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
     test('should correctly parse JSON when wrapped in markdown ```json ... ```', async () => {
      const wrappedJsonResponse = "```json\n" + JSON.stringify(mockSuccessResponse) + "\n```";
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: wrappedJsonResponse }] } }] }),
      } as Response);

      const result = await moduleToTest.generateConversationalTextForItemsBatch(items);
      expect(result).toEqual(mockSuccessResponse);
    });
  });
  
  describe('addConversationalTextToItems', () => {
    const mockItemsNested = [
      { linkId: 'g1', text: 'Group 1', type: 'group', item: [
        { linkId: 'q1', text: 'Question 1', type: 'string' },
        { linkId: 'q2', text: 'Question 2', type: 'display' }, // Should be skipped
      ]},
      { linkId: 'q3', text: 'Question 3', type: 'boolean', conversationalText: 'Already has it' }, // Should be skipped
      { linkId: 'q4', text: 'Question 4', type: 'choice' },
    ];

    const mockBatchResponse = {
      // Assuming generateConversationalTextForItemsBatch uses the _tempId which includes linkId
      'q1': 'Conversational Q1',
      'q4': 'Conversational Q4',
    };
    
    let originalGenerateBatchFunc: any;

    beforeEach(() => {
      // Store original and mock
      originalGenerateBatchFunc = moduleToTest.generateConversationalTextForItemsBatch;
      moduleToTest.generateConversationalTextForItemsBatch = jest.fn().mockResolvedValue(mockBatchResponse);
    });

    afterEach(() => {
      // Restore original
      moduleToTest.generateConversationalTextForItemsBatch = originalGenerateBatchFunc;
    });

    test('should flatten items, call batch function, and apply results', async () => {
      // Deep clone items to avoid modifying the original test data structure across tests
      const itemsToModify = JSON.parse(JSON.stringify(mockItemsNested));
      
      await moduleToTest.addConversationalTextToItems(itemsToModify);

      expect(moduleToTest.generateConversationalTextForItemsBatch).toHaveBeenCalledTimes(1);
      const calledWithItems = (moduleToTest.generateConversationalTextForItemsBatch as jest.Mock).mock.calls[0][0];
      
      // Check that only processable items were sent
      expect(calledWithItems).toEqual(expect.arrayContaining([
        expect.objectContaining({ text: 'Question 1' }), // id will be the generated _tempId
        expect.objectContaining({ text: 'Question 4' }), // id will be the generated _tempId
      ]));
      expect(calledWithItems.length).toBe(2); // q2 (display) and q3 (already has text) should be skipped

      // Check that conversationalText was applied
      expect(itemsToModify[0].item[0].conversationalText).toBe('Conversational Q1'); // q1
      expect(itemsToModify[0].item[1].conversationalText).toBeUndefined(); // q2 (display)
      expect(itemsToModify[1].conversationalText).toBe('Already has it'); // q3 (pre-existing)
      expect(itemsToModify[2].conversationalText).toBe('Conversational Q4'); // q4
    });
  });

  describe('conductFullQuestionnaireInterview', () => {
    const unanswered = [{ linkId: 'q1', text: 'Q1 text', type: 'string' }];
    const answered = [{ linkId: 'q0', text: 'Q0 text', answer: 'Ans0' }];
    const history = 'Interviewer: Hi';
    const geminiKey = 'test-gemini-key-interview';

    beforeEach(() => {
      process.env.REACT_APP_GEMINI_API_KEY = geminiKey;
      moduleToTest.loadPrompt = jest.fn().mockResolvedValue('Interview prompt {{unanswered_questions}} {{answered_questions}} {{chat_history}}');
    });
    afterEach(() => {
      delete process.env.REACT_APP_GEMINI_API_KEY;
    });

    test('should call LLM and parse valid "ask" action', async () => {
      const mockLLMResponse = { action: "ask", linkId_asked: "q1", text_response: "Ask Q1", requires_answer_options: false };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(mockLLMResponse) }] } }] }),
      } as Response);

      const result = await moduleToTest.conductFullQuestionnaireInterview(unanswered, answered, history);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockLLMResponse);
    });

    test('should call LLM and parse valid "complete" action', async () => {
      const mockLLMResponse = { action: "complete", text_response: "Thanks!" };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(mockLLMResponse) }] } }] }),
      } as Response);
      const result = await moduleToTest.conductFullQuestionnaireInterview([], answered, history);
      expect(result).toEqual(mockLLMResponse);
    });
    
    test('should return default error action on LLM API error', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false, text: async () => 'API Error'
      } as Response);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await moduleToTest.conductFullQuestionnaireInterview(unanswered, answered, history);
      expect(result).toEqual({
        action: "error",
        text_response: "Sorry, there was an error communicating with the AI. Please try again later.",
        linkId_asked: null,
        linkId_clarify: null,
        requires_answer_options: false
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith("Error in conductFullQuestionnaireInterview calling LLM:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });

    test('should return default error action on malformed JSON response', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: "Malformed JSON" }] } }] }),
      } as Response);
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await moduleToTest.conductFullQuestionnaireInterview(unanswered, answered, history);
      expect(result).toEqual({
        action: "error",
        text_response: "Sorry, I had trouble understanding that. Could you try rephrasing?",
        linkId_asked: null,
        linkId_clarify: null,
        requires_answer_options: false
      });
      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to parse LLM response JSON:", expect.any(Error));
      consoleErrorSpy.mockRestore();
    });
     test('should correctly parse JSON when wrapped in markdown ```json ... ``` for interview', async () => {
      const mockLLMResponse = { action: "ask", linkId_asked: "q1", text_response: "Ask Q1 wrapped", requires_answer_options: false };
      const wrappedJsonResponse = "```json\n" + JSON.stringify(mockLLMResponse) + "\n```";
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ candidates: [{ content: { parts: [{ text: wrappedJsonResponse }] } }] }),
      } as Response);

      const result = await moduleToTest.conductFullQuestionnaireInterview(unanswered, answered, history);
      expect(result).toEqual(mockLLMResponse);
    });
  });
});