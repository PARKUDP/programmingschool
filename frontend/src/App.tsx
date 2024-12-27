import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminPanel from './components/AdminPanel.tsx';
import Login from './components/Login.tsx';
import Lessons from './components/Lessons.tsx';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="/login" element={<Login />} />
        <Route path="/lessons" element={<Lessons />} />
      </Routes>
    </Router>
  );
};

export default App;
