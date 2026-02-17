import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { QuestionBank } from './components/QuestionBank';
import { DailyJournal } from './components/DailyJournal';
import { Canvas } from './components/Canvas';
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
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
