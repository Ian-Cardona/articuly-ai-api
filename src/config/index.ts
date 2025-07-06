import path from 'path';
import { fileURLToPath } from 'url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: process.env.PORT ?? 3000,
  azureSpeechKey: process.env.AZURE_SPEECH_KEY ?? '',
  azureSpeechRegion: process.env.AZURE_SPEECH_REGION ?? 'eastus',
  firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? './secrets/speakfast-dev-firebase-adminsdk-fbsvc-3d649a3f4c.json',
  firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? 'speakfast-dev',
};

if (!config.azureSpeechKey) {
  console.warn('AZURE_SPEECH_KEY is not set!');
}
if (!config.firebaseServiceAccountPath) {
  console.warn('FIREBASE_SERVICE_ACCOUNT_PATH is not set!');
}
