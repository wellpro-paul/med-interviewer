import React, { useState, useRef, createContext, useContext } from 'react';
import { Box, Container, Paper, Typography, TextField, IconButton, ListItem, ListItemText, AppBar, Toolbar, Dialog, DialogTitle, DialogContent, List as MUIList, Button, Tabs, Tab, DialogActions, TextField as MUITextField, Snackbar, Alert, Switch, FormControlLabel } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { sendMessageToLLM, LLMMessage, generateFhirQuestionnaireResponse, markdownToFhirQuestionnaire, conductFullQuestionnaireInterview } from './llmService';
import { saveAs } from 'file-saver';
import ScoreInput from './ScoreInput';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { loadCatalog, saveQuestionnaireToCatalog, deleteFromCatalog, updateQuestionnaireTitle, CatalogQuestionnaire } from './catalogUtils';
import ReactMarkdown from 'react-markdown';
import BugReportIcon from '@mui/icons-material/BugReport';
import JSZip from 'jszip';
// @ts-ignore
import * as pdfjsLib from 'pdfjs-dist';
// Set workerSrc for pdfjs after all imports
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';


// Move utility functions outside the App component
export const getToday = () => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

export const getTime = () => {
  const now = new Date();
  return now.toTimeString().slice(0, 8).replace(/:/g, '-');
};

// Helper to generate Markdown transcript
export const generateMarkdownTranscript = (messages: { sender: 'user' | 'bot'; text: string }[]): string => {
  const mdLines = messages.map((msg) => {
    const prefix = msg.sender === 'bot' ? '**Interviewer:**' : '**Patient:**';
    return `${prefix} ${msg.text}`;
  });
  const mdContent = `# Medical Intake Chat Log\n\n${mdLines.join('\n\n')}`;
  return mdContent;
};

export const saveSessionToLocalStorage = (day: string, time: string, sessionData: { markdown: string; fhir: any; questionnaireTitle?: string }) => {
  const logs = JSON.parse(localStorage.getItem('chatLogs') || '{}');
  if (!logs[day]) logs[day] = {};
  logs[day][time] = sessionData;
  localStorage.setItem('chatLogs', JSON.stringify(logs));
};

export const loadLogsFromLocalStorage = () => {
  // Declare logs with a loose type to allow both string and object
  let logs: { [day: string]: { [time: string]: any } } = {};
  const storedLogs = localStorage.getItem('chatLogs');
  if (storedLogs) {
    try {
      // Parse the JSON and assign to logs
      const parsedLogs = JSON.parse(storedLogs);
      // Optional: Add runtime validation here if needed
      logs = parsedLogs;
    } catch (error) {
      console.error('Failed to parse chat logs from localStorage:', error);
      // Return an empty object if parsing fails to prevent the app from crashing
      return {};
    }
  }
  // Ensure sanitizedLogs is explicitly typed for correct structure
  const sanitizedLogs: { [day: string]: { [time: string]: { markdown: string; fhir: any } } } = {};
  for (const day in logs) {
    if (logs.hasOwnProperty(day)) {
      sanitizedLogs[day] = {};
      for (const time in logs[day]) {
        if (logs[day].hasOwnProperty(time)) {
          // Check if the stored data is just a string (old format) or the new object format
          if (typeof logs[day][time] === 'string') {
            // Convert old format to new format (FHIR will be null)
            sanitizedLogs[day][time] = { markdown: logs[day][time], fhir: null };
          } else if (logs[day][time] !== null && typeof logs[day][time] === 'object' && logs[day][time].hasOwnProperty('markdown')) {
            // Assume new format with markdown property
            sanitizedLogs[day][time] = logs[day][time] as { markdown: string; fhir: any };
          } else {
             // Invalid format, skip or handle appropriately
             console.warn(`Skipping invalid log data for ${day} ${time}`);
          }
        }
      }
    }
  }
  // Ensure the function returns the correct type
  return sanitizedLogs; // Return the sanitized logs
};

// Context for loaded questionnaire
interface QuestionnaireContextType {
  questionnaire: any | null;
  setQuestionnaire: (q: any) => void;
}
const QuestionnaireContext = createContext<QuestionnaireContextType>({
  questionnaire: null,
  setQuestionnaire: () => {},
});

// Configurable threshold for showing only chips (answer options) in chat UI
// Set REACT_APP_CHIPS_THRESHOLD in your .env file (default: 5)
const CHIPS_THRESHOLD = Number(process.env.REACT_APP_CHIPS_THRESHOLD) || 5;

// --- Home Page ---
function HomePage() {
  const [markdown, setMarkdown] = React.useState('');
  React.useEffect(() => {
    fetch('/readme.md')
      .then(res => res.text())
      .then(setMarkdown);
  }, []);
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <ReactMarkdown
          children={markdown}
          components={{
            h1: ({children, className}) => <Typography component="h1" variant="h4" gutterBottom className={className}>{children}</Typography>,
            h2: ({children, className}) => <Typography component="h2" variant="h5" gutterBottom className={className}>{children}</Typography>,
            h3: ({children, className}) => <Typography component="h3" variant="h6" gutterBottom className={className}>{children}</Typography>,
            p: ({children, className}) => <Typography component="p" variant="body1" paragraph className={className}>{children}</Typography>,
            li: ({children, className}) => <Typography component="li" variant="body2" className={className}>{children}</Typography>,
            code: ({inline, children, className}: {inline?: boolean, children?: React.ReactNode, className?: string}) =>
              inline
                ? <Box component="code" sx={{ bgcolor: '#f5f5f5', px: 0.5, borderRadius: 1, fontSize: 14, fontFamily: 'monospace' }} className={className}>{children}</Box>
                : <Box component="pre" sx={{ bgcolor: '#f5f5f5', p: 1, borderRadius: 1, fontSize: 14, overflowX: 'auto', fontFamily: 'monospace' }} className={className}>{children}</Box>,
            a: ({children, href, className}) => <a style={{ color: '#1976d2' }} href={href} className={className}>{children}</a>,
          }}
        />
      </Paper>
    </Container>
  );
}

