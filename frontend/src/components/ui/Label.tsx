import React from 'react';

export function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block font-medium text-gray-700 dark:text-gray-300 mb-1 text-sm">
      {children}
    </label>
  );
}
