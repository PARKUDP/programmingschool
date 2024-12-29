import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation.tsx';
import Lessons from './components/Lessons.tsx';
import CodeEditor from './components/CodeEditor.tsx';
import AdminPanel from './components/AdminPanel.tsx';
import Login from './components/Login.tsx';
import { DashboardGrid } from './components/Dashboard/DashboardGrid.tsx';
import { AchievementList } from './components/Dashboard/AchievementList.tsx';
import MaterialManagement from './components/MaterialManagement.tsx';
import './styles/index.css'
const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/materials" element={<MaterialManagement />} />
            <Route path="/" element={<DashboardGrid />} />
            <Route path="/lessons" element={<Lessons />} />
            <Route path="/practice" element={<CodeEditor />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/login" element={<Login />} />
          </Routes>
          <div className="mt-8">
            <AchievementList />
          </div>
        </main>
      </div>
    </Router>
  );
};

export default App;
