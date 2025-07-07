import { config } from '../src/config/index.ts';

// Global test setup
beforeAll(() => {
  // Set up any global test environment
  console.log('Setting up test environment...');
});

afterAll(() => {
  // Clean up after all tests
  console.log('Cleaning up test environment...');
});

// Set test environment variables using the config module
process.env.NODE_ENV = 'test';
process.env.PORT = config.port.toString();
process.env.AZURE_SPEECH_KEY = config.azureSpeechKey;
process.env.AZURE_SPEECH_REGION = config.azureSpeechRegion;
process.env.FIREBASE_SERVICE_ACCOUNT_PATH = config.firebaseServiceAccountPath;
process.env.FIREBASE_PROJECT_ID = config.firebaseProjectId;

// Spectacular soccer selections spark spectacularly spicy, spirited, spontaneous sensations.
// Terrific trolley treats trigger tremendously 
// thankful, thoughtful, thorough testimonials.