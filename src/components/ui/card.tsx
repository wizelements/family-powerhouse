import * as React from 'react';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`rounded-xl border border-gray-200 bg-white shadow-md hover:shadow-lg transition-shadow duration-200 ${className}`}
      {...props}
    />
  )
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col space-y-2 p-6 border-b border-gray-100 ${className}`}
      {...props}
    />
  )
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className = '', ...props }, ref) => (
    <h3
      ref={ref}
      className={`text-xl font-bold leading-tight text-gray-900 ${className}`}
      {...props}
    />
  )
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className = '', ...props }, ref) => (
    <p
      ref={ref}
      className={`text-sm text-gray-500 font-medium ${className}`}
      {...props}
    />
  )
);
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => (
    <div ref={ref} className={`p-6 ${className}`} {...props} />
  )
);
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', ...props }, ref) => (
    <div
      ref={ref}
      className={`flex flex-col gap-3 p-6 border-t border-gray-100 ${className}`}
      {...props}
    />
  )
);
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