// --- Questionnaire Import Page ---
function ImportPage() {
  // const { setQuestionnaire } = useContext(QuestionnaireContext);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [converted, setConverted] = useState(''); // Holds FHIR JSON after Convert
  const [displayed, setDisplayed] = useState<'original' | 'converted'>('original');
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [pdfExtractedText, setPdfExtractedText] = useState<string>('');

  // Helper to check if input is valid FHIR JSON
  const isValidFhirJson = (text: string) => {
    try {
      const obj = JSON.parse(text);
      return obj.resourceType === 'Questionnaire';
    } catch {
      return false;
    }
  };

  // Reset workflow
  const handleReset = () => {
    setInput('');
    setError('');
    setConverted('');
    setDisplayed('original');
    setPdfName(null);
    setPdfExtractedText('');
    setSaveTitle('');
  };

  // PDF file upload handler with text extraction
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('Only PDF files are allowed.');
      setPdfName(null);
      setPdfExtractedText('');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      setError('PDF file size must be 10MB or less.');
      setPdfName(null);
      setPdfExtractedText('');
      return;
    }
    setError('');
    setPdfName(file.name);
    // Extract text using pdfjs-dist
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    setPdfExtractedText(fullText.trim());
    setInput(fullText.trim());
    setDisplayed('original');
  };

  // Handler for uploading FHIR JSON
  const handleJsonUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setError('Only .json files are allowed.');
      return;
    }
    try {
      const text = await file.text();
      const obj = JSON.parse(text);
      if (obj.resourceType !== 'Questionnaire') {
        setError('The uploaded file is not a FHIR Questionnaire JSON.');
        return;
      }
      setConverted(JSON.stringify(obj, null, 2));
      setDisplayed('converted');
      setInput('');
      setError('');
    } catch (e: any) {
      setError('Failed to parse JSON: ' + e.message);
    }
  };

  // Convert Markdown or extracted text to FHIR JSON
  const handleConvert = async () => {
    setError('');
    setLoading(true);
    setConverted('');
    setDisplayed('original');
    try {
      const fhir = await markdownToFhirQuestionnaire(input);
      setConverted(JSON.stringify(fhir, null, 2));
      setDisplayed('converted');
      setError('');
    } catch (e: any) {
      setError('Failed to convert using LLM: ' + e.message);
      setConverted('');
      setDisplayed('original');
    } finally {
      setLoading(false);
    }
  };

  // Save to Catalog logic
  const handleOpenSaveDialog = () => {
    setSaveDialogOpen(true);
    setSaveTitle('');
  };
  const handleSaveToCatalog = () => {
    try {
      let q = null;
      if (displayed === 'converted' && converted && isValidFhirJson(converted)) {
        q = JSON.parse(converted);
      } else if (isValidFhirJson(input)) {
        q = JSON.parse(input);
      } else {
        setError('Input is not valid FHIR Questionnaire JSON.');
        return;
      }
      saveQuestionnaireToCatalog(q, saveTitle || q.title || 'Untitled');
      setSaveDialogOpen(false);
      setSaveSuccess(true);
    } catch (e: any) {
      setError('Failed to save to catalog: ' + e.message);
    }
  };

  // What to show in the text box
  let textBoxValue = '';
  if (displayed === 'converted' && converted) {
    textBoxValue = converted;
  } else if (pdfExtractedText) {
    textBoxValue = input;
  } else {
    textBoxValue = input;
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Import Questionnaire</Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 2 }}>
          <input
            type="file"
            accept="application/pdf"
            style={{ display: 'none' }}
            id="pdf-upload-input"
            onChange={handlePdfUpload}
          />
          <label htmlFor="pdf-upload-input">
            <Button variant="outlined" component="span">Upload PDF</Button>
          </label>
          <Button
            variant="outlined"
            onClick={handleConvert}
            disabled={!input || loading || isValidFhirJson(input)}
          >
            {loading ? 'Converting...' : 'Convert to FHIR'}
          </Button>
          <input
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
            id="json-upload-input"
            onChange={handleJsonUpload}
          />
          <label htmlFor="json-upload-input">
            <Button variant="outlined" component="span">Upload FHIR JSON</Button>
          </label>
          <Button
            variant="contained"
            onClick={handleOpenSaveDialog}
            disabled={!(isValidFhirJson(textBoxValue))}
          >
            Save to Catalog
          </Button>
          <Button variant="text" color="secondary" onClick={handleReset}>Reset</Button>
        </Box>
        {pdfName && (
          <Typography variant="body2" sx={{ mb: 1 }}>
            PDF selected: <b>{pdfName}</b>
          </Typography>
        )}
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <TextField
          label="Questionnaire Input / Output"
          multiline
          minRows={10}
          maxRows={18}
          fullWidth
          value={textBoxValue}
          onChange={e => { setInput(e.target.value); setDisplayed('original'); }}
          sx={{ mb: 2, maxHeight: 400, overflow: 'auto' }}
        />
        {/* Save to Catalog Dialog */}
        <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
          <DialogTitle>Save Questionnaire to Catalog</DialogTitle>
          <DialogContent>
            <MUITextField
              label="Title"
              value={saveTitle}
              onChange={e => setSaveTitle(e.target.value)}
              fullWidth
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveToCatalog} variant="contained">Save</Button>
          </DialogActions>
        </Dialog>
        <Snackbar open={saveSuccess} autoHideDuration={2000} onClose={() => setSaveSuccess(false)}>
          <Alert severity="success" sx={{ width: '100%' }}>Saved to catalog!</Alert>
        </Snackbar>
      </Paper>
    </Container>
  );
}

