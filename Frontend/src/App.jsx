import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import DesignerPage from './pages/DesignerPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/designer/:projectId" element={<DesignerPage />} />
      </Routes>
    </Router>
  );
}

export default App;