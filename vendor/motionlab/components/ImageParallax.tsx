import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from 'remotion';

interface ImageParallaxProps {
  src: string;
}

const ImageParallax: React.FC<ImageParallaxProps> = ({ src }) => {
  const frame = useCurrentFrame();

  const scale = interpolate(frame, [0, 150], [1, 1.1], {
    extrapolateRight: 'clamp',
  });

  const translateX = interpolate(frame, [0, 150], [-20, 20]);
  const translateY = interpolate(frame, [0, 150], [-10, 10]);

  // Secondary layer for depth
  const overlayScale = interpolate(frame, [0, 150], [1.05, 1.15], {
    extrapolateRight: 'clamp',
  });
  const overlayTranslateX = interpolate(frame, [0, 150], [20, -20]);

  return (
    <AbsoluteFill className="bg-black overflow-hidden pointer-events-none">
      {/* Background layer */}
      <Img
        src={src}
        className="w-full h-full object-cover opacity-60"
        style={{
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
          filter: 'blur(4px)',
        }}
      />
      
      {/* Main focus layer */}
      <AbsoluteFill className="flex items-center justify-center">
        <div 
          className="w-[85%] h-[85%] overflow-hidden rounded-lg shadow-2xl border border-white/10"
          style={{
            transform: `scale(${overlayScale}) translate(${overlayTranslateX}px, 0px)`,
          }}
        >
          <Img
            src={src}
            className="w-full h-full object-cover scale-110"
          />
        </div>
      </AbsoluteFill>

      {/* Subtle vignette/depth overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/40" />
    </AbsoluteFill>
  );
};

export default ImageParallax;
