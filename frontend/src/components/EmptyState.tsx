import React from "react";

interface EmptyStateProps {
  title?: string;
  message?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title = "データがありません", message }) => {
  return (
    <div className="empty-state">
      <div>{title}</div>
      {message && <div style={{ marginTop: ".25rem" }}>{message}</div>}
    </div>
  );
};

export default EmptyState;
