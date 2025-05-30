// LLM prompts are now loaded from src/prompts/*.txt. See plan.md for future UI editing.
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

// Helper to load a prompt file from src/prompts/
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
    const questionnaire = JSON.parse(jsonString);
    // After successfully parsing the questionnaire, add conversational text to its items.
    if (questionnaire.item && Array.isArray(questionnaire.item)) {
      await addConversationalTextToItems(questionnaire.item);
    }
    return questionnaire;
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
    // If LLM fails, fall back to original text
    console.warn(`Failed to generate conversational text for item: "${item.text}". Error: ${e}`);
    return item.text || '';
  }
}

/**
 * Generates conversational text for a batch of questionnaire items using the LLM.
 * @param items An array of items, each with an 'id' and 'text' property.
 * @returns A promise that resolves to a record mapping item IDs to conversational text.
 */
export async function generateConversationalTextForItemsBatch(
  items: Array<{id: string; text: string}>
): Promise<Record<string, string>> {
  if (items.length === 0) {
    return {};
  }
  const promptTemplate = await loadPrompt('generateConversationalTextForItemsBatch'); // This prompt was created in a previous step
  const formattedPrompt = promptTemplate.replaceAll('{{items}}', JSON.stringify(items));

  console.log(
    `Generating conversational text for batch of ${items.length} items.`
  );

  const messages: LLMMessage[] = [{role: 'user', content: formattedPrompt}];

  try {
    const result = await callGemini(messages); // Using callGemini directly as per existing patterns

    // The LLM might return a string enclosed in ```json ... ```, so we need to extract the JSON part.
    const jsonMatch = result.match(/```json\n([\s\S]*?)\n```/);
    let parsedResult: Record<string, string>;

    if (jsonMatch && jsonMatch[1]) {
      parsedResult = JSON.parse(jsonMatch[1]);
    } else {
      // If no ```json ... ``` block is found, try to parse the whole string.
      // This handles cases where the LLM might not perfectly adhere to the ```json block format.
      try {
        parsedResult = JSON.parse(result);
      } catch (parseError) {
        console.error('Error parsing LLM response for batch conversational text. Raw response:', result, 'Parse error:', parseError);
        // Fallback: attempt to create a result for items where text might be the raw output, if desperate
        const fallbackResult: Record<string, string> = {};
        items.forEach(item => {
          // This is a very basic fallback, assuming the LLM might have just returned text for the *first* item
          // or some other non-JSON compliant string. It's unlikely to be correct for all items.
          if (items.length === 1) fallbackResult[item.id] = result; // If only one item, maybe the result is its text
          else fallbackResult[item.id] = item.text; // Default to original text on parse failure for multiple items
        });
        return fallbackResult;
      }
    }

    // Validate that the parsed result is a Record<string, string>
    if (
      typeof parsedResult === 'object' &&
      parsedResult !== null &&
      Object.keys(parsedResult).length > 0 && // Ensure it's not an empty object if items were processed
      Object.values(parsedResult).every(value => typeof value === 'string')
    ) {
      return parsedResult;
    } else {
      console.error(
        'Parsed LLM response is not in the expected format (Record<string, string>):',
        parsedResult,
        'Raw LLM response:', result
      );
      // Fallback for unexpected structure
      const fallbackResult: Record<string, string> = {};
      items.forEach(item => fallbackResult[item.id] = item.text); // Default to original text
      return fallbackResult;
    }
  } catch (error) {
    console.error('Error calling LLM for batch conversational text:', error);
    // Fallback: return original texts for all items in the batch
    const fallbackResult: Record<string, string> = {};
    items.forEach(item => fallbackResult[item.id] = item.text);
    return fallbackResult;
  }
}

interface ItemWithTempId extends fhir4.QuestionnaireItem {
  _tempId?: string; // Temporary id for batch processing
}

