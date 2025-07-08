import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT ?? 3000,
  azureSpeechKey: process.env.AZURE_SPEECH_KEY ?? '',
  azureSpeechRegion: process.env.AZURE_SPEECH_REGION ?? 'southeastasia',
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? './__secrets__/articuly-ai-dev-firebase-adminsdk-fbsvc-54b920f973.json',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? 'articuly-ai-dev',
};

if (!config.azureSpeechKey) {
  console.warn('AZURE_SPEECH_KEY is not set!');
}
if (!config.firebaseServiceAccountPath) {
  console.warn('FIREBASE_SERVICE_ACCOUNT_PATH is not set!');
}
