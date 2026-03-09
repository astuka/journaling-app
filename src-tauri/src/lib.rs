mod commands;
mod db;

use db::Database;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let database = Database::new().expect("Failed to initialize database");

    tauri::Builder::default()
        .manage(database)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_questions,
            commands::add_questions,
            commands::delete_question,
            commands::clear_all_questions,
            commands::get_entries,
            commands::add_entry,
            commands::get_canvas_cards,
            commands::upsert_canvas_card,
            commands::get_canvas_connections,
            commands::add_canvas_connection,
            commands::remove_canvas_connection,
            commands::get_canvas_annotations,
            commands::upsert_canvas_annotation,
            commands::remove_canvas_annotation,
            commands::get_canvas_view_state,
            commands::save_canvas_view_state,
            commands::get_current_session,
            commands::save_session,
            commands::clear_session,
            commands::export_data,
            commands::import_data,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
