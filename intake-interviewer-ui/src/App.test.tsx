import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { fireEvent, waitFor, act } from '@testing-library/react';

// Mock Element.prototype.scrollIntoView
const mockScrollIntoView = jest.fn();
const originalScrollIntoView = Element.prototype.scrollIntoView;
Element.prototype.scrollIntoView = mockScrollIntoView;

// Mock the useRef hook to return a ref object with current initially null
const mockMessagesEndRef = { current: null };
jest.spyOn(React, 'useRef').mockReturnValue(mockMessagesEndRef);

// Mock useEffect to prevent the scrolling effect from running
// const originalUseEffect = React.useEffect;
// jest.spyOn(React, 'useEffect').mockImplementation((effect, dependencies) => {
//   // Check if this is the scrolling effect by inspecting its dependency array
//   // This is a heuristic and might need adjustment if the dependency array changes
//   if (Array.isArray(dependencies) && dependencies.length === 1 && dependencies[0] === messages) {
//     // Prevent the scrolling effect from running
//     return;
//   } else {
//     // Allow other effects to run normally
//     return originalUseEffect(effect, dependencies);
//   }
// });

// Mock the sendMessageToLLM and generateFhirQuestionnaireResponse functions from llmService
jest.mock('./llmService', () => ({
  sendMessageToLLM: jest.fn(() => Promise.resolve('Mock bot reply')),
  generateFhirQuestionnaireResponse: jest.fn(() => Promise.resolve({})) // Mock with an empty object or a minimal FHIR structure
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
  removeItem: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock file-saver's saveAs function
jest.mock('file-saver', () => ({
  saveAs: jest.fn(),
}));

describe('App', () => {
  beforeEach(() => {
    // Clear mocks before each test
    mockScrollIntoView.mockClear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.clear.mockClear();
    localStorageMock.removeItem.mockClear();
    const llmService = require('./llmService');
    llmService.sendMessageToLLM.mockClear();
    llmService.generateFhirQuestionnaireResponse.mockClear();
    const fileSaver = require('file-saver');
    fileSaver.saveAs.mockClear();

    // Reset localStorage mock data for each test if needed
    localStorageMock.getItem.mockReturnValue(null); // Default to empty localStorage
  });

  afterAll(() => {
    // Restore original scrollIntoView and useEffect
    Element.prototype.scrollIntoView = originalScrollIntoView;
    // (React.useEffect as jest.Mock).mockRestore(); // Restore useEffect mock
  });

  test('renders the initial welcome message and input', async () => {
    await act(async () => {
      render(<App />);
    });
    expect(screen.getByText('Welcome! I will help you complete your medical intake. How are you feeling today?')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'send' })).toBeInTheDocument();
    expect(screen.getByTitle('End Chat and Save Log')).toBeInTheDocument();
    expect(screen.getByText('Browse Chat Logs')).toBeInTheDocument();
  });

  test('calls scrollIntoView on initial render and when messages update', async () => {
    await act(async () => {
      render(<App />);
    });

    // scrollIntoView should be called on initial render
    expect(mockScrollIntoView).toHaveBeenCalledTimes(1);

    // Simulate sending a message to trigger a messages update and another scrollIntoView call
    const inputElement = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: 'send' });

    // Use fireEvent for user interactions
    fireEvent.change(inputElement, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    // Wait for the async message handling and state update
    await waitFor(() => expect(mockScrollIntoView).toHaveBeenCalledTimes(2));
  });
});
