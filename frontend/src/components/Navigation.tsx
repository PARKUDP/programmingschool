import React from 'react';
import { Home, BookOpen, Code, Settings, LogOut } from 'lucide-react';
import NavLink from './NavLink.tsx';

export const Navigation: React.FC = () => {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Code className="h-8 w-8 text-[#4CAF50]" />
              <span className="ml-2 text-xl font-bold text-gray-900">PyLearn</span>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <NavLink icon={<Home className="h-5 w-5" />} text="Dashboard" href="/" />
              <NavLink icon={<BookOpen className="h-5 w-5" />} text="Lessons" href="/lessons" />
              <NavLink icon={<Code className="h-5 w-5" />} text="Practice" href="/practice" />
            </div>
          </div>
          <div className="flex items-center">
            <button className="p-2 rounded-full hover:bg-gray-100">
              <Settings className="h-5 w-5 text-gray-600" />
            </button>
            <button className="ml-4 p-2 rounded-full hover:bg-gray-100">
              <LogOut className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
