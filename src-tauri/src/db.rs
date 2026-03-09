use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Question {
    pub id: String,
    pub text: String,
    pub created_at: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct JournalEntry {
    pub id: String,
    pub question_id: String,
    pub question_text: String,
    pub answer: String,
    pub created_at: i64,
    pub session_date: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CanvasCard {
    pub id: String,
    pub entry_id: String,
    pub position_x: f64,
    pub position_y: f64,
    pub color: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CanvasConnection {
    pub id: String,
    pub from_card_id: String,
    pub to_card_id: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CanvasAnnotation {
    pub id: String,
    pub text: String,
    pub position_x: f64,
    pub position_y: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct CanvasViewState {
    pub view_offset_x: f64,
    pub view_offset_y: f64,
    pub zoom: f64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DailySession {
    pub date: String,
    pub selected_question_ids: String, // JSON array stored as string
    pub current_index: i32,
    pub completed: bool,
    pub answered_count: i32,
    pub skipped_count: i32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportData {
    pub questions: Vec<Question>,
    pub entries: Vec<JournalEntry>,
    pub canvas_cards: Vec<CanvasCard>,
    pub canvas_connections: Vec<CanvasConnection>,
    pub canvas_annotations: Vec<CanvasAnnotation>,
}

pub struct Database {
    conn: Mutex<Connection>,
}

impl Database {
    pub fn new() -> Result<Self, String> {
        let db_path = Self::get_db_path()?;

        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create data directory: {}", e))?;
        }

        let conn = Connection::open(&db_path)
            .map_err(|e| format!("Failed to open database: {}", e))?;

        let db = Database {
            conn: Mutex::new(conn),
        };
        db.run_migrations()?;
        Ok(db)
    }

    fn get_db_path() -> Result<PathBuf, String> {
        let data_dir = dirs::data_local_dir()
            .ok_or_else(|| "Could not determine local data directory".to_string())?;
        Ok(data_dir.join("Reflections").join("reflections.db"))
    }

    fn run_migrations(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;

        conn.execute_batch(
            "
            CREATE TABLE IF NOT EXISTS schema_version (
                version INTEGER PRIMARY KEY
            );

            CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                created_at INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS journal_entries (
                id TEXT PRIMARY KEY,
                question_id TEXT NOT NULL,
                question_text TEXT NOT NULL,
                answer TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                session_date TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS canvas_cards (
                id TEXT PRIMARY KEY,
                entry_id TEXT NOT NULL,
                position_x REAL NOT NULL DEFAULT 0,
                position_y REAL NOT NULL DEFAULT 0,
                color TEXT NOT NULL DEFAULT '#FF6B6B'
            );

            CREATE TABLE IF NOT EXISTS canvas_connections (
                id TEXT PRIMARY KEY,
                from_card_id TEXT NOT NULL,
                to_card_id TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS canvas_annotations (
                id TEXT PRIMARY KEY,
                text TEXT NOT NULL,
                position_x REAL NOT NULL DEFAULT 0,
                position_y REAL NOT NULL DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS canvas_view_state (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                view_offset_x REAL NOT NULL DEFAULT 0,
                view_offset_y REAL NOT NULL DEFAULT 0,
                zoom REAL NOT NULL DEFAULT 1.0
            );

            INSERT OR IGNORE INTO canvas_view_state (id, view_offset_x, view_offset_y, zoom)
            VALUES (1, 0, 0, 1.0);

            CREATE TABLE IF NOT EXISTS daily_session (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                date TEXT NOT NULL,
                selected_question_ids TEXT NOT NULL,
                current_index INTEGER NOT NULL DEFAULT 0,
                completed INTEGER NOT NULL DEFAULT 0,
                answered_count INTEGER NOT NULL DEFAULT 0,
                skipped_count INTEGER NOT NULL DEFAULT 0
            );

            INSERT OR IGNORE INTO schema_version (version) VALUES (1);
            ",
        )
        .map_err(|e| format!("Migration failed: {}", e))?;

        Ok(())
    }

    // Questions
    pub fn get_questions(&self) -> Result<Vec<Question>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, text, created_at FROM questions ORDER BY created_at ASC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(Question {
                    id: row.get(0)?,
                    text: row.get(1)?,
                    created_at: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn add_questions(&self, questions: &[Question]) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        for q in questions {
            conn.execute(
                "INSERT OR REPLACE INTO questions (id, text, created_at) VALUES (?1, ?2, ?3)",
                params![q.id, q.text, q.created_at],
            )
            .map_err(|e| e.to_string())?;
        }
        Ok(())
    }

    pub fn delete_question(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM questions WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn clear_all_questions(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM questions", [])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Journal Entries
    pub fn get_entries(&self) -> Result<Vec<JournalEntry>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, question_id, question_text, answer, created_at, session_date FROM journal_entries ORDER BY created_at ASC")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(JournalEntry {
                    id: row.get(0)?,
                    question_id: row.get(1)?,
                    question_text: row.get(2)?,
                    answer: row.get(3)?,
                    created_at: row.get(4)?,
                    session_date: row.get(5)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn add_entry(&self, entry: &JournalEntry) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT INTO journal_entries (id, question_id, question_text, answer, created_at, session_date) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![entry.id, entry.question_id, entry.question_text, entry.answer, entry.created_at, entry.session_date],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Canvas Cards
    pub fn get_canvas_cards(&self) -> Result<Vec<CanvasCard>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, entry_id, position_x, position_y, color FROM canvas_cards")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(CanvasCard {
                    id: row.get(0)?,
                    entry_id: row.get(1)?,
                    position_x: row.get(2)?,
                    position_y: row.get(3)?,
                    color: row.get(4)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn upsert_canvas_card(&self, card: &CanvasCard) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO canvas_cards (id, entry_id, position_x, position_y, color) VALUES (?1, ?2, ?3, ?4, ?5)",
            params![card.id, card.entry_id, card.position_x, card.position_y, card.color],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Canvas Connections
    pub fn get_canvas_connections(&self) -> Result<Vec<CanvasConnection>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, from_card_id, to_card_id FROM canvas_connections")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(CanvasConnection {
                    id: row.get(0)?,
                    from_card_id: row.get(1)?,
                    to_card_id: row.get(2)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn add_canvas_connection(&self, conn_data: &CanvasConnection) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR IGNORE INTO canvas_connections (id, from_card_id, to_card_id) VALUES (?1, ?2, ?3)",
            params![conn_data.id, conn_data.from_card_id, conn_data.to_card_id],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn remove_canvas_connection(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM canvas_connections WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Canvas Annotations
    pub fn get_canvas_annotations(&self) -> Result<Vec<CanvasAnnotation>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let mut stmt = conn
            .prepare("SELECT id, text, position_x, position_y FROM canvas_annotations")
            .map_err(|e| e.to_string())?;
        let rows = stmt
            .query_map([], |row| {
                Ok(CanvasAnnotation {
                    id: row.get(0)?,
                    text: row.get(1)?,
                    position_x: row.get(2)?,
                    position_y: row.get(3)?,
                })
            })
            .map_err(|e| e.to_string())?;
        rows.collect::<Result<Vec<_>, _>>()
            .map_err(|e| e.to_string())
    }

    pub fn upsert_canvas_annotation(&self, annotation: &CanvasAnnotation) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO canvas_annotations (id, text, position_x, position_y) VALUES (?1, ?2, ?3, ?4)",
            params![annotation.id, annotation.text, annotation.position_x, annotation.position_y],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn remove_canvas_annotation(&self, id: &str) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM canvas_annotations WHERE id = ?1", params![id])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Canvas View State
    pub fn get_canvas_view_state(&self) -> Result<CanvasViewState, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.query_row(
            "SELECT view_offset_x, view_offset_y, zoom FROM canvas_view_state WHERE id = 1",
            [],
            |row| {
                Ok(CanvasViewState {
                    view_offset_x: row.get(0)?,
                    view_offset_y: row.get(1)?,
                    zoom: row.get(2)?,
                })
            },
        )
        .map_err(|e| e.to_string())
    }

    pub fn save_canvas_view_state(&self, state: &CanvasViewState) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "UPDATE canvas_view_state SET view_offset_x = ?1, view_offset_y = ?2, zoom = ?3 WHERE id = 1",
            params![state.view_offset_x, state.view_offset_y, state.zoom],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Daily Session
    pub fn get_current_session(&self) -> Result<Option<DailySession>, String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        let result = conn.query_row(
            "SELECT date, selected_question_ids, current_index, completed, answered_count, skipped_count FROM daily_session WHERE id = 1",
            [],
            |row| {
                let completed_int: i32 = row.get(3)?;
                Ok(DailySession {
                    date: row.get(0)?,
                    selected_question_ids: row.get(1)?,
                    current_index: row.get(2)?,
                    completed: completed_int != 0,
                    answered_count: row.get(4)?,
                    skipped_count: row.get(5)?,
                })
            },
        );
        match result {
            Ok(session) => Ok(Some(session)),
            Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
            Err(e) => Err(e.to_string()),
        }
    }

    pub fn save_session(&self, session: &DailySession) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute(
            "INSERT OR REPLACE INTO daily_session (id, date, selected_question_ids, current_index, completed, answered_count, skipped_count) VALUES (1, ?1, ?2, ?3, ?4, ?5, ?6)",
            params![
                session.date,
                session.selected_question_ids,
                session.current_index,
                session.completed as i32,
                session.answered_count,
                session.skipped_count,
            ],
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn clear_session(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| e.to_string())?;
        conn.execute("DELETE FROM daily_session WHERE id = 1", [])
            .map_err(|e| e.to_string())?;
        Ok(())
    }

    // Export all data as JSON
    pub fn export_all_data(&self) -> Result<ExportData, String> {
        Ok(ExportData {
            questions: self.get_questions()?,
            entries: self.get_entries()?,
            canvas_cards: self.get_canvas_cards()?,
            canvas_connections: self.get_canvas_connections()?,
            canvas_annotations: self.get_canvas_annotations()?,
        })
    }

    // Import data from JSON
    pub fn import_data(&self, data: &ExportData) -> Result<(), String> {
        self.add_questions(&data.questions)?;
        for entry in &data.entries {
            // Use INSERT OR IGNORE to skip duplicates
            let conn = self.conn.lock().map_err(|e| e.to_string())?;
            conn.execute(
                "INSERT OR IGNORE INTO journal_entries (id, question_id, question_text, answer, created_at, session_date) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![entry.id, entry.question_id, entry.question_text, entry.answer, entry.created_at, entry.session_date],
            )
            .map_err(|e| e.to_string())?;
        }
        for card in &data.canvas_cards {
            self.upsert_canvas_card(card)?;
        }
        for conn_data in &data.canvas_connections {
            self.add_canvas_connection(conn_data)?;
        }
        for ann in &data.canvas_annotations {
            self.upsert_canvas_annotation(ann)?;
        }
        Ok(())
    }
}
