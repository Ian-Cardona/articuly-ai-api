import { vi } from 'vitest';

export const firestoreData = new Map<string, Map<string, any>>();

export function setFirestoreDoc(collection: string, docId: string, data: any): void {
  if (!firestoreData.has(collection)) {
    firestoreData.set(collection, new Map());
  }
  firestoreData.get(collection)!.set(docId, data);
}

export function createMockDoc(collection: string, docId: string): any {
  return {
    get: vi.fn(async () => {
      const col = firestoreData.get(collection);
      const data = col ? col.get(docId) : undefined;
      return {
        exists: !!data,
        data: () => data,
      };
    }),
    set: vi.fn(async (val: any) => {
      setFirestoreDoc(collection, docId, val);
      return true;
    }),
    update: vi.fn(async (val: any) => {
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
    data: vi.fn(() => {
      const col = firestoreData.get(collection);
      return col ? col.get(docId) : undefined;
    }),
  };
}

export function createMockCollection(collection: string): any {
  return {
    doc: vi.fn((docId: string) => createMockDoc(collection, docId)),
  };
}

export const firestoreMock = {
  collection: vi.fn((name: string) => createMockCollection(name)),
  runTransaction: vi.fn(async (fn: (db: any) => Promise<any>) => fn(firestoreMock)),
};

vi.mock('firebase-admin', () => ({
  initializeApp: vi.fn(),
  credential: {
    cert: vi.fn(),
    applicationDefault: vi.fn(),
  },
  firestore: vi.fn(() => firestoreMock),
  getFirestore: vi.fn(() => firestoreMock),
  apps: [],
  app: vi.fn(),
  __esModule: true,
  default: {},
}));

vi.mock('firebase-admin/firestore', () => ({
  getFirestore: vi.fn(() => firestoreMock),
  __esModule: true,
  default: {},
})); 