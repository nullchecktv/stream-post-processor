import React from 'react';
import type { ContentGridProps } from '../../types/design-tokens';

const ContentGrid: React.FC<ContentGridProps> = ({
  children,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 6,
  className = '',
}) => {
  const gridClasses = [
    'grid',
    `grid-cols-${columns.sm || 1}`,
    `md:grid-cols-${columns.md || 2}`,
    `lg:grid-cols-${columns.lg || 3}`,
    `xl:grid-cols-${columns.xl || 4}`,
    `gap-${gap}`,
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={gridClasses}>
      {children}
    </div>
  );
};

export default ContentGrid;
