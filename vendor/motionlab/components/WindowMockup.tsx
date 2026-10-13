import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface WindowMockupProps {
  src: string;
}

const WindowMockup: React.FC<WindowMockupProps> = ({ src }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame,
    fps,
    config: {
      damping: 14,
      stiffness: 100,
    },
  });

  const translateY = interpolate(spr, [0, 1], [150, 0]);
  const opacity = interpolate(spr, [0, 1], [0, 1]);
  const scale = interpolate(spr, [0, 1], [0.95, 1]);

  return (
    <AbsoluteFill className="bg-slate-50 flex items-center justify-center p-24">
      <div 
        className="w-[90%] max-h-[85%] bg-white rounded-2xl shadow-[0_50px_100px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden flex flex-col"
        style={{
          opacity,
          transform: `translateY(${translateY}px) scale(${scale})`,
        }}
      >
        {/* macOS Traffic Lights Header */}
        <div className="h-12 bg-slate-100 border-b border-slate-200 flex items-center px-5 gap-2 shrink-0">
          <div className="w-3 h-3 rounded-full bg-[#FF5F57]" />
          <div className="w-3 h-3 rounded-full bg-[#FEBC2E]" />
          <div className="w-3 h-3 rounded-full bg-[#28C840]" />
        </div>
        
        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-slate-50">
          <Img 
            src={src} 
            className="w-full h-full object-cover object-top"
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};

export default WindowMockup;
