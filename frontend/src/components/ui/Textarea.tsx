import React from 'react';

export function Textarea({
  value,
  onChange,
  readOnly = false,
  className = '',
  id,
}: {
  value: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  readOnly?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={readOnly ? undefined : onChange}
      readOnly={readOnly}
      className={`w-full rounded-md py-1 px-3 resize-none text-sm outline-none border ${readOnly ? 'bg-transparent cursor-default' : 'bg-white dark:bg-gray-800'} ${className}`}
    />
  );
}