// --- Chat Interview Page (placeholder) ---
function flattenQuestions(items: any[], parentSection: string | null = null) {
  // Returns a flat array: { section, question, item }
  let result: { section: string | null; item: any }[] = [];
  for (const item of items) {
    if (item.type === 'group' && item.item) {
      // Section/group
      for (const sub of flattenQuestions(item.item, item.text)) {
        result.push({ section: item.text, item: sub.item });
      }
    } else if (item.type === 'choice') {
      result.push({ section: parentSection, item });
    }
  }
  return result;
}

// Helper to make questions conversational
function makeConversational(text: string): string {
  const trimmed = text.trim();
  if (/[.?!]$/.test(trimmed)) return trimmed;
  if (/^(Have you|In the past|Over the past|During the last|Are you|Do you|Did you|Has your|Is your|Was your)/i.test(trimmed))
    return trimmed.endsWith('?') ? trimmed : trimmed + '?';
  // Otherwise, wrap in a template
  const lower = trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
  return 'Have you been ' + lower.replace(/\s+\?*$/, '') + '?';
}

// Helper to extract answer options from FHIR item
function getAnswerOptions(item: any): { code: string | number; display: string }[] | undefined {
  if (!item || !item.answerOption) return undefined;
  return item.answerOption.map((opt: any) => {
    if (opt.valueCoding) {
      return {
        code: opt.valueCoding.code ?? opt.valueCoding.display ?? '',
        display: opt.valueCoding.display ?? opt.valueCoding.code ?? '',
      };
    } else if (typeof opt.valueInteger === 'number') {
      return {
        code: opt.valueInteger,
        display: String(opt.valueInteger),
      };
    } else if (typeof opt.valueString === 'string') {
      return {
        code: opt.valueString,
        display: opt.valueString,
      };
    }
    return { code: '', display: '' };
  });
}

// Utility to extract itemWeight from answerOption
function getAnswerScore(item: any, selectedCode: string | number): number {
  if (!item || !item.answerOption) return 0;
  const opt = item.answerOption.find((opt: any) => {
    if (opt.valueCoding) return String(opt.valueCoding.code) === String(selectedCode);
    if (typeof opt.valueInteger === 'number') return String(opt.valueInteger) === String(selectedCode);
    if (typeof opt.valueString === 'string') return String(opt.valueString) === String(selectedCode);
    return false;
  });
  if (opt && Array.isArray(opt.extension)) {
    const weightExt = opt.extension.find((ext: any) =>
      ext.url === 'http://hl7.org/fhir/StructureDefinition/itemWeight' && typeof ext.valueDecimal === 'number'
    );
    if (weightExt) return weightExt.valueDecimal;
  }
  // Fallback: if selectedCode is a number, use it; else 0
  const num = Number(selectedCode);
  return isNaN(num) ? 0 : num;
}

