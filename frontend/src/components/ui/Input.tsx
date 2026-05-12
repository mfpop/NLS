import React from 'react';

export function Input({
  value,
  onChange,
  readOnly = false,
  className = '',
  type = 'text',
  id,
}: {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  readOnly?: boolean;
  className?: string;
  type?: string;
  id?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={readOnly ? undefined : onChange}
      readOnly={readOnly}
      className={`w-full rounded-md py-1 px-3 text-sm outline-none border ${readOnly ? 'bg-transparent cursor-default' : 'bg-white dark:bg-gray-800'} ${className}`}
    />
  );
}
