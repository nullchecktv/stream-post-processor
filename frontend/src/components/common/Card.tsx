import React from 'react';
import type { BaseCardProps } from '../../types/design-tokens';

const Card: React.FC<BaseCardProps & { children: React.ReactNode }> = ({
  aspectRatio = 'none',
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  const aspectRatioClass = {
    landscape: 'aspect-[16/9]',
    square: 'aspect-square',
    portrait: 'aspect-[9/16]',
    instagram: 'aspect-[4/5]',
    none: '',
  }[aspectRatio];

  const hoverClass = hoverable
    ? 'transition-shadow duration-200 hover:shadow-flat-md cursor-pointer'
    : '';

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-flat border border-gray-200 dark:border-gray-700
        shadow-flat overflow-hidden
        ${aspectRatioClass}
        ${hoverClass}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
