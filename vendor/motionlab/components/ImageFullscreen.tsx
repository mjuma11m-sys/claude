import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from 'remotion';

interface ImageFullscreenProps {
  src: string;
}

const ImageFullscreen: React.FC<ImageFullscreenProps> = ({ src }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, 30], [1, 1.05], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-black overflow-hidden">
      <Img
        src={src}
        className="w-full h-full object-cover"
        style={{
          opacity,
          transform: `scale(${scale})`,
        }}
      />
    </AbsoluteFill>
  );
};

export default ImageFullscreen;
