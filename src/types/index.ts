export interface Question {
  id: string;
  text: string;
  createdAt: number;
}

export interface JournalEntry {
  id: string;
  questionId: string;
  questionText: string;
  answer: string;
  createdAt: number;
  sessionDate: string; // YYYY-MM-DD format
}

export interface CardPosition {
  x: number;
  y: number;
}

export interface CardStyle {
  color: string;
}

export interface CanvasCard {
  id: string;
  entryId: string;
  position: CardPosition;
  style: CardStyle;
}

export interface Connection {
  id: string;
  fromCardId: string;
  toCardId: string;
}

export interface Annotation {
  id: string;
  text: string;
  position: CardPosition;
}

export interface CanvasState {
  cards: CanvasCard[];
  connections: Connection[];
  annotations: Annotation[];
  viewOffset: CardPosition;
  zoom: number;
}

export interface DailySession {
  date: string; // YYYY-MM-DD
  selectedQuestionIds: string[];
  currentIndex: number;
  completed: boolean;
  answeredCount: number;
  skippedCount: number;
}
