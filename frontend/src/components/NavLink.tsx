import React from 'react';

interface NavLinkProps {
  icon: React.ReactNode;
  text: string;
  href: string;
}

const NavLink: React.FC<NavLinkProps> = ({ icon, text, href }) => {
  return (
    <a
      href={href}
      className="inline-flex items-center px-1 pt-1 text-sm font-medium text-gray-900 hover:text-[#4CAF50]"
    >
      {icon}
      <span className="ml-2">{text}</span>
    </a>
  );
};

export default NavLink;
