import type {
  Question,
  JournalEntry,
  CanvasState,
  DailySession,
  CanvasCard,
  Connection,
  Annotation,
} from '../types';

const STORAGE_KEYS = {
  QUESTIONS: 'journal_questions',
  ENTRIES: 'journal_entries',
  CANVAS: 'journal_canvas',
  SESSION: 'journal_current_session',
} as const;

// Questions
export function getQuestions(): Question[] {
  const data = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
  return data ? JSON.parse(data) : [];
}

export function saveQuestions(questions: Question[]): void {
  localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
}

export function addQuestions(newQuestions: Question[]): Question[] {
  const existing = getQuestions();
  const updated = [...existing, ...newQuestions];
  saveQuestions(updated);
  return updated;
}

export function deleteQuestion(id: string): Question[] {
  const questions = getQuestions().filter((q) => q.id !== id);
  saveQuestions(questions);
  return questions;
}

export function clearAllQuestions(): void {
  saveQuestions([]);
}

// Journal Entries
export function getEntries(): JournalEntry[] {
  const data = localStorage.getItem(STORAGE_KEYS.ENTRIES);
  return data ? JSON.parse(data) : [];
}

export function saveEntries(entries: JournalEntry[]): void {
  localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
}

export function addEntry(entry: JournalEntry): JournalEntry[] {
  const existing = getEntries();
  const updated = [...existing, entry];
  saveEntries(updated);
  return updated;
}

export function getEntriesByDate(date: string): JournalEntry[] {
  return getEntries().filter((e) => e.sessionDate === date);
}

// Canvas State
export function getCanvasState(): CanvasState {
  const data = localStorage.getItem(STORAGE_KEYS.CANVAS);
  if (data) {
    return JSON.parse(data);
  }
  return {
    cards: [],
    connections: [],
    annotations: [],
    viewOffset: { x: 0, y: 0 },
    zoom: 1,
  };
}

export function saveCanvasState(state: CanvasState): void {
  localStorage.setItem(STORAGE_KEYS.CANVAS, JSON.stringify(state));
}

export function updateCard(cardId: string, updates: Partial<CanvasCard>): CanvasState {
  const state = getCanvasState();
  state.cards = state.cards.map((card) =>
    card.id === cardId ? { ...card, ...updates } : card
  );
  saveCanvasState(state);
  return state;
}

export function addCard(card: CanvasCard): CanvasState {
  const state = getCanvasState();
  state.cards.push(card);
  saveCanvasState(state);
  return state;
}

export function addConnection(connection: Connection): CanvasState {
  const state = getCanvasState();
  // Prevent duplicate connections
  const exists = state.connections.some(
    (c) =>
      (c.fromCardId === connection.fromCardId && c.toCardId === connection.toCardId) ||
      (c.fromCardId === connection.toCardId && c.toCardId === connection.fromCardId)
  );
  if (!exists) {
    state.connections.push(connection);
    saveCanvasState(state);
  }
  return state;
}

export function removeConnection(connectionId: string): CanvasState {
  const state = getCanvasState();
  state.connections = state.connections.filter((c) => c.id !== connectionId);
  saveCanvasState(state);
  return state;
}

export function addAnnotation(annotation: Annotation): CanvasState {
  const state = getCanvasState();
  state.annotations.push(annotation);
  saveCanvasState(state);
  return state;
}

export function updateAnnotation(id: string, updates: Partial<Annotation>): CanvasState {
  const state = getCanvasState();
  state.annotations = state.annotations.map((a) =>
    a.id === id ? { ...a, ...updates } : a
  );
  saveCanvasState(state);
  return state;
}

export function removeAnnotation(id: string): CanvasState {
  const state = getCanvasState();
  state.annotations = state.annotations.filter((a) => a.id !== id);
  saveCanvasState(state);
  return state;
}

// Daily Session
export function getCurrentSession(): DailySession | null {
  const data = localStorage.getItem(STORAGE_KEYS.SESSION);
  return data ? JSON.parse(data) : null;
}

export function saveSession(session: DailySession): void {
  localStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
}

export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export function hasJournaledToday(): boolean {
  const session = getCurrentSession();
  if (!session) return false;
  return session.date === getTodayDateString() && session.completed;
}

export function canStartNewSession(): boolean {
  const session = getCurrentSession();
  if (!session) return true;
  // Can start if it's a new day or if the session is completed
  return session.date !== getTodayDateString() || session.completed;
}

// Utility to select random questions
export function selectRandomQuestions(count: number): string[] {
  const questions = getQuestions();
  if (questions.length === 0) return [];
  
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, questions.length)).map((q) => q.id);
}
