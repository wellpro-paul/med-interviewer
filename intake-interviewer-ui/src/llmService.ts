// LLM prompts are now loaded from intake-interviewer-ui/public/prompts/*.txt. See plan.md for future UI editing.
// TODO: In the future, allow editing of prompt files from the UI.

// LLM service for OpenAI (can be extended for Gemini)
const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.REACT_APP_GEMINI_MODEL || process.env.GEMINI_MODEL || 'gemini-2.5-pro-preview-05-06';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function callOpenAI(messages: LLMMessage[]): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function callGemini(messages: LLMMessage[]): Promise<string> {
  // Gemini does NOT support 'system' role. Prepend system prompt as first user message if present.
  let geminiMessages = messages;
  if (messages.length > 0 && messages[0].role === 'system') {
    const systemPrompt = messages[0].content;
    // Find the first user message
    const firstUserIdx = messages.findIndex(m => m.role === 'user');
    if (firstUserIdx !== -1) {
      geminiMessages = [
        // All messages before the first user message (excluding system)
        ...messages.slice(1, firstUserIdx),
        // Prepend system prompt as user message
        { role: 'user', content: systemPrompt },
        // All messages from the first user message onward
        ...messages.slice(firstUserIdx)
      ];
    } else {
      // No user message yet, just drop system
      geminiMessages = messages.slice(1);
    }
  }
  // Now convert to Gemini format
  const geminiApiMessages = geminiMessages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : msg.role, // Gemini uses 'model' instead of 'assistant'
    parts: [{ text: msg.content }],
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiApiMessages,
        generationConfig: { temperature: 0.7 },
      }),
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }
  const data = await response.json();
  // Gemini's response: {candidates: [{content: {parts: [{text: '...'}]}}]}
  return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No response from Gemini.';
}

// Helper to load a prompt file from intake-interviewer-ui/public/prompts/
async function loadPrompt(name: string): Promise<string> {
  const res = await fetch(`/prompts/${name}.txt`);
  if (!res.ok) throw new Error(`Failed to load prompt: ${name}`);
  return res.text();
}

/**
 * Generate a FHIR QuestionnaireResponse JSON from a chat transcript using Gemini 2.0 Flash.
 * @param transcript The full chat transcript as Markdown or Q&A pairs.
 * @returns Parsed FHIR QuestionnaireResponse JSON object.
 */
export async function generateFhirQuestionnaireResponse(transcript: string): Promise<any> {
  const promptTemplate = await loadPrompt('generateFhirQuestionnaireResponse');
  const systemPrompt = promptTemplate.replaceAll('${transcript}', transcript);
  // Gemini does not support 'system' role, so prepend as user message
  const messages = [
    { role: 'user', content: systemPrompt }
  ];
  const geminiApiMessages = messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : msg.role,
    parts: [{ text: msg.content }],
  }));
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: geminiApiMessages,
        generationConfig: { temperature: 0.2 },
      }),
    }
  );
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${error}`);
  }
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
  try {
    // Try to parse the first JSON object in the response
    const jsonStart = text.indexOf('{');
    const jsonEnd = text.lastIndexOf('}');
    if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found in Gemini response');
    const jsonString = text.slice(jsonStart, jsonEnd + 1);
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Failed to parse FHIR JSON from Gemini response: ' + (e as Error).message + '\nRaw response: ' + text);
  }
}

/**
 * Convert a Markdown questionnaire to FHIR Questionnaire JSON using Gemini.
 * @param markdown The questionnaire in Markdown format.
 * @returns Parsed FHIR Questionnaire JSON object.
 */
export async function markdownToFhirQuestionnaire(markdown: string): Promise<any> {
  const promptTemplate = await loadPrompt('markdownToFhirQuestionnaire');
  const prompt = promptTemplate.replaceAll('${markdown}', markdown);
  const messages: LLMMessage[] = [{ role: 'user', content: prompt }];
  const response = await callGemini(messages);

  // Remove code fencing (```json ... ``` or ``` ... ```)
  let cleaned = response.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  }
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Try to extract the largest JSON block
  const jsonStart = cleaned.indexOf('{');
  const jsonEnd = cleaned.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('No JSON found in Gemini response. Raw response: ' + response);
  const jsonString = cleaned.slice(jsonStart, jsonEnd + 1);
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    throw new Error('Failed to parse FHIR JSON from Gemini response: ' + (e as Error).message + '\nRaw response: ' + response);
  }
}

export async function sendMessageToLLM(messages: LLMMessage[]): Promise<string> {
  if (GEMINI_API_KEY) {
    return callGemini(messages);
  } else if (OPENAI_API_KEY) {
    return callOpenAI(messages);
  } else {
    throw new Error('No LLM API key set. Please add your Gemini or OpenAI API key to the .env file.');
  }
}

/**
 * Generate a conversational phrasing for a FHIR questionnaire item using the LLM.
 * @param item The FHIR questionnaire item (must have .text, .type, and optionally .answerOption)
 * @returns A friendly, conversational question string
 */
export async function generateConversationalTextForItem(item: any): Promise<string> {
  let optionsText = '';
  if (item.answerOption && Array.isArray(item.answerOption) && item.answerOption.length > 0) {
    const opts = item.answerOption.map((opt: any) => {
      if (opt.valueCoding) return opt.valueCoding.display || opt.valueCoding.code;
      if (typeof opt.valueString === 'string') return opt.valueString;
      if (typeof opt.valueInteger === 'number') return String(opt.valueInteger);
      return '';
    }).filter(Boolean);
    optionsText = `\nAnswer options: ${opts.join(', ')}`;
  }
  const promptTemplate = await loadPrompt('generateConversationalTextForItem');
  const prompt = promptTemplate
    .replaceAll('${item.text}', item.text)
    .replaceAll('${item.type}', item.type)
    .replaceAll('${optionsText}', optionsText);
  const messages: LLMMessage[] = [
    { role: 'user', content: prompt }
  ];
  try {
    const response = await sendMessageToLLM(messages);
    return response.trim();
  } catch (e) {
    return item.text || '';
  }
}

/**
 * Recursively add conversationalText to all items in a FHIR Questionnaire using Gemini.
 * Mutates the items in place.
 * @param items The array of FHIR Questionnaire items
 */
export async function addConversationalTextToItems(items: any[]): Promise<void> {
  if (!Array.isArray(items)) return;
  for (const item of items) {
    if (item.text) {
      try {
        item.conversationalText = await generateConversationalTextForItem(item);
      } catch (e) {
        item.conversationalText = item.text;
      }
    }
    if (Array.isArray(item.item)) {
      await addConversationalTextToItems(item.item);
    }
  }
}

/**
 * Conduct a full conversational interview using the entire FHIR Questionnaire JSON.
 * The LLM is instructed to act as an interviewer, asking questions in a natural order and collecting answers.
 * @param questionnaireJson The full FHIR Questionnaire JSON (object or string)
 * @param chatHistory The conversation so far (as a string transcript)
 * @returns The LLM's next message (next question or summary)
 */
export async function conductFullQuestionnaireInterview(questionnaireJson: any, chatHistory: string): Promise<string> {
  const promptTemplate = await loadPrompt('fullQuestionnaireInterview');
  const questionnaireStr = typeof questionnaireJson === 'string' ? questionnaireJson : JSON.stringify(questionnaireJson, null, 2);
  const prompt = promptTemplate
    .replaceAll('${questionnaireJson}', questionnaireStr)
    .replaceAll('${chatHistory}', chatHistory);
  const messages: LLMMessage[] = [
    { role: 'user', content: prompt }
  ];
  return sendMessageToLLM(messages);
}