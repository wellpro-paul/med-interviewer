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

  // Clear ALL environment variables before ALL tests in this suite (needed only for the isolateModules test)
  beforeAll(() => {
    delete process.env.REACT_APP_OPENAI_API_KEY;
    delete process.env.REACT_APP_GEMINI_API_KEY;
  });

  // Restore original environment variables after ALL tests in this suite (needed only for the isolateModules test)
  afterAll(() => {
    process.env.REACT_APP_OPENAI_API_KEY = originalOpenAIKey;
    process.env.REACT_APP_GEMINI_API_KEY = originalGeminiKey;
  });

  // Reset the fetch mock before each individual test
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
    // Clear mocks before each test to ensure isolation
    mockCallOpenAI.mockClear();
    mockCallGemini.mockClear();
    mockGenerateFhirQuestionnaireResponse.mockClear();
    mockSendMessageToLLM.mockClear();
  });

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
        process.env.REACT_APP_GEMINI_API_KEY = 'test-gemini-key';
        process.env.REACT_APP_OPENAI_API_KEY = undefined; // Ensure OpenAI key is not set

        const mockMessages: LLMMessage[] = [{ role: 'user', content: 'Test message' }];
        mockCallGemini.mockResolvedValue('Gemini reply');

        // Now test the mocked sendMessageToLLM
        const { sendMessageToLLM: sendMessageToLLLMocked } = require('./llmService'); // Use require to get the mocked version

        const reply = await sendMessageToLLLMocked(mockMessages);

        expect(mockCallGemini).toHaveBeenCalledTimes(1);
        expect(mockCallGemini).toHaveBeenCalledWith(mockMessages);
        expect(mockCallOpenAI).not.toHaveBeenCalled();
        expect(reply).toBe('Gemini reply');

        // Clean up env vars for this test
        delete process.env.REACT_APP_GEMINI_API_KEY;
    });

    test('should call callOpenAI if OPENAI_API_KEY is set and GEMINI_API_KEY is not', async () => {
        process.env.REACT_APP_OPENAI_API_KEY = 'test-openai-key';
        process.env.REACT_APP_GEMINI_API_KEY = undefined; // Ensure Gemini key is not set

        const mockMessages: LLMMessage[] = [{ role: 'user', content: 'Test message' }];
        mockCallOpenAI.mockResolvedValue('OpenAI reply');

         // Now test the mocked sendMessageToLLM
        const { sendMessageToLLM: sendMessageToLLLMocked } = require('./llmService'); // Use require to get the mocked version

        const reply = await sendMessageToLLLMocked(mockMessages);

        expect(mockCallOpenAI).toHaveBeenCalledTimes(1);
        expect(mockCallOpenAI).toHaveBeenCalledWith(mockMessages);
        expect(mockCallGemini).not.toHaveBeenCalled();
        expect(reply).toBe('OpenAI reply');

        // Clean up env vars for this test
        delete process.env.REACT_APP_OPENAI_API_KEY;
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

      // Get the actual callOpenAI function from the non-mocked module (use require.actual)
      const { callOpenAI: actualCallOpenAI } = jest.requireActual('./llmService');

      const reply = await actualCallOpenAI(mockMessages);

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

      // Get the actual callOpenAI function
      const { callOpenAI: actualCallOpenAI } = jest.requireActual('./llmService');

      await expect(actualCallOpenAI(mockMessages)).rejects.toThrow(
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

      // Get the actual callGemini function
      const { callGemini: actualCallGemini } = jest.requireActual('./llmService');

      const reply = await actualCallGemini(mockMessagesWithSystem);

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

       // Get the actual callGemini function
      const { callGemini: actualCallGemini } = jest.requireActual('./llmService');

      const reply = await actualCallGemini(mockMessagesWithoutSystem);

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

       // Get the actual callGemini function
      const { callGemini: actualCallGemini } = jest.requireActual('./llmService');

      await expect(actualCallGemini(mockMessagesWithSystem)).rejects.toThrow(
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

    test('should call callGemini with correct prompt and return parsed FHIR JSON', async () => {
        mockCallGemini.mockResolvedValue(mockResponseText); // Mock Gemini call to return the JSON string

        // Now test the mocked generateFhirQuestionnaireResponse
        const { generateFhirQuestionnaireResponse: mockedGenerateFhir } = require('./llmService');

        const fhirResponse = await mockedGenerateFhir(mockTranscript);

        expect(mockCallGemini).toHaveBeenCalledTimes(1);
        expect(mockCallGemini).toHaveBeenCalledWith([
            { role: 'user', content: expect.stringContaining('You are a medical data coding assistant') }
        ]);
        expect(fhirResponse).toEqual(mockFhirJson);
    });

    test('should throw an error if callGemini response is not valid JSON', async () => {
       const mockResponseText = 'This is not JSON';
       mockCallGemini.mockResolvedValue(mockResponseText); // Mock Gemini call to return non-JSON string

        // Now test the mocked generateFhirQuestionnaireResponse
        const { generateFhirQuestionnaireResponse: mockedGenerateFhir } = require('./llmService');

      await expect(mockedGenerateFhir(mockTranscript)).rejects.toThrow(
        'Failed to parse FHIR JSON from Gemini response: No JSON found in Gemini response'
      );
       expect(mockCallGemini).toHaveBeenCalledTimes(1);
    });

     test('should throw an error if callGemini API call fails', async () => {
        const mockError = 'Gemini call failed';
        mockCallGemini.mockRejectedValue(new Error(mockError)); // Mock Gemini call to reject

        // Now test the mocked generateFhirQuestionnaireResponse
        const { generateFhirQuestionnaireResponse: mockedGenerateFhir } = require('./llmService');

      await expect(mockedGenerateFhir(mockTranscript)).rejects.toThrow(
        `Gemini call failed` // Expecting the error from the mocked callGemini
      );
       expect(mockCallGemini).toHaveBeenCalledTimes(1);
    });
  });
}); 