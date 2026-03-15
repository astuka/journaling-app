use crate::db::{
    CanvasAnnotation, CanvasCard, CanvasConnection, CanvasViewState, DailySession, Database,
    ExportData, JournalEntry, Question,
};
use tauri::State;

// Questions
#[tauri::command]
pub fn get_questions(db: State<Database>) -> Result<Vec<Question>, String> {
    db.get_questions()
}

#[tauri::command]
pub fn add_questions(db: State<Database>, questions: Vec<Question>) -> Result<(), String> {
    db.add_questions(&questions)
}

#[tauri::command]
pub fn delete_question(db: State<Database>, id: String) -> Result<(), String> {
    db.delete_question(&id)
}

#[tauri::command]
pub fn clear_all_questions(db: State<Database>) -> Result<(), String> {
    db.clear_all_questions()
}

// Journal Entries
#[tauri::command]
pub fn get_entries(db: State<Database>) -> Result<Vec<JournalEntry>, String> {
    db.get_entries()
}

#[tauri::command]
pub fn add_entry(db: State<Database>, entry: JournalEntry) -> Result<(), String> {
    db.add_entry(&entry)
}

// Canvas
#[tauri::command]
pub fn get_canvas_cards(db: State<Database>) -> Result<Vec<CanvasCard>, String> {
    db.get_canvas_cards()
}

#[tauri::command]
pub fn upsert_canvas_card(db: State<Database>, card: CanvasCard) -> Result<(), String> {
    db.upsert_canvas_card(&card)
}

#[tauri::command]
pub fn get_archived_canvas_cards(db: State<Database>) -> Result<Vec<CanvasCard>, String> {
    db.get_archived_canvas_cards()
}

#[tauri::command]
pub fn archive_canvas_card(db: State<Database>, id: String) -> Result<(), String> {
    db.archive_canvas_card(&id)
}

#[tauri::command]
pub fn unarchive_canvas_card(db: State<Database>, id: String) -> Result<(), String> {
    db.unarchive_canvas_card(&id)
}

#[tauri::command]
pub fn get_canvas_connections(db: State<Database>) -> Result<Vec<CanvasConnection>, String> {
    db.get_canvas_connections()
}

#[tauri::command]
pub fn add_canvas_connection(
    db: State<Database>,
    connection: CanvasConnection,
) -> Result<(), String> {
    db.add_canvas_connection(&connection)
}

#[tauri::command]
pub fn remove_canvas_connection(db: State<Database>, id: String) -> Result<(), String> {
    db.remove_canvas_connection(&id)
}

#[tauri::command]
pub fn get_canvas_annotations(db: State<Database>) -> Result<Vec<CanvasAnnotation>, String> {
    db.get_canvas_annotations()
}

#[tauri::command]
pub fn upsert_canvas_annotation(
    db: State<Database>,
    annotation: CanvasAnnotation,
) -> Result<(), String> {
    db.upsert_canvas_annotation(&annotation)
}

#[tauri::command]
pub fn remove_canvas_annotation(db: State<Database>, id: String) -> Result<(), String> {
    db.remove_canvas_annotation(&id)
}

#[tauri::command]
pub fn get_canvas_view_state(db: State<Database>) -> Result<CanvasViewState, String> {
    db.get_canvas_view_state()
}

#[tauri::command]
pub fn save_canvas_view_state(
    db: State<Database>,
    state: CanvasViewState,
) -> Result<(), String> {
    db.save_canvas_view_state(&state)
}

// Session
#[tauri::command]
pub fn get_current_session(db: State<Database>) -> Result<Option<DailySession>, String> {
    db.get_current_session()
}

#[tauri::command]
pub fn save_session(db: State<Database>, session: DailySession) -> Result<(), String> {
    db.save_session(&session)
}

#[tauri::command]
pub fn clear_session(db: State<Database>) -> Result<(), String> {
    db.clear_session()
}

// Import/Export
#[tauri::command]
pub fn export_data(db: State<Database>) -> Result<ExportData, String> {
    db.export_all_data()
}

#[tauri::command]
pub fn import_data(db: State<Database>, data: ExportData) -> Result<(), String> {
    db.import_data(&data)
}