// Helper function to recursively collect items needing conversational text
function collectItemsForBatchProcessing(
  items: ItemWithTempId[],
  collection: Array<{id: string; text: string}>,
  idPrefix: string = 'item'
): void {
  if (!Array.isArray(items)) return;

  items.forEach((item, index) => {
    // Ensure each item has a unique temporary ID for this batch operation.
    // We use _tempId to avoid conflicts if item.id or item.linkId is already used for other purposes.
    item._tempId = item.linkId || `${idPrefix}-${index}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Check if item has text and doesn't already have conversational text
    // Also, ensure it's not a display item, as they don't need conversational text.
    if (item.text && !item.conversationalText && item.type !== 'display') {
      collection.push({id: item._tempId, text: item.text});
    }

    // Recursively process sub-items
    if (Array.isArray(item.item)) {
      collectItemsForBatchProcessing(item.item as ItemWithTempId[], collection, item._tempId);
    }
  });
}

// Helper function to recursively apply conversational text from batch results
function applyBatchResultsToItems(
  items: ItemWithTempId[],
  batchResults: Record<string, string>
): void {
  if (!Array.isArray(items)) return;

  items.forEach(item => {
    if (item._tempId && batchResults[item._tempId]) {
      item.conversationalText = batchResults[item._tempId];
    }
    // Clean up temporary ID after processing
    // delete item._tempId; // Keep for now for easier debugging if needed, can be removed later

    if (Array.isArray(item.item)) {
      applyBatchResultsToItems(item.item as ItemWithTempId[], batchResults);
    }
  });
}

/**
 * Recursively add conversationalText to all items in a FHIR Questionnaire using batch LLM calls.
 * Mutates the items in place.
 * @param items The array of FHIR Questionnaire items (or any compatible structure with .text, .item fields)
 */
export async function addConversationalTextToItems(items: any[]): Promise<void> {
  if (!Array.isArray(items) || items.length === 0) return;

  const itemsToProcess: Array<{id: string; text: string}> = [];
  // Cast to ItemWithTempId[] for internal processing that adds temporary '_tempId'
  const itemsWithTempIds = items as ItemWithTempId[];

  collectItemsForBatchProcessing(itemsWithTempIds, itemsToProcess);

  if (itemsToProcess.length > 0) {
    const batchResults = await generateConversationalTextForItemsBatch(itemsToProcess);
    applyBatchResultsToItems(itemsWithTempIds, batchResults);
  }
  // The items array (itemsWithTempIds) has been mutated with conversationalText.
  // No need to return it explicitly as the input array is modified directly.
}

/**
 * Conduct a full conversational interview using the entire FHIR Questionnaire JSON.
 * The LLM is instructed to act as an interviewer, asking questions in a natural order and collecting answers.
 * Conduct a full conversational interview using the LLM.
 * The LLM is instructed to act as an interviewer, asking questions based on the provided context
 * and returning a structured JSON response indicating the next action.
 * @param unansweredQuestions Array of questionnaire items yet to be answered.
 * @param answeredQuestions Array of questions already answered by the user.
 * @param chatHistory The conversation so far (as a string transcript).
 * @returns A promise that resolves to a parsed JSON object from the LLM, conforming to the specified output structure.
 */
export async function conductFullQuestionnaireInterview(
  unansweredQuestions: any[],
  answeredQuestions: any[],
  chatHistory: string
): Promise<any> { // The return type will be the parsed JSON object from the LLM
  const promptTemplate = await loadPrompt('fullQuestionnaireInterview');

  const unansweredQuestionsJson = JSON.stringify(unansweredQuestions);
  const answeredQuestionsJson = JSON.stringify(answeredQuestions);

  const prompt = promptTemplate
    .replaceAll('{{unanswered_questions}}', unansweredQuestionsJson)
    .replaceAll('{{answered_questions}}', answeredQuestionsJson)
    .replaceAll('{{chat_history}}', chatHistory);

  const messages: LLMMessage[] = [
    { role: 'user', content: prompt }
  ];

  try {
    const llmResponse = await sendMessageToLLM(messages);
    
    // Attempt to parse the LLM's response as JSON
    let parsedResponse;
    try {
      // The LLM might return a string enclosed in ```json ... ```, so extract the JSON part.
      const jsonMatch = llmResponse.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch && jsonMatch[1]) {
        parsedResponse = JSON.parse(jsonMatch[1]);
      } else {
        // If no ```json ... ``` block is found, try to parse the whole string.
        parsedResponse = JSON.parse(llmResponse);
      }
    } catch (e) {
      console.error("Failed to parse LLM response JSON:", e);
      console.error("Raw LLM Response:", llmResponse);
      return {
        action: "error",
        text_response: "Sorry, I had trouble understanding that. Could you try rephrasing?",
        linkId_asked: null,
        linkId_clarify: null,
        requires_answer_options: false
      };
    }

    // Validate the structure of the parsed response (basic validation)
    if (!parsedResponse.action || !parsedResponse.text_response) {
      console.error("LLM response JSON is missing required fields (action or text_response). Parsed response:", parsedResponse);
      console.error("Raw LLM Response:", llmResponse);
      return {
        action: "error",
        text_response: "Sorry, I received an unexpected response. Please try again.",
        linkId_asked: null,
        linkId_clarify: null,
        requires_answer_options: false
      };
    }

    return parsedResponse;

  } catch (error) {
    console.error("Error in conductFullQuestionnaireInterview calling LLM:", error);
    return {
      action: "error",
      text_response: "Sorry, there was an error communicating with the AI. Please try again later.",
      linkId_asked: null,
      linkId_clarify: null,
      requires_answer_options: false
    };
  }
}