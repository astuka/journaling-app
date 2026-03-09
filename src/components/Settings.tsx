import { useState } from 'react';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { exportData, importData } from '../utils/storage';
import type { ExportData } from '../types';
import './Settings.css';

export function Settings() {
  const [status, setStatus] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      const data = await exportData();
      const json = JSON.stringify(data, null, 2);

      const filePath = await save({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        defaultPath: `reflections-export-${new Date().toISOString().split('T')[0]}.json`,
      });

      if (filePath) {
        await writeTextFile(filePath, json);
        setStatus('Data exported successfully!');
      }
    } catch (err) {
      setStatus(`Export failed: ${err}`);
    }
  };

  const handleImport = async () => {
    try {
      const filePath = await open({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        multiple: false,
      });

      if (filePath) {
        const content = await readTextFile(filePath as string);
        const data = JSON.parse(content) as ExportData;
        await importData(data);
        setStatus('Data imported successfully! Refresh to see changes.');
      }
    } catch (err) {
      setStatus(`Import failed: ${err}`);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-container">
        <h1>Settings</h1>

        <div className="settings-section">
          <h2>Data Management</h2>
          <p className="settings-description">
            Your data is stored locally in a SQLite database on your machine. Use these tools to
            back up or transfer your data.
          </p>

          <div className="settings-actions">
            <div className="action-card">
              <h3>Export Data</h3>
              <p>Save all your questions, journal entries, and canvas data to a JSON file.</p>
              <button className="btn btn-primary" onClick={handleExport}>
                Export to JSON
              </button>
            </div>

            <div className="action-card">
              <h3>Import Data</h3>
              <p>Load data from a previously exported JSON file. Existing data will be preserved.</p>
              <button className="btn btn-secondary" onClick={handleImport}>
                Import from JSON
              </button>
            </div>
          </div>

          {status && (
            <div className="status-message">
              {status}
            </div>
          )}
        </div>

        <div className="settings-section">
          <h2>About</h2>
          <p className="settings-description">
            Reflections is a local-first journaling app. All your data stays on your machine
            — nothing is sent to any server.
          </p>
        </div>
      </div>
    </div>
  );
}
