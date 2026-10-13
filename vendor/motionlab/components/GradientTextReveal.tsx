import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface GradientTextRevealProps {
  text: string;
}

const GradientTextReveal: React.FC<GradientTextRevealProps> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame,
    fps,
    config: {
      damping: 12,
      stiffness: 100,
    },
  });

  const opacity = interpolate(spr, [0, 1], [0, 1]);
  const translateY = interpolate(spr, [0, 1], [30, 0]);
  const scale = interpolate(spr, [0, 1], [0.95, 1]);

  // Animate gradient position for "Stripe vibes"
  const gradientPos = (frame * 2) % 200;

  return (
    <AbsoluteFill className="bg-white flex justify-center items-center px-10">
      <div 
        className="text-center"
        style={{
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
        }}
      >
        <h1 
          className="text-[120px] font-black tracking-tighter leading-none"
          style={{
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 25%, #ec4899 50%, #f43f5e 75%, #6366f1 100%)',
            backgroundSize: '200% 200%',
            backgroundPosition: `${gradientPos}% ${gradientPos}%`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 10px 30px rgba(99, 102, 241, 0.15))',
          }}
        >
          {text}
        </h1>
      </div>
    </AbsoluteFill>
  );
};

export default GradientTextReveal;
