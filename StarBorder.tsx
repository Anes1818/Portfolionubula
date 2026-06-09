import React from 'react';
import './StarBorder.css';

type StarBorderProps<T extends React.ElementType = 'button'> =
  React.ComponentPropsWithoutRef<T> & {
    /** The element or component to render as the container. Defaults to 'button'. */
    as?: T;
    className?: string;
    children?: React.ReactNode;
    /**
     * Gradient color stops for the rotating star trail.
     * Pass a comma-separated list of CSS color values.
     * @example "#fff, #4facfe, #fff"
     * @example "#c9a96e, transparent, #c9a96e"
     */
    gradient?: string;
    /** Animation duration for one full rotation. @example "6s" "3s" */
    speed?: React.CSSProperties['animationDuration'];
    /**
     * Background color of the inner content area.
     * Defaults to var(--star-border-bg, #000) so it inherits from CSS.
     */
    innerBg?: string;
  };

function StarBorder<T extends React.ElementType = 'button'>({
  as,
  className = '',
  gradient = '#ffffff, #555555, #ffffff',
  speed = '6s',
  innerBg,
  children,
  ...rest
}: StarBorderProps<T>) {
  const Component = (as ?? 'button') as React.ElementType;

  return (
    <Component
      className={`star-border-container ${className}`}
      // Spread rest without 'as any' — Component is already typed above
      {...(rest as Record<string, unknown>)}
    >
      <div
        className="star-border-glow"
        style={{
          background: `conic-gradient(from 0deg, transparent, ${gradient}, transparent)`,
          animationDuration: speed,
        }}
      />
      <div
        className="star-border-inner"
        style={innerBg ? { background: innerBg } : undefined}
      >
        {children}
      </div>
    </Component>
  );
}

export default StarBorder;
