import React from 'react';
import { BookOpen, Code, Activity } from 'lucide-react';
import { DashboardCard } from './DashboardCard.tsx';

export const DashboardGrid: React.FC = () => {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <DashboardCard
        title="Current Lesson"
        description="Variables and Data Types in Python"
        icon={<BookOpen className="h-6 w-6 text-[#4CAF50]" />}
        action={{
          text: "Continue Learning",
          onClick: () => console.log("Navigate to lesson")
        }}
      />
      
      <DashboardCard
        title="Practice Problems"
        description="5 new problems available"
        icon={<Code className="h-6 w-6 text-[#4CAF50]" />}
        action={{
          text: "Start Coding",
          onClick: () => console.log("Navigate to problems")
        }}
      />
      
      <DashboardCard
        title="Your Progress"
        description="70% of Python Basics completed"
        icon={<Activity className="h-6 w-6 text-[#4CAF50]" />}
        action={{
          text: "View Details",
          onClick: () => console.log("Navigate to progress")
        }}
      />
    </div>
  );
};
