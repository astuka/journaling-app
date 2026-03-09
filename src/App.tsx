import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { QuestionBank } from './components/QuestionBank';
import { DailyJournal } from './components/DailyJournal';
import { Canvas } from './components/Canvas';
import { Settings } from './components/Settings';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<DailyJournal />} />
            <Route path="/questions" element={<QuestionBank />} />
            <Route path="/canvas" element={<Canvas />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
