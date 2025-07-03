import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    port: process.env.PORT || 3000,
    azureSpeechKey: process.env.AZURE_SPEECH_KEY || '',
    azureSpeechRegion: process.env.AZURE_SPEECH_REGION || 'eastus',
    firebaseServiceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '',
};

if (!config.azureSpeechKey) {
    console.warn('AZURE_SPEECH_KEY is not set!');
}
if (!config.firebaseServiceAccountPath) {
    console.warn('FIREBASE_SERVICE_ACCOUNT_PATH is not set!');
}