function ChatPage() {
  const { questionnaire } = useContext(QuestionnaireContext);
  const location = useLocation();
  const interviewMode = location.state?.interviewMode || 'step';
  const [currentIdx, setCurrentIdx] = useState(0);
  const [messages, setMessages] = useState<{ sender: 'bot' | 'user'; text: string }[]>([]);
  const [phase, setPhase] = useState<'awaiting_free_text' | 'awaiting_score' | 'completed'>('awaiting_free_text');
  const [input, setInput] = useState('');
  const [completed, setCompleted] = useState(false);
  const [logSaved, setLogSaved] = useState(false);
  const [savingFhir, setSavingFhir] = useState(false);
  const [fhirError, setFhirError] = useState<string | null>(null);
  const [answerScores, setAnswerScores] = useState<{ [linkId: string]: number }>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const [endEarlyDialogOpen, setEndEarlyDialogOpen] = useState(false);

  // Expanded denial phrases
  const denialPhrases = [
    'no', 'nope', 'not today', 'not really', 'none', 'never', 'not at all', 'nah', 'negative', 'zero', 'none at all'
  ];

  // Flatten questionnaire to a list of questions
  const questions = React.useMemo(
    () => (questionnaire ? flattenQuestions(questionnaire.item) : []),
    [questionnaire]
  );
  const currentQ = questions[currentIdx];

  // Helper to get answer options for currentQ
  const currentAnswerOptions = currentQ ? getAnswerOptions(currentQ.item) : undefined;

  // On mount or questionnaire change, reset state
  React.useEffect(() => {
    setCurrentIdx(0);
    setAnswerScores({});
    setMessages([]);
    setCompleted(false);
    setLogSaved(false);
    setSavingFhir(false);
    setFhirError(null);
    setInput('');
    // Set phase based on first question
    if (questionnaire && questions.length > 0) {
      const firstQ = questions[0];
      const opts = getAnswerOptions(firstQ.item);
      if (firstQ.item.type === 'choice' && opts && opts.length > 0) {
        setPhase('awaiting_score');
      } else {
        setPhase('awaiting_free_text');
      }
    } else {
      setPhase('awaiting_free_text');
    }
  }, [questionnaire, questions]);

  // Show welcome message and first question
  React.useEffect(() => {
    if (!questionnaire) return;
    if (completed) return;
    if (messages.length === 0 && currentQ) {
      const questionText = currentQ.item.conversationalText || makeConversational(currentQ.item.text);
      setMessages([
        { sender: 'bot', text: "Welcome! I'll help you complete your intake. Let's get started." },
        { sender: 'bot', text: questionText }
      ]);
      // Set phase based on question type
      const opts = getAnswerOptions(currentQ.item);
      if (currentQ.item.type === 'choice' && opts && opts.length > 0) {
        setPhase('awaiting_score');
      } else {
        setPhase('awaiting_free_text');
      }
    }
  }, [questionnaire, completed, currentQ, messages.length]);

  // Save log when completed
  React.useEffect(() => {
    if (completed && !logSaved) {
      const day = getToday();
      const time = getTime();
      const markdown = generateMarkdownTranscript(messages);
      setSavingFhir(true);
      setFhirError(null);
      generateFhirQuestionnaireResponse(markdown)
        .then(fhir => {
          saveSessionToLocalStorage(day, time, { markdown, fhir, questionnaireTitle: questionnaire?.title || 'Untitled' });
          setLogSaved(true);
        })
        .catch(err => {
          setFhirError('FHIR export failed: ' + (err?.message || err));
          saveSessionToLocalStorage(day, time, { markdown, fhir: null, questionnaireTitle: questionnaire?.title || 'Untitled' });
          setLogSaved(true);
        })
        .finally(() => setSavingFhir(false));
    }
  }, [completed, logSaved, messages, questionnaire?.title]);

  // Grand total from answerScores
  const grandTotal = Object.values(answerScores).reduce((a, b) => a + b, 0);

  // New: Handler for LLM Full Interview mode
  const handleLlmFullInterview = async (userInput: string) => {
    // Build chat history as transcript
    const chatHistory = messages
      .map(m => `${m.sender === 'bot' ? 'Interviewer' : 'Patient'}: ${m.text}`)
      .concat([`Patient: ${userInput}`])
      .join('\n');
    const reply = await conductFullQuestionnaireInterview(questionnaire, chatHistory);
    setMessages(msgs => [...msgs, { sender: 'user', text: userInput }, { sender: 'bot', text: reply }]);
    setInput('');
    inputRef.current?.focus();
  };

  // Handle patient free-text input submit
  const handleTextSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const userInput = input.trim();
    if (!userInput || !currentQ || phase !== 'awaiting_free_text') return;
    setMessages(msgs => [...msgs, { sender: 'user', text: userInput }]);
    setInput('');
    inputRef.current?.focus();

    const type = currentQ.item.type;
    // Only show structured options if answerOption is present and non-empty
    if (type === 'choice' && currentAnswerOptions && currentAnswerOptions.length > 0) {
      // Expanded denial detection
      const normalized = userInput.toLowerCase().replace(/[^a-z ]/g, '').trim();
      if (denialPhrases.includes(normalized)) {
        setAnswerScores(ans => ({ ...ans, [currentQ.item.linkId]: 0 }));
        goToNextQuestion();
        return;
      }
      // If answer is a valid score (0-4)
      if (/^[0-4]$/.test(userInput)) {
        setAnswerScores(ans => ({ ...ans, [currentQ.item.linkId]: Number(userInput) }));
        goToNextQuestion();
        return;
      }
      // Try to match typed input to code or display (robust: case-insensitive, trimmed, ignore extra whitespace)
      const val = userInput.trim().toLowerCase().replace(/\s+/g, ' ');
      const match = currentAnswerOptions.find(opt => {
        const codeStr = String(opt.code).trim().toLowerCase().replace(/\s+/g, ' ');
        const displayStr = opt.display.trim().toLowerCase().replace(/\s+/g, ' ');
        return codeStr === val || displayStr === val;
      });
      if (match) {
        handleScoreSelect(match.code);
        setInput('');
        return;
      }
      // If not matched, keep phase as 'awaiting_score' and show chips (already handled by phase logic)
      setPhase('awaiting_score');
      setMessages(msgs => [...msgs, { sender: 'bot', text: 'Please choose one of these options:' }]);
      return;
    }

    // For all other questions (including 'choice' without answerOption), use LLM for clarification/confirmation
    const chatHistory = messages
      .map(m => `${m.sender === 'bot' ? 'Interviewer' : 'Patient'}: ${m.text}`)
      .concat([`Patient: ${userInput}`])
      .join('\n');
    const questionText = currentQ.item.text;
    const sectionText = currentQ.section ? `Section: ${currentQ.section}` : '';
    let validationHint = '';
    if (type === 'date') validationHint = 'The answer must be a valid date (YYYY-MM-DD).';
    if (type === 'email') validationHint = 'The answer must be a valid email address.';
    const llmPrompt = `You are a medical intake interviewer.\n\nCurrent question: ${questionText} ${sectionText}\nType: ${type}. ${validationHint}\n\nHere is the chat so far:\n${chatHistory}\n\nInstructions:\n- If the answer is ambiguous, ask for clarification.\n- If the patient says they want to skip, acknowledge and move on.\n- For freeform or validated questions, record the answer and validate if needed.\n- Respond in a friendly, professional, and concise manner.`;
    const llmMessages: LLMMessage[] = [
      { role: 'system', content: llmPrompt },
      ...messages.map(m => ({ role: m.sender === 'bot' ? 'assistant' : 'user', content: m.text } as LLMMessage)),
      { role: 'user', content: userInput }
    ];
    let botReply = '';
    try {
      botReply = await sendMessageToLLM(llmMessages);
    } catch (err: any) {
      botReply = 'Sorry, there was an error processing your answer.';
    }
    setMessages(msgs => [...msgs, { sender: 'bot', text: botReply }]);
    setPhase('awaiting_free_text');
    inputRef.current?.focus();
  };

  // Handle score selection (button or typed)
  const handleScoreSelect = (score: number | string | null) => {
    if (!currentQ) return;
    setAnswerScores(prev => ({ ...prev, [currentQ.item.linkId]: score }));
    // Extract and store score
    let scoreValue = 0;
    if (score !== null) {
      scoreValue = getAnswerScore(currentQ.item, score);
    }
    setAnswerScores(prev => ({ ...prev, [currentQ.item.linkId]: scoreValue }));
    // Show display text for answer option if available
    let displayText = String(score);
    const opts = getAnswerOptions(currentQ.item);
    if (opts && score !== null) {
      const match = opts.find(opt => String(opt.code) === String(score));
      if (match) displayText = match.display;
    }
    setMessages(msgs => [...msgs, { sender: 'user', text: displayText }]);
    setTimeout(() => {
      goToNextQuestion();
    }, 200);
    inputRef.current?.focus();
  };

  // Handle typed score input
  const handleTypedScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentAnswerOptions && currentAnswerOptions.length > 0) {
      // Try to match typed input to code or display (robust: case-insensitive, trimmed, ignore extra whitespace)
      const val = input.trim().toLowerCase().replace(/\s+/g, ' ');
      const match = currentAnswerOptions.find(opt => {
        const codeStr = String(opt.code).trim().toLowerCase().replace(/\s+/g, ' ');
        const displayStr = opt.display.trim().toLowerCase().replace(/\s+/g, ' ');
        return codeStr === val || displayStr === val;
      });
      if (match) {
        handleScoreSelect(match.code);
        setInput('');
        return;
      }
      return; // No match, do nothing
    }
    if (!input.match(/^[0-4]$/)) return;
    handleScoreSelect(Number(input));
    setInput('');
    inputRef.current?.focus();
  };

  // Move to next question or finish
  const goToNextQuestion = () => {
    const nextIdx = currentIdx + 1;
    if (nextIdx < questions.length) {
      setCurrentIdx(nextIdx);
      setInput('');
      const nextQ = questions[nextIdx];
      setMessages(msgs => [
        ...msgs,
        { sender: 'bot', text: makeConversational(nextQ.item.text) }
      ]);
      // Set phase based on next question type
      const opts = getAnswerOptions(nextQ.item);
      if (nextQ.item.type === 'choice' && opts && opts.length > 0) {
        setPhase('awaiting_score');
      } else {
        setPhase('awaiting_free_text');
      }
    } else {
      setCompleted(true);
      setPhase('completed');
    }
    inputRef.current?.focus();
  };

  // Handler for ending chat early
  const handleEndChatEarly = () => {
    setEndEarlyDialogOpen(false);
    setCompleted(true);
    setPhase('completed');
    inputRef.current?.focus();
  };

  // Redirect if no questionnaire
  if (!questionnaire) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper elevation={3} sx={{ p: 3 }}>
          <Typography color="error">No questionnaire loaded. Please choose one from the catalog.</Typography>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5">Chat Interview</Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>Questionnaire loaded: <b>{questionnaire?.title || 'Untitled'}</b></Typography>
        <Box sx={{ minHeight: 300, mb: 2 }}>
          {messages.map((msg, idx) => (
            <Box key={idx} sx={{ textAlign: msg.sender === 'user' ? 'right' : 'left', my: 1 }}>
              <Paper sx={{ display: 'inline-block', px: 2, py: 1, bgcolor: msg.sender === 'user' ? 'primary.light' : 'grey.100', color: msg.sender === 'user' ? 'white' : 'black' }}>
                <Typography variant="body2">{msg.text}</Typography>
              </Paper>
            </Box>
          ))}
        </Box>
        {/* Replace the input handler based on mode */}
        {phase === 'awaiting_free_text' && !completed && (
          <form
            onSubmit={e => {
              e.preventDefault();
              if (!input.trim()) return;
              if (interviewMode === 'llm-full') {
                handleLlmFullInterview(input.trim());
              } else {
                setMessages(msgs => [...msgs, { sender: 'user', text: input.trim() }]);
                handleTextSubmit(e);
              }
            }}
            style={{ display: 'flex', gap: 8, marginBottom: 16 }}
          >
            <TextField
              inputRef={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your answer..."
              fullWidth
              autoFocus
              disabled={completed}
            />
            <IconButton type="submit" color="primary" disabled={!input.trim() || completed} aria-label="send">
              <SendIcon />
            </IconButton>
          </form>
        )}
        {/* Only show score input if answerOptions are present and non-empty */}
        {phase === 'awaiting_score' && currentQ && !completed && currentAnswerOptions && currentAnswerOptions.length > 0 && currentAnswerOptions.length <= CHIPS_THRESHOLD && (
          <>
            {/* Friendly prompt for ambiguous answers */}
            <Paper sx={{ mb: 2, p: 2, fontSize: 18, textAlign: 'center' }}>Please choose one of these options:</Paper>
            <ScoreInput
              disabled={false}
              onSelect={handleScoreSelect}
              answerOptions={currentAnswerOptions}
              renderSkipButton={
                <Button variant="outlined" color="secondary" onClick={() => handleScoreSelect(null)} aria-label="Skip this question">Skip</Button>
              }
            />
          </>
        )}
        {phase === 'awaiting_score' && currentQ && !completed && currentAnswerOptions && currentAnswerOptions.length > CHIPS_THRESHOLD && (
          <>
            {/* Friendly prompt for ambiguous answers */}
            <Paper sx={{ mb: 2, p: 2, fontSize: 18, textAlign: 'center' }}>Please choose one of these options:</Paper>
            <ScoreInput
              disabled={false}
              onSelect={handleScoreSelect}
              answerOptions={currentAnswerOptions}
              renderSkipButton={
                <Button variant="outlined" color="secondary" onClick={() => handleScoreSelect(null)} aria-label="Skip this question">Skip</Button>
              }
            />
            <form onSubmit={handleTypedScore} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <TextField
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={currentAnswerOptions && currentAnswerOptions.length > 0 ? "Type your answer or select an option..." : "Type a score (0-4)..."}
                fullWidth
                autoFocus
                disabled={completed}
              />
              <IconButton
                type="submit"
                color="primary"
                disabled={completed || (currentAnswerOptions && currentAnswerOptions.length > 0 ? !input.trim() : !input.match(/^[0-4]$/))}
                aria-label="send"
              >
                <SendIcon />
              </IconButton>
            </form>
          </>
        )}
        {/* End Chat Early Button (debug) */}
        {!completed && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<BugReportIcon fontSize="small" />}
              onClick={() => setEndEarlyDialogOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              End Chat Early
            </Button>
          </Box>
        )}
        <Dialog open={endEarlyDialogOpen} onClose={() => setEndEarlyDialogOpen(false)}>
          <DialogTitle>End Chat Early?</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to end the chat early? The chat so far will be saved and logged.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEndEarlyDialogOpen(false)} color="primary">Cancel</Button>
            <Button onClick={handleEndChatEarly} color="secondary" variant="contained" autoFocus>End Chat</Button>
          </DialogActions>
        </Dialog>
        {completed && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6">Interview Complete!</Typography>
            <Typography variant="subtitle1">Grand Total: {grandTotal}</Typography>
            <Typography sx={{ mt: 2 }}>Thank you for completing the intake!</Typography>
            {savingFhir && <Typography sx={{ mt: 2 }} color="primary">Saving log and exporting FHIR...</Typography>}
            {fhirError && <Typography sx={{ mt: 2 }} color="error">{fhirError}</Typography>}
            {logSaved && !savingFhir && !fhirError && <Typography sx={{ mt: 2 }} color="success.main">Session log saved!</Typography>}
          </Box>
        )}
      </Paper>
    </Container>
  );
}

