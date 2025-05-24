import { getToday, getTime, generateMarkdownTranscript, saveSessionToLocalStorage, loadLogsFromLocalStorage } from './App';

describe('App Utility Functions', () => {
  // Mock the Date object for consistent test results
  const RealDate = Date;
  const mockDate = new Date('2023-10-26T10:00:00.000Z');

  beforeAll(() => {
    global.Date = class extends RealDate {
      constructor(dateString?: string) {
        super(dateString || mockDate.toISOString());
      }

      toISOString() {
        return mockDate.toISOString();
      }

      toTimeString() {
           // Mock toTimeString to return a consistent string for getTime test
          return '10:00:00 GMT+0000 (Coordinated Universal Time)';
      }
      // Add other Date methods used in App.tsx if needed
    } as typeof Date;
  });

  afterAll(() => {
    global.Date = RealDate; // Restore the original Date object
  });

  describe('getToday', () => {
    test('should return the current date in YYYY-MM-DD format', () => {
      const today = getToday();
      expect(today).toBe('2023-10-26');
    });
  });

  describe('getTime', () => {
    test('should return the current time in HH-MM-SS format', () => {
      const time = getTime();
      expect(time).toBe('10-00-00');
    });
  });

  describe('generateMarkdownTranscript', () => {
    test('should generate correct markdown from messages', () => {
      const messages: { sender: 'user' | 'bot'; text: string }[] = [
        { sender: 'bot', text: 'Welcome!' },
        { sender: 'user', text: 'Hi there.' },
        { sender: 'bot', text: 'How are you?' },
      ];
      const expectedMarkdown = `# Medical Intake Chat Log\n\n**Interviewer:** Welcome!\n\n**Patient:** Hi there.\n\n**Interviewer:** How are you?`;
      const markdown = generateMarkdownTranscript(messages);
      expect(markdown).toBe(expectedMarkdown);
    });

    test('should handle empty messages array', () => {
        const messages: { sender: 'user' | 'bot'; text: string }[] = [];
        const expectedMarkdown = `# Medical Intake Chat Log\n\n`;
        const markdown = generateMarkdownTranscript(messages);
        expect(markdown).toBe(expectedMarkdown);
    });
  });

  describe('saveSessionToLocalStorage and loadLogsFromLocalStorage', () => {
    const mockSessionData = {
      markdown: '## Test Markdown',
      fhir: { resourceType: 'QuestionnaireResponse', status: 'completed' },
    };

    const mockDay = '2023-10-27';
    const mockTime = '11-30-00';

    beforeEach(() => {
      // Clear localStorage before each test in this suite
      localStorage.clear();
    });

    test('saveSessionToLocalStorage should save data to localStorage', () => {
      saveSessionToLocalStorage(mockDay, mockTime, mockSessionData);
      const storedLogs = JSON.parse(localStorage.getItem('chatLogs') || '{}');
      expect(storedLogs[mockDay]?.[mockTime]).toEqual(mockSessionData);
    });

    test('loadLogsFromLocalStorage should load data from localStorage', () => {
      // Manually set up data in localStorage
      const initialLogs = {
        [mockDay]: {
          [mockTime]: mockSessionData,
        },
      };
      localStorage.setItem('chatLogs', JSON.stringify(initialLogs));

      const loadedLogs: { [day: string]: { [time: string]: { markdown: string; fhir: any } } } = loadLogsFromLocalStorage();

      expect(loadedLogs[mockDay]?.[mockTime]).toEqual(mockSessionData);
    });

    test('loadLogsFromLocalStorage should migrate old string-only entries', () => {
        const oldLogs = {
            [mockDay]: {
                [mockTime]: 'Old Markdown Content'
            }
        };
        localStorage.setItem('chatLogs', JSON.stringify(oldLogs));

        const loadedLogs: { [day: string]: { [time: string]: { markdown: string; fhir: any } } } = loadLogsFromLocalStorage();

        expect(loadedLogs[mockDay]?.[mockTime]).toEqual({ markdown: 'Old Markdown Content', fhir: null });
    });

    test('loadLogsFromLocalStorage should handle empty localStorage', () => {
        const loadedLogs: { [day: string]: { [time: string]: { markdown: string; fhir: any } } } = loadLogsFromLocalStorage();
        expect(loadedLogs).toEqual({});
    });

    test('loadLogsFromLocalStorage should handle invalid localStorage data', () => {
        localStorage.setItem('chatLogs', 'invalid json');
        // Expecting it to return an empty object or handle gracefully
        const loadedLogs: { [day: string]: { [time: string]: { markdown: string; fhir: any } } } = loadLogsFromLocalStorage();
        expect(loadedLogs).toEqual({});
    });
  });
}); 