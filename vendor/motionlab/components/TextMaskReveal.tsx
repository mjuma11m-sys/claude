import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate } from 'remotion';

interface TextMaskRevealProps {
  text: string;
}

const TextMaskReveal: React.FC<TextMaskRevealProps> = ({ text }) => {
  const frame = useCurrentFrame();

  const reveal = interpolate(frame, [0, 45], [100, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-white flex justify-center items-center px-20">
      <div 
        className="text-center"
        style={{
          clipPath: `inset(0% ${reveal}% 0% 0%)`,
        }}
      >
        <h1 className="text-[100px] font-bold text-black tracking-tight leading-none whitespace-nowrap">
          {text}
        </h1>
      </div>
    </AbsoluteFill>
  );
};

export default TextMaskReveal;
