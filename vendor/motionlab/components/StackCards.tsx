import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface StackCardsProps {
  items: string[];
}

const StackCards: React.FC<StackCardsProps> = ({ items }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame: frame - 10,
    fps,
    config: {
      damping: 14,
      stiffness: 100,
    },
  });

  return (
    <AbsoluteFill className="bg-slate-50 flex items-center justify-center overflow-hidden">
      <div className="relative w-full h-full flex items-center justify-center">
        {items.map((item, i) => {
          // Spread distance based on spring
          const spreadX = interpolate(spr, [0, 1], [0, (i - (items.length - 1) / 2) * 450]);
          const rotate = interpolate(spr, [0, 1], [0, (i - (items.length - 1) / 2) * 5]);
          const translateY = interpolate(spr, [0, 1], [0, Math.abs(i - (items.length - 1) / 2) * 20]);
          
          const opacity = interpolate(frame, [0, 20], [0, 1]);
          const scale = interpolate(frame, [0, 20], [0.8, 1], {
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={i}
              className="absolute w-[400px] h-[500px] bg-white rounded-[32px] p-10 shadow-[0_30px_60px_rgba(0,0,0,0.12)] border border-slate-100 flex flex-col justify-center items-center text-center"
              style={{
                opacity,
                transform: `translateX(${spreadX}px) translateY(${translateY}px) rotate(${rotate}deg) scale(${scale})`,
                zIndex: items.length - Math.abs(i - Math.floor(items.length / 2)),
              }}
            >
              <div className="w-16 h-16 bg-slate-100 rounded-2xl mb-8 flex items-center justify-center">
                <span className="text-2xl font-bold text-slate-400">{i + 1}</span>
              </div>
              <h3 className="text-3xl font-black text-slate-800 leading-tight">
                {item}
              </h3>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export default StackCards;
