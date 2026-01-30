/**
 * Design Token Type Definitions
 *
 * This file contains TypeScript type definitions for the flat 2.0 design system.
 * These types ensure consistency across components and provide type safety for
 * design-related props.
 */

/**
 * Aspect ratio options for content cards
 *
 * - landscape: 16:9 ratio for horizontal content (episodes, landscape clips)
 * - square: 1:1 ratio for Instagram-style content (quotes)
 * - portrait: 9:16 ratio for vertical content (portrait clips, stories)
 * - instagram: 4:5 ratio for Instagram portrait posts (blog cards)
 * - none: No aspect ratio constraint
 */
export type AspectRatio = 'landscape' | 'square' | 'portrait' | 'instagram' | 'none';

/**
 * Button style variants
 *
 * - primary: Main action button with primary color
 * - secondary: Secondary action button with border
 * - tertiary: Minimal button with no background (legacy, use 'text' instead)
 * - danger: Destructive action button with error color
 * - ghost: Outlined button with transparent background
 * - text: Text-only button with no background
 */
export type ButtonVariant = 'primary' | 'secondary' | 'tertiary' | 'danger' | 'ghost' | 'text';

/**
 * Button size options
 *
 * - sm: Small button (compact spacing)
 * - md: Medium button (default)
 * - lg: Large button (prominent actions)
 */
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Status badge size options
 *
 * - sm: Small badge for compact layouts
 * - md: Medium badge (default)
 */
export type StatusBadgeSize = 'sm' | 'md';

/**
 * Color palette structure
 *
 * Defines a color with optional light and dark variants
 */
export interface ColorPalette {
  DEFAULT: string;
  light?: string;
  dark?: string;
}

/**
 * Base props for Card component
 *
 * Common props used by the Card component and components that extend it
 */
export interface BaseCardProps {
  aspectRatio?: AspectRatio;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

/**
 * Grid column configuration for responsive layouts
 *
 * Defines number of columns at different breakpoints
 */
export interface GridColumns {
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}

/**
 * Props for ContentGrid component
 */
export interface ContentGridProps {
  children: React.ReactNode;
  columns?: GridColumns;
  gap?: number;
  className?: string;
}

/**
 * Props for Button component
 */
export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

/**
 * Props for StatusIndicator component
 *
 * Note: Actual StatusIndicator implementations may extend this
 * with specific status types (e.g., BlogStatus, EpisodeStatus)
 */
export interface StatusIndicatorProps {
  status: string;
  size?: StatusBadgeSize | 'lg';
  showIcon?: boolean;
  className?: string;
}
