import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface SplitTextRevealProps {
  text: string;
}

const SplitTextReveal: React.FC<SplitTextRevealProps> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');

  return (
    <AbsoluteFill className="bg-white flex flex-col justify-center items-center px-20">
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 max-w-[90%]">
        {words.map((word, i) => {
          const spr = spring({
            frame: frame - i * 4,
            fps,
            config: {
              damping: 12,
              stiffness: 100,
              mass: 0.6,
            },
          });

          const translateY = interpolate(spr, [0, 1], [120, 0]);
          const opacity = interpolate(spr, [0, 0.4], [0, 1]);

          return (
            <div key={i} className="overflow-hidden py-2">
              <span
                className="inline-block text-[100px] font-black text-black leading-none tracking-tighter"
                style={{
                  transform: `translateY(${translateY}px)`,
                  opacity,
                }}
              >
                {word}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export default SplitTextReveal;