// --- Logs Page (placeholder) ---
function LogsPage() {
  const [logs, setLogs] = React.useState<{ [day: string]: { [time: string]: { markdown: string; fhir: any; questionnaireTitle?: string } } }>({});
  const [viewDialog, setViewDialog] = React.useState<{ open: boolean; type: 'markdown' | 'fhir' | null; content: string; title: string }>({ open: false, type: null, content: '', title: '' });

  React.useEffect(() => {
    setLogs(loadLogsFromLocalStorage());
  }, []);

  const handleView = (type: 'markdown' | 'fhir', content: string, title: string) => {
    setViewDialog({ open: true, type, content, title });
  };

  const handleDownload = (type: 'markdown' | 'fhir', content: string, day: string, time: string, questionnaireTitle?: string) => {
    const titlePart = questionnaireTitle ? `_${sanitizeFilename(questionnaireTitle)}` : '';
    const filename = `intake-log_${day}_${time}${titlePart}.${type === 'markdown' ? 'md' : 'json'}`;
    const blob = new Blob([type === 'markdown' ? content : JSON.stringify(content, null, 2)], { type: type === 'markdown' ? 'text/markdown' : 'application/json' });
    saveAs(blob, filename);
  };

  const handleDelete = (day: string, time: string) => {
    // Remove from localStorage
    const logsCopy = { ...logs };
    if (logsCopy[day]) {
      delete logsCopy[day][time];
      if (Object.keys(logsCopy[day]).length === 0) {
        delete logsCopy[day];
      }
    }
    localStorage.setItem('chatLogs', JSON.stringify(logsCopy));
    setLogs(logsCopy);
  };

  const handleCloseDialog = () => setViewDialog({ open: false, type: null, content: '', title: '' });

  const hasLogs = Object.keys(logs).length > 0;

  // Helper to sanitize questionnaire title for filenames
  function sanitizeFilename(str: string): string {
    return str.replace(/[^a-zA-Z0-9-_]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  // Utility to extract itemWeight from answerOption (reuse from ChatPage)
  function getAnswerScoreFromFhirItem(item: any): number {
    if (!item) return 0;
    // Look for extension with itemWeight
    if (Array.isArray(item.extension)) {
      const weightExt = item.extension.find((ext: any) =>
        ext.url === 'http://hl7.org/fhir/StructureDefinition/itemWeight' && typeof ext.valueDecimal === 'number'
      );
      if (weightExt) return weightExt.valueDecimal;
    }
    // Fallback: if answer is numeric
    if (typeof item.valueInteger === 'number') return item.valueInteger;
    if (typeof item.valueDecimal === 'number') return item.valueDecimal;
    if (typeof item.valueString === 'string' && !isNaN(Number(item.valueString))) return Number(item.valueString);
    return 0;
  }

  // Helper to recursively sum scores in QuestionnaireResponse items, grouped by section if possible
  function computeScoresFromFhirResponse(qr: any): { grandTotal: number, sectionTotals: { [section: string]: number } } {
    let grandTotal = 0;
    const sectionTotals: { [section: string]: number } = {};
    function walk(items: any[], section: string | null) {
      for (const item of items || []) {
        if (item.item) {
          // This is a group/section
          walk(item.item, item.text || section);
        } else {
          const score = getAnswerScoreFromFhirItem(item);
          grandTotal += score;
          const sec = section || 'No Section';
          if (!sectionTotals[sec]) sectionTotals[sec] = 0;
          sectionTotals[sec] += score;
        }
      }
    }
    if (qr && Array.isArray(qr.item)) {
      walk(qr.item, null);
    }
    return { grandTotal, sectionTotals };
  }

  // Download all logs as a zip
  const handleDownloadAllLogs = async () => {
    const zip = new JSZip();
    Object.entries(logs).forEach(([day, sessions]) => {
      Object.entries(sessions).forEach(([time, session]) => {
        const titlePart = session.questionnaireTitle ? `_${sanitizeFilename(session.questionnaireTitle)}` : '';
        const prefix = `${day}_${time}${titlePart}`;
        // Add Markdown
        zip.file(`${prefix}_markdown.md`, session.markdown || '');
        // Add FHIR JSON
        if (session.fhir) {
          zip.file(`${prefix}_fhir.json`, JSON.stringify(session.fhir, null, 2));
        }
      });
    });
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'intake-logs.zip');
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5">Logs</Typography>
        {/* Download All Logs Button */}
        {hasLogs && (
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="outlined" size="small" onClick={handleDownloadAllLogs}>
              Download All Logs (zip)
            </Button>
          </Box>
        )}
        {!hasLogs && <Typography variant="body1" sx={{ mt: 2 }}>No chat logs found.</Typography>}
        {hasLogs && (
          <Box sx={{ mt: 2 }}>
            {Object.entries(logs).sort((a, b) => b[0].localeCompare(a[0])).map(([day, sessions]) => (
              <Box key={day} sx={{ mb: 3 }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>{day}</Typography>
                <MUIList>
                  {Object.entries(sessions).sort((a, b) => b[0].localeCompare(a[0])).map(([time, session]) => {
                    let scoreInfo = null;
                    if (session.fhir && session.fhir.resourceType === 'QuestionnaireResponse') {
                      const { grandTotal } = computeScoresFromFhirResponse(session.fhir);
                      scoreInfo = (
                        <React.Fragment>
                          <Typography variant="body2" component="span" sx={{ mt: 1, mb: 1, display: 'inline-block' }}><b>Grand Total:</b> {grandTotal}</Typography>
                        </React.Fragment>
                      );
                    }
                    return (
                      <ListItem key={time} divider alignItems="flex-start">
                        <ListItemText
                          primary={
                            <span>
                              <b>Session:</b> {time} <span style={{ color: '#888' }}>({day} {time.replace(/-/g, ':')})</span>
                              {session.questionnaireTitle && (
                                <span style={{ marginLeft: 8, color: '#1976d2' }}><b>{session.questionnaireTitle}</b></span>
                              )}
                            </span>
                          }
                          secondary={
                            <>
                              {scoreInfo}
                              <Button size="small" onClick={() => handleView('markdown', session.markdown, session.questionnaireTitle || 'Session Markdown')}>View Markdown</Button>
                              {session.fhir && <Button size="small" onClick={() => handleView('fhir', session.fhir, session.questionnaireTitle || 'FHIR Response')}>View FHIR</Button>}
                              <Button size="small" color="error" onClick={() => handleDelete(day, time)}>Delete</Button>
                              <Button size="small" onClick={() => handleDownload('markdown', session.markdown, day, time, session.questionnaireTitle)}>Download Markdown</Button>
                              <Button size="small" onClick={() => handleDownload('markdown', session.markdown, day, time)}>Download Markdown</Button>
                              {session.fhir && <Button size="small" onClick={() => handleDownload('fhir', session.fhir, day, time)}>Download FHIR</Button>}
                            </>
                          }
                        />
                      </ListItem>
                    );
                  })}
                </MUIList>
              </Box>
            ))}
          </Box>
        )}
        <Dialog open={viewDialog.open} onClose={handleCloseDialog} maxWidth="md" fullWidth>
          <DialogTitle>{viewDialog.title}</DialogTitle>
          <DialogContent>
            {viewDialog.type === 'markdown' ? (
              <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14 }}>{viewDialog.content}</Box>
            ) : (
              <>
                {viewDialog.type === 'fhir' && typeof viewDialog.content === 'object' && (viewDialog.content as any).resourceType === 'QuestionnaireResponse' && (() => {
                  const { grandTotal } = computeScoresFromFhirResponse(viewDialog.content as any);
                  return (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" component="span" sx={{ mt: 1, mb: 1, display: 'inline-block' }}><b>Grand Total:</b> {grandTotal}</Typography>
                    </Box>
                  );
                })()}
                <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, bgcolor: '#f9f9f9', p: 2 }}>{typeof viewDialog.content === 'string' ? viewDialog.content : JSON.stringify(viewDialog.content, null, 2)}</Box>
              </>
            )}
          </DialogContent>
        </Dialog>
      </Paper>
    </Container>
  );
}

