import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import type { Question, DailySession, JournalEntry } from '../types';
import {
  getQuestions,
  getCurrentSession,
  saveSession,
  clearSession,
  getTodayDateString,
  selectRandomQuestions,
  addEntry,
  hasJournaledToday,
} from '../utils/storage';
import './DailyJournal.css';

const QUESTIONS_PER_SESSION = 10;

function parseQuestionIds(session: DailySession): string[] {
  return JSON.parse(session.selectedQuestionIds) as string[];
}

export function DailyJournal() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [session, setSession] = useState<DailySession | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answer, setAnswer] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [alreadyJournaledToday, setAlreadyJournaledToday] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const allQuestions = await getQuestions();
      setQuestions(allQuestions);

      const journaledToday = await hasJournaledToday();
      if (journaledToday) {
        setAlreadyJournaledToday(true);
        setLoading(false);
        return;
      }

      const existingSession = await getCurrentSession();
      if (existingSession && existingSession.date === getTodayDateString() && !existingSession.completed) {
        setSession(existingSession);
        setIsStarted(true);
        loadQuestionAtIndex(existingSession, allQuestions);
      }
      setLoading(false);
    };
    init();
  }, []);

  const loadQuestionAtIndex = (sess: DailySession, allQuestions: Question[]) => {
    const questionIds = parseQuestionIds(sess);
    const questionId = questionIds[sess.currentIndex];
    const question = allQuestions.find((q) => q.id === questionId);
    setCurrentQuestion(question || null);
  };

  const startSession = async () => {
    const selectedIds = await selectRandomQuestions(QUESTIONS_PER_SESSION);
    if (selectedIds.length === 0) return;

    const newSession: DailySession = {
      date: getTodayDateString(),
      selectedQuestionIds: JSON.stringify(selectedIds),
      currentIndex: 0,
      completed: false,
      answeredCount: 0,
      skippedCount: 0,
    };

    await saveSession(newSession);
    setSession(newSession);
    setIsStarted(true);
    loadQuestionAtIndex(newSession, questions);
  };

  const moveToNext = async (updatedSession: DailySession) => {
    const questionIds = parseQuestionIds(updatedSession);
    if (updatedSession.currentIndex >= questionIds.length - 1) {
      updatedSession.completed = true;
      await saveSession(updatedSession);
      setSession(updatedSession);
      setIsCompleted(true);
    } else {
      updatedSession.currentIndex += 1;
      await saveSession(updatedSession);
      setSession(updatedSession);
      loadQuestionAtIndex(updatedSession, questions);
      setAnswer('');
    }
  };

  const handleSubmit = async () => {
    if (!session || !currentQuestion || !answer.trim()) return;

    const entry: JournalEntry = {
      id: uuidv4(),
      questionId: currentQuestion.id,
      questionText: currentQuestion.text,
      answer: answer.trim(),
      createdAt: Date.now(),
      sessionDate: session.date,
    };
    await addEntry(entry);

    const updatedSession = {
      ...session,
      answeredCount: session.answeredCount + 1,
    };
    await moveToNext(updatedSession);
  };

  const handleSkip = async () => {
    if (!session) return;

    const updatedSession = {
      ...session,
      skippedCount: session.skippedCount + 1,
    };
    await moveToNext(updatedSession);
  };

  const handleFinish = () => {
    navigate('/canvas');
  };

  const handleStartFresh = async () => {
    await clearSession();
    setAlreadyJournaledToday(false);
    setIsCompleted(false);
    setIsStarted(false);
    setSession(null);
  };

  if (loading) {
    return (
      <div className="daily-journal">
        <div className="journal-container centered">
          <div className="empty-state">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="daily-journal">
        <div className="journal-container centered">
          <div className="empty-state">
            <div className="empty-icon">✨</div>
            <h2>No Questions Yet</h2>
            <p>Add some reflection prompts to your Question Bank before starting a journal session.</p>
            <button className="btn btn-primary" onClick={() => navigate('/questions')}>
              Go to Question Bank
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (alreadyJournaledToday) {
    return (
      <div className="daily-journal">
        <div className="journal-container centered">
          <div className="completed-state">
            <div className="completed-icon">🌟</div>
            <h2>You've Already Journaled Today!</h2>
            <p>Great job keeping up with your reflection practice. Come back tomorrow for new prompts.</p>
            <div className="completed-actions">
              <button className="btn btn-primary" onClick={() => navigate('/canvas')}>
                View Your Canvas
              </button>
              <button className="btn btn-secondary" onClick={handleStartFresh}>
                Start a New Session Anyway
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCompleted && session) {
    return (
      <div className="daily-journal">
        <div className="journal-container centered">
          <div className="completed-state">
            <div className="completed-icon">🎉</div>
            <h2>Session Complete!</h2>
            <div className="session-stats">
              <div className="stat">
                <span className="stat-value">{session.answeredCount}</span>
                <span className="stat-label">Answered</span>
              </div>
              <div className="stat">
                <span className="stat-value">{session.skippedCount}</span>
                <span className="stat-label">Skipped</span>
              </div>
            </div>
            <p>Your reflections have been saved. View them on your canvas!</p>
            <button className="btn btn-primary" onClick={handleFinish}>
              Go to Canvas
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="daily-journal">
        <div className="journal-container centered">
          <div className="start-state">
            <div className="start-icon">📖</div>
            <h1>Daily Journal</h1>
            <p>
              Take a moment to reflect. You'll receive {Math.min(QUESTIONS_PER_SESSION, questions.length)} random
              questions from your bank.
            </p>
            <div className="session-info">
              <span>{questions.length} questions in your bank</span>
            </div>
            <button className="btn btn-primary btn-large" onClick={startSession}>
              Begin Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  const questionIds = session ? parseQuestionIds(session) : [];

  return (
    <div className="daily-journal">
      <div className="journal-container">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${((session?.currentIndex || 0) / (questionIds.length || 1)) * 100}%`,
            }}
          />
        </div>
        <div className="progress-text">
          Question {(session?.currentIndex || 0) + 1} of {questionIds.length}
        </div>

        <div className="question-card">
          <div className="question-prompt">{currentQuestion?.text}</div>
        </div>

        <div className="answer-section">
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Write your reflection here..."
            rows={6}
            autoFocus
          />
        </div>

        <div className="action-buttons">
          <button className="btn btn-ghost" onClick={handleSkip}>
            Skip
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={!answer.trim()}
          >
            Submit Answer
          </button>
        </div>
      </div>
    </div>
  );
}
