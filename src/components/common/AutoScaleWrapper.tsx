import React, { useEffect, useRef, useState } from "react";

interface AutoScaleWrapperProps {
  children: React.ReactNode;
  className?: string;
  /**
   * The percentage of the viewport height to target (e.g., 0.95 for 95vh).
   */
  targetHeightRatio?: number;
}

/**
 * A wrapper component that automatically applies CSS `transform: scale()`
 * to its children if they exceed the specified viewport height ratio.
 * This prevents scrollbars on small screens while maintaining aspect ratios.
 */
export const AutoScaleWrapper: React.FC<AutoScaleWrapperProps> = ({
  children,
  className = "",
  targetHeightRatio = 0.95,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;

    const checkScale = () => {
      if (!containerRef.current) return;
      const targetMaxHeight = window.innerHeight * targetHeightRatio;
      
      // Temporarily reset scale to measure natural height
      containerRef.current.style.transform = 'none';
      const actualHeight = containerRef.current.scrollHeight;
      
      if (actualHeight > targetMaxHeight) {
        setScale(targetMaxHeight / actualHeight);
      } else {
        setScale(1);
      }
      
      // Re-apply scale via inline style will happen on next render
    };

    checkScale();
    window.addEventListener("resize", checkScale);
    
    const observer = new ResizeObserver(checkScale);
    if (containerRef.current) observer.observe(containerRef.current);

    return () => {
      window.removeEventListener("resize", checkScale);
      observer.disconnect();
    };
  }, [targetHeightRatio, children]);

  return (
    <div
      ref={containerRef}
      style={{ transform: `scale(${scale})`, transformOrigin: 'center center' }}
      className={`relative w-full ${className}`}
    >
      {children}
    </div>
  );
};
