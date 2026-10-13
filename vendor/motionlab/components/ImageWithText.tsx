import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface ImageWithTextProps {
  src: string;
  text: string;
  reverse?: boolean;
}

const ImageWithText: React.FC<ImageWithTextProps> = ({ src, text, reverse = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spr = spring({
    frame,
    fps,
    config: {
      damping: 12,
    },
  });

  const imageOpacity = interpolate(spr, [0, 1], [0, 1]);
  const imageTranslateX = interpolate(spr, [0, 1], [reverse ? 40 : -40, 0]);
  
  const textOpacity = interpolate(frame, [15, 45], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const textTranslateY = interpolate(frame, [15, 45], [20, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-white flex flex-row items-center justify-between px-24">
      <div 
        className={`flex-1 flex justify-center items-center ${reverse ? 'order-2' : 'order-1'}`}
        style={{
          opacity: imageOpacity,
          transform: `translateX(${imageTranslateX}px)`,
        }}
      >
        <div className="w-full max-h-[80%] overflow-hidden rounded-2xl shadow-xl">
          <Img
            src={src}
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      <div 
        className={`w-[40%] px-12 ${reverse ? 'order-1' : 'order-2'}`}
        style={{
          opacity: textOpacity,
          transform: `translateY(${textTranslateY}px)`,
        }}
      >
        <h2 className="text-6xl font-bold text-black leading-tight tracking-tight">
          {text}
        </h2>
      </div>
    </AbsoluteFill>
  );
};

export default ImageWithText;
