import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Question } from '../types';
import {
  getQuestions,
  addQuestions,
  deleteQuestion,
  clearAllQuestions,
} from '../utils/storage';
import './QuestionBank.css';

export function QuestionBank() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [inputText, setInputText] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  useEffect(() => {
    const init = async () => {
      const loaded = await getQuestions();
      setQuestions(loaded);
    };
    init();
  }, []);

  const handleAddQuestions = async () => {
    const lines = inputText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (lines.length === 0) return;

    const newQuestions: Question[] = lines.map((text) => ({
      id: uuidv4(),
      text,
      createdAt: Date.now(),
    }));

    await addQuestions(newQuestions);
    const updated = await getQuestions();
    setQuestions(updated);
    setInputText('');
  };

  const handleDelete = async (id: string) => {
    await deleteQuestion(id);
    const updated = await getQuestions();
    setQuestions(updated);
  };

  const handleClearAll = async () => {
    await clearAllQuestions();
    setQuestions([]);
    setShowConfirmClear(false);
  };

  return (
    <div className="question-bank">
      <div className="question-bank-header">
        <h1>Question Bank</h1>
        <p className="subtitle">
          Build your personal collection of reflection prompts
        </p>
      </div>

      <div className="input-section">
        <label htmlFor="questions-input">Add New Questions</label>
        <p className="hint">Enter each question on a new line</p>
        <textarea
          id="questions-input"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="What made you smile today?&#10;What's one thing you learned?&#10;What are you grateful for?"
          rows={6}
        />
        <button
          className="btn btn-primary"
          onClick={handleAddQuestions}
          disabled={!inputText.trim()}
        >
          Add Questions
        </button>
      </div>

      <div className="questions-list-section">
        <div className="list-header">
          <h2>Your Questions ({questions.length})</h2>
          {questions.length > 0 && (
            <button
              className="btn btn-danger-outline"
              onClick={() => setShowConfirmClear(true)}
            >
              Clear All
            </button>
          )}
        </div>

        {questions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <p>No questions yet. Add some prompts to get started!</p>
          </div>
        ) : (
          <ul className="questions-list">
            {questions.map((question, index) => (
              <li key={question.id} className="question-item">
                <span className="question-number">{index + 1}</span>
                <span className="question-text">{question.text}</span>
                <button
                  className="btn-icon delete"
                  onClick={() => handleDelete(question.id)}
                  aria-label="Delete question"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showConfirmClear && (
        <div className="modal-overlay" onClick={() => setShowConfirmClear(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Clear All Questions?</h3>
            <p>This action cannot be undone. All your questions will be permanently deleted.</p>
            <div className="modal-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirmClear(false)}
              >
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleClearAll}>
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
