import { jest } from '@jest/globals';

// Enhanced Firestore mock with nested in-memory store: Map<collectionName, Map<docId, docData>>
export const firestoreData = new Map<string, Map<string, any>>();

export function setFirestoreDoc(collection: string, docId: string, data: any) {
  if (!firestoreData.has(collection)) {
    firestoreData.set(collection, new Map());
  }
  firestoreData.get(collection)!.set(docId, data);
}

function createMockDoc(collection: string, docId: string) {
  return {
    get: jest.fn(async () => {
      const col = firestoreData.get(collection);
      const data = col ? col.get(docId) : undefined;
      return {
        exists: !!data,
        data: () => data,
      };
    }),
    set: jest.fn(async (val: any) => {
      setFirestoreDoc(collection, docId, val);
      return true;
    }),
    update: jest.fn(async (val: any) => {
      const col = firestoreData.get(collection) || new Map();
      const existing = col.get(docId) || {};
      if (val && typeof val === 'object') {
        setFirestoreDoc(collection, docId, { ...existing, ...val });
      } else {
        setFirestoreDoc(collection, docId, existing);
      }
      return true;
    }),
    exists: !!(firestoreData.get(collection) && firestoreData.get(collection)!.get(docId)),
    data: jest.fn(() => {
      const col = firestoreData.get(collection);
      return col ? col.get(docId) : undefined;
    }),
  };
}

function createMockCollection(collection: string) {
  return {
    doc: jest.fn((docId: string) => createMockDoc(collection, docId)),
  };
}

const firestoreMock = {
  collection: jest.fn((name: string) => createMockCollection(name)),
  runTransaction: jest.fn(async (fn: (db: any) => Promise<any>) => fn(firestoreMock)),
};

jest.unstable_mockModule('firebase-admin', () => ({
  initializeApp: jest.fn(),
  credential: {
    cert: jest.fn(),
    applicationDefault: jest.fn(),
  },
  firestore: jest.fn(() => firestoreMock),
  getFirestore: jest.fn(() => firestoreMock),
  apps: [],
  app: jest.fn(),
  __esModule: true,
  default: {},
}));

jest.unstable_mockModule('firebase-admin/firestore', () => ({
  getFirestore: jest.fn(() => firestoreMock),
  __esModule: true,
  default: {},
})); 