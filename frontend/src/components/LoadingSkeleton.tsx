import React from "react";

interface LoadingSkeletonProps {
  lines?: number;
  height?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ lines = 3, height = 12 }) => {
  return (
    <div aria-busy="true" aria-live="polite">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height, marginBottom: 8 }} />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
