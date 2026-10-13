import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';

interface TypingTextProps {
  text: string;
  speed?: number; // 1 for regular, higher for faster
}

const TypingText: React.FC<TypingTextProps> = ({ text, speed = 1 }) => {
  const frame = useCurrentFrame();

  // Calculate current text slice
  const charactersToShow = Math.floor(frame * speed);
  const currentText = text.slice(0, Math.max(0, charactersToShow));

  // Cursor effect
  const cursorBlink = Math.floor(frame / 10) % 2 === 0;

  return (
    <AbsoluteFill className="bg-slate-900 flex items-center justify-center p-20 font-mono">
      <div className="max-w-4xl text-left bg-black p-10 rounded-2xl border border-slate-700 shadow-2xl min-h-[150px] flex items-center">
        <span className="text-4xl text-emerald-400 leading-relaxed font-bold">
          <span className="text-pink-500 mr-2">$</span>
          {currentText}
          <span
            className={`inline-block translate-y-1 ml-1 w-3 h-8 bg-emerald-400 ${cursorBlink ? 'opacity-100' : 'opacity-0'}`}
          />
        </span>
      </div>
    </AbsoluteFill>
  );
};

export default TypingText;
