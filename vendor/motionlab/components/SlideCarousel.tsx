import React from 'react';
import { AbsoluteFill, Img, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface SlideCarouselProps {
  images: string[];
}

const SlideCarousel: React.FC<SlideCarouselProps> = ({ images }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  // Entrance animation for the carousel
  const spr = spring({
    frame,
    fps,
    config: {
      damping: 15,
    },
  });

  const opacity = interpolate(spr, [0, 1], [0, 1]);
  const scale = interpolate(spr, [0, 1], [0.9, 1]);

  // Continuous horizontal slide
  const slideWidth = 600; // Expected width of each slide
  const gap = 40;
  const totalWidth = images.length * (slideWidth + gap);
  
  const translateX = interpolate(frame, [0, 1500], [0, -totalWidth]);

  return (
    <AbsoluteFill className="bg-slate-50 flex items-center justify-center overflow-hidden">
      <div 
        className="flex gap-10 whitespace-nowrap"
        style={{
          opacity,
          transform: `scale(${scale}) translateX(${translateX}px)`,
        }}
      >
        {/* We double the images for a seamless loop if needed, but for simple scroll we just map */}
        {images.map((img, i) => (
          <div 
            key={i} 
            className="w-[600px] h-[400px] bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden shrink-0 flex-none"
          >
            <Img 
              src={img} 
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

export default SlideCarousel;