// --- Catalog Page ---
function CatalogPage() {
  const { setQuestionnaire } = useContext(QuestionnaireContext);
  const [catalog, setCatalog] = useState<CatalogQuestionnaire[]>(loadCatalog());
  const [viewDialog, setViewDialog] = useState<{ open: boolean; content: string; title: string; fhir?: any }>({ open: false, content: '', title: '', fhir: undefined });
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [interviewModes, setInterviewModes] = useState<{ [id: string]: 'step' | 'llm-full' }>({});
  const navigate = useNavigate();

  const refresh = () => setCatalog(loadCatalog());

  const handleStartChart = (q: CatalogQuestionnaire) => {
    setQuestionnaire(q.fhir);
    navigate('/chat', { state: { interviewMode: interviewModes[q.id] || 'step' } });
  };
  const handleView = (q: CatalogQuestionnaire) => {
    setViewDialog({ open: true, content: JSON.stringify(q.fhir, null, 2), title: q.title, fhir: q.fhir });
    setShowSummary(false);
  };
  const handleDelete = (id: string) => {
    if (window.confirm('Delete this questionnaire from the catalog?')) {
      deleteFromCatalog(id);
      refresh();
    }
  };
  const handleRename = (id: string, title: string) => {
    setRenameId(id);
    setRenameValue(title);
  };
  const handleRenameSave = () => {
    if (renameId) {
      updateQuestionnaireTitle(renameId, renameValue);
      setRenameId(null);
      setRenameValue('');
      refresh();
    }
  };

  // Helper to summarize FHIR Questionnaire
  function summarizeQuestionnaire(q: any): string {
    if (!q || !q.item) return 'No questions found.';
    const lines: string[] = [];
    function walk(items: any[], prefix = '') {
      for (const item of items) {
        if (item.type === 'group' && item.item) {
          lines.push(`${prefix}Section: ${item.text}`);
          walk(item.item, prefix + '  ');
        } else {
          lines.push(`${prefix}Q: ${item.text}`);
          if (item.answerOption) {
            const opts = item.answerOption.map((opt: any) => {
              if (opt.valueCoding) return opt.valueCoding.display || opt.valueCoding.code;
              if (typeof opt.valueString === 'string') return opt.valueString;
              if (typeof opt.valueInteger === 'number') return String(opt.valueInteger);
              return '';
            }).filter(Boolean);
            if (opts.length > 0) lines.push(`${prefix}  Options: ${opts.join(', ')}`);
          }
        }
      }
    }
    walk(q.item);
    return lines.join('\n');
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h5">Questionnaire Catalog</Typography>
        {catalog.length === 0 && <Typography sx={{ mt: 2 }}>No questionnaires saved.</Typography>}
        {catalog.length > 0 && (
          <MUIList>
            {catalog.map(q => (
              <ListItem key={q.id} divider>
                {renameId === q.id ? (
                  <MUITextField
                    value={renameValue}
                    onChange={e => setRenameValue(e.target.value)}
                    onBlur={handleRenameSave}
                    onKeyDown={e => { if (e.key === 'Enter') handleRenameSave(); }}
                    size="small"
                    autoFocus
                    sx={{ mr: 2, width: 200 }}
                  />
                ) : (
                  <ListItemText
                    primary={q.title}
                    secondary={new Date(q.importedAt).toLocaleString()}
                    onClick={() => handleStartChart(q)}
                    sx={{ cursor: 'pointer' }}
                  />
                )}
                <FormControlLabel
                  control={
                    <Switch
                      checked={interviewModes[q.id] === 'llm-full'}
                      onChange={e => setInterviewModes(m => ({ ...m, [q.id]: e.target.checked ? 'llm-full' : 'step' }))}
                      color="primary"
                    />
                  }
                  label={interviewModes[q.id] === 'llm-full' ? 'LLM Full Interview' : 'Step-by-Step'}
                  sx={{ mr: 2 }}
                />
                <Button size="small" onClick={() => handleStartChart(q)}>Start Chat</Button>
                <Button size="small" onClick={() => handleView(q)}>View</Button>
                <Button size="small" onClick={() => handleRename(q.id, q.title)}>Rename</Button>
                <Button size="small" color="error" onClick={() => handleDelete(q.id)}>Delete</Button>
              </ListItem>
            ))}
          </MUIList>
        )}
        <Dialog open={viewDialog.open} onClose={() => setViewDialog({ open: false, content: '', title: '', fhir: undefined })} maxWidth="md" fullWidth>
          <DialogTitle>{viewDialog.title}</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Button variant="outlined" size="small" onClick={() => setShowSummary(s => !s)}>
                {showSummary ? 'Show JSON' : 'Show Summary'}
              </Button>
            </Box>
            {showSummary && viewDialog.fhir ? (
              <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14 }}>{summarizeQuestionnaire(viewDialog.fhir)}</Box>
            ) : (
              <Box component="pre" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 13, bgcolor: '#f9f9f9', p: 2 }}>{viewDialog.content}</Box>
            )}
          </DialogContent>
        </Dialog>
      </Paper>
    </Container>
  );
}

// --- Main App with Navigation ---
function App() {
  const [questionnaire, setQuestionnaire] = useState<any>(null);
  // Use location to sync tab with route
  const location = useLocation();
  const tabValue =
    location.pathname === '/' || location.pathname === '/home' ? 0 :
    location.pathname === '/import' ? 1 :
    location.pathname === '/catalog' ? 2 :
    location.pathname === '/chat' ? 3 :
    location.pathname === '/logs' ? 4 : 0;

  return (
    <QuestionnaireContext.Provider value={{ questionnaire, setQuestionnaire }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Medical Intake Interview</Typography>
          <Tabs value={tabValue} textColor="inherit" indicatorColor="secondary">
            <Tab label="Home" component={Link} to="/" />
            <Tab label="Import" component={Link} to="/import" />
            <Tab label="Catalog" component={Link} to="/catalog" />
            <Tab label="Chat" component={Link} to="/chat" />
            <Tab label="Logs" component={Link} to="/logs" />
          </Tabs>
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </QuestionnaireContext.Provider>
  );
}

export default App;
