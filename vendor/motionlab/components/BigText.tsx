import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface BigTextProps {
  text: string;
}

const BigText: React.FC<BigTextProps> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame,
    fps,
    config: {
      damping: 12,
      stiffness: 100,
      mass: 0.5,
    },
  });

  const scale = interpolate(spr, [0, 1], [0.8, 1]);
  const opacity = interpolate(spr, [0, 0.5], [0, 1]);
  const letterSpacing = interpolate(spr, [0, 1], [20, 0]);

  return (
    <AbsoluteFill className="bg-white flex justify-center items-center">
      <div
        className="text-center px-20"
        style={{
          transform: `scale(${scale})`,
          opacity,
          letterSpacing: `${letterSpacing}px`,
        }}
      >
        <h2 className="text-[140px] font-black text-black uppercase leading-tight tracking-tight">
          {text}
        </h2>
      </div>
    </AbsoluteFill>
  );
};

export default BigText;
