import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, id, ...props }, ref) => {
    const inputId = id || props.name;
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-semibold text-gray-900 mb-2">
            {label}
          </label>
        )}
        <input
          id={inputId}
          className={`w-full rounded-lg border-2 px-4 py-2.5 text-sm transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-offset-0 
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60
            placeholder:text-gray-400
            ${error 
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
            }
            ${className}`}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-2 text-sm font-medium text-red-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18.101 12.93a1 1 0 00-1.414-1.414L10 14.586l-6.687-6.687a1 1 0 00-1.414 1.414l8.1 8.1a1 1 0 001.414 0l10.1-10.1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
