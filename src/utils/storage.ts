import { invoke } from '@tauri-apps/api/core';
import type {
  Question,
  JournalEntry,
  CanvasCard,
  CanvasConnection,
  CanvasAnnotation,
  CanvasViewState,
  DailySession,
  ExportData,
} from '../types';

// Questions
export async function getQuestions(): Promise<Question[]> {
  return invoke<Question[]>('get_questions');
}

export async function addQuestions(newQuestions: Question[]): Promise<void> {
  await invoke('add_questions', { questions: newQuestions });
}

export async function deleteQuestion(id: string): Promise<void> {
  await invoke('delete_question', { id });
}

export async function clearAllQuestions(): Promise<void> {
  await invoke('clear_all_questions');
}

// Journal Entries
export async function getEntries(): Promise<JournalEntry[]> {
  return invoke<JournalEntry[]>('get_entries');
}

export async function addEntry(entry: JournalEntry): Promise<void> {
  await invoke('add_entry', { entry });
}

// Canvas Cards
export async function getCanvasCards(): Promise<CanvasCard[]> {
  return invoke<CanvasCard[]>('get_canvas_cards');
}

export async function upsertCanvasCard(card: CanvasCard): Promise<void> {
  await invoke('upsert_canvas_card', { card });
}

export async function getArchivedCanvasCards(): Promise<CanvasCard[]> {
  return invoke<CanvasCard[]>('get_archived_canvas_cards');
}

export async function archiveCanvasCard(id: string): Promise<void> {
  await invoke('archive_canvas_card', { id });
}

export async function unarchiveCanvasCard(id: string): Promise<void> {
  await invoke('unarchive_canvas_card', { id });
}

// Canvas Connections
export async function getCanvasConnections(): Promise<CanvasConnection[]> {
  return invoke<CanvasConnection[]>('get_canvas_connections');
}

export async function addCanvasConnection(connection: CanvasConnection): Promise<void> {
  await invoke('add_canvas_connection', { connection });
}

export async function removeCanvasConnection(id: string): Promise<void> {
  await invoke('remove_canvas_connection', { id });
}

// Canvas Annotations
export async function getCanvasAnnotations(): Promise<CanvasAnnotation[]> {
  return invoke<CanvasAnnotation[]>('get_canvas_annotations');
}

export async function upsertCanvasAnnotation(annotation: CanvasAnnotation): Promise<void> {
  await invoke('upsert_canvas_annotation', { annotation });
}

export async function removeCanvasAnnotation(id: string): Promise<void> {
  await invoke('remove_canvas_annotation', { id });
}

// Canvas View State
export async function getCanvasViewState(): Promise<CanvasViewState> {
  return invoke<CanvasViewState>('get_canvas_view_state');
}

export async function saveCanvasViewState(state: CanvasViewState): Promise<void> {
  await invoke('save_canvas_view_state', { state });
}

// Daily Session
export async function getCurrentSession(): Promise<DailySession | null> {
  return invoke<DailySession | null>('get_current_session');
}

export async function saveSession(session: DailySession): Promise<void> {
  await invoke('save_session', { session });
}

export async function clearSession(): Promise<void> {
  await invoke('clear_session');
}

// Utility functions (pure client-side logic)
export function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export async function hasJournaledToday(): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) return false;
  return session.date === getTodayDateString() && session.completed;
}

export async function selectRandomQuestions(count: number): Promise<string[]> {
  const questions = await getQuestions();
  if (questions.length === 0) return [];

  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, questions.length)).map((q) => q.id);
}

// Import/Export
export async function exportData(): Promise<ExportData> {
  return invoke<ExportData>('export_data');
}

export async function importData(data: ExportData): Promise<void> {
  await invoke('import_data', { data });
}
