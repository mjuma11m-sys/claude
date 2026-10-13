import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

interface OutroCenteredProps {
  text: string;
}

const OutroCentered: React.FC<OutroCenteredProps> = ({ text }) => {
  const frame = useCurrentFrame();

  const opacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(frame, [0, 30], [0.95, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-white flex flex-col justify-center items-center p-20">
      <div 
        className="max-w-[70%] text-center"
        style={{
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        <h1 className="text-7xl font-bold text-black tracking-tight leading-tight">
          {text}
        </h1>
      </div>
    </AbsoluteFill>
  );
};

export default OutroCentered;
