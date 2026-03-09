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

export interface CanvasCard {
  id: string;
  entryId: string;
  positionX: number;
  positionY: number;
  color: string;
}

export interface CanvasConnection {
  id: string;
  fromCardId: string;
  toCardId: string;
}

export interface CanvasAnnotation {
  id: string;
  text: string;
  positionX: number;
  positionY: number;
}

export interface CanvasViewState {
  viewOffsetX: number;
  viewOffsetY: number;
  zoom: number;
}

export interface DailySession {
  date: string; // YYYY-MM-DD
  selectedQuestionIds: string; // JSON string of string[]
  currentIndex: number;
  completed: boolean;
  answeredCount: number;
  skippedCount: number;
}

export interface ExportData {
  questions: Question[];
  entries: JournalEntry[];
  canvasCards: CanvasCard[];
  canvasConnections: CanvasConnection[];
  canvasAnnotations: CanvasAnnotation[];
}
