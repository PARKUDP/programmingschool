import React from "react";
import { Link } from "react-router-dom";

export interface Breadcrumb {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, breadcrumbs = [] }) => {
  return (
    <div className="page-header">
      {breadcrumbs.length > 0 && (
        <nav aria-label="breadcrumb" className="breadcrumb">
          {breadcrumbs.map((b, idx) => (
            <span key={idx} className="breadcrumb-item">
              {b.to ? <Link to={b.to} title={b.label}>{b.label}</Link> : <span>{b.label}</span>}
              {idx < breadcrumbs.length - 1 && <span className="breadcrumb-sep">›</span>}
            </span>
          ))}
        </nav>
      )}
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="page-subtitle">{subtitle}</p>}
    </div>
  );
};

export default PageHeader;
