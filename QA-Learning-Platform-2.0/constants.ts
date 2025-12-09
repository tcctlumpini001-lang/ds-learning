
// Simulation constants
export const STREAM_DELAY_MS = 30; // Time between characters for streaming effect
export const INITIAL_RESPONSE_DELAY_MS = 600; // Fake network latency

// Mock responses for the demo
export const MOCK_RESPONSES = [
  "I can help you with that! This is a simulated streaming response to demonstrate the UI capabilities.",
  "That's an interesting perspective. Could you elaborate more on what you're trying to achieve?",
  "Here is a list of things I can do:\n\n1. Simulate streaming text.\n2. maintain chat history in memory.\n3. Look good while doing it.",
  "I'm just a mock frontend interface right now, but I'm ready to be connected to a real LLM backend like Gemini!",
  "Based on my calculations (which are fake), the answer is 42."
];

export const MOCK_USER = {
  id: 'user-1',
  name: 'Prudtipon', // Updated to match the reference image context roughly
  email: 'user@example.com',
  image: 'https://picsum.photos/seed/user/32/32'
};

export const DEV_BYPASS_KEY = 'DEV_BYPASS_AUTH';

export const EXAMPLE_PROMPTS = [
  { heading: 'Explain technical concepts', subheading: 'to a 5 year old', message: 'Explain quantum physics to a 5 year old.' },
  { heading: 'Draft an email', subheading: 'requesting a deadline extension', message: 'Draft a polite email to my boss requesting a deadline extension for the Q3 project.' },
  { heading: 'Suggest fun activities', subheading: 'for a rainy day', message: 'Suggest 5 fun indoor activities for a rainy day with friends.' },
  { heading: 'Write a python script', subheading: 'to parse CSV data', message: 'Write a Python script to parse a CSV file and calculate the average of the "score" column.' }
];
