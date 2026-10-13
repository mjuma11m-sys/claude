import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from 'remotion';

interface ImageBlurToSharpProps {
  src: string;
}

const ImageBlurToSharp: React.FC<ImageBlurToSharpProps> = ({ src }) => {
  const frame = useCurrentFrame();

  const blur = interpolate(frame, [0, 45], [20, 0], {
    extrapolateRight: 'clamp',
  });

  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, 45], [1.1, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-white overflow-hidden pointer-events-none">
      <Img
        src={src}
        className="w-full h-full object-cover"
        style={{
          filter: `blur(${blur}px)`,
          opacity,
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

export default ImageBlurToSharp;
