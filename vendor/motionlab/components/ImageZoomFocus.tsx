import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface ImageZoomFocusProps {
  src: string;
  focusX?: number; // 0 to 100
  focusY?: number; // 0 to 100
  zoomLevel?: number;
}

const ImageZoomFocus: React.FC<ImageZoomFocusProps> = ({ 
  src, 
  focusX = 50, 
  focusY = 50,
  zoomLevel = 2.5
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame,
    fps,
    config: {
      damping: 15,
      stiffness: 100,
    },
  });

  const scale = interpolate(spr, [0, 1], [1, zoomLevel]);
  
  // Calculate translation to keep focus point at center
  // (50 - focusX) * scale is the amount to move
  const translateX = interpolate(spr, [0, 1], [0, (50 - focusX)]);
  const translateY = interpolate(spr, [0, 1], [0, (50 - focusY)]);

  return (
    <AbsoluteFill className="bg-black overflow-hidden">
      <Img
        src={src}
        className="w-full h-full object-cover"
        style={{
          transformOrigin: `${focusX}% ${focusY}%`,
          transform: `scale(${scale})`,
        }}
      />
      
      {/* Optional: subtle focus vignette that appears as we zoom */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          opacity: interpolate(spr, [0.5, 1], [0, 0.3]),
          background: `radial-gradient(circle at ${focusX}% ${focusY}%, transparent 10%, black 70%)`
        }}
      />
    </AbsoluteFill>
  );
};

export default ImageZoomFocus;
