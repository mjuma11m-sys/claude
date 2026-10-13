import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface FloatingCardProps {
  title: string;
  description?: string;
  backgroundSrc?: string;
}

const FloatingCard: React.FC<FloatingCardProps> = ({ title, description, backgroundSrc }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance animation
  const spr = spring({
    frame,
    fps,
    config: {
      damping: 12,
      stiffness: 100,
    },
  });

  const entranceTranslateY = interpolate(spr, [0, 1], [100, 0]);
  const entranceOpacity = interpolate(spr, [0, 1], [0, 1]);

  // Continuous floating animation
  const floatOffset = Math.sin(frame / 20) * 15;
  const floatRotate = Math.sin(frame / 30) * 2;

  return (
    <AbsoluteFill className="bg-slate-50 flex items-center justify-center p-20">
      <div 
        className="bg-white rounded-[40px] p-16 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100 max-w-2xl w-full text-center"
        style={{
          opacity: entranceOpacity,
          transform: `translateY(${entranceTranslateY + floatOffset}px) rotate(${floatRotate}deg)`,
        }}
      >
        <h2 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-2xl text-slate-500 font-medium leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </AbsoluteFill>
  );
};

export default FloatingCard;
