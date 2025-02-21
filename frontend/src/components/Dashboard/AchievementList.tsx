import React from 'react';
import { Trophy } from 'lucide-react';

interface Achievement {
  id: string;
  text: string;
}

const achievements: Achievement[] = [
  { id: '1', text: "Completed 'Python Basics' module" },
  { id: '2', text: 'Solved 10 practice problems' },
  { id: '3', text: '7-day learning streak' },
];

export const AchievementList: React.FC = () => {
  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          Recent Achievements
        </h2>
        <Trophy className="h-5 w-5 text-[#4CAF50]" />
      </div>
      <div className="mt-4 space-y-4">
        {achievements.map(({ id, text }) => (
          <div
            key={id}
            className="flex items-center text-sm text-gray-600 py-2 border-b border-gray-100 last:border-0"
          >
            <div className="h-2 w-2 bg-[#4CAF50] rounded-full mr-3" />
            {text}
          </div>
        ))}
      </div>
    </div>
  );
};
