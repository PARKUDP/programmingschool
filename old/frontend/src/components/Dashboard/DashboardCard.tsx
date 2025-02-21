import React from 'react';
import { ArrowRight } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  action?: {
    text: string;
    onClick: () => void;
  };
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className="p-3 bg-[#4CAF50]/10 rounded-full">{icon}</div>
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
      </div>
      {action && (
        <div className="mt-4">
          <button
            onClick={action.onClick}
            className="inline-flex items-center text-sm font-medium text-[#4CAF50] hover:text-[#45a049]"
          >
            {action.text}
            <ArrowRight className="ml-2 h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};
