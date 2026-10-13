import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';

interface HeroCenteredProps {
  title: string;
  subtitle?: string;
}

const HeroCentered: React.FC<HeroCenteredProps> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = title.split(' ');

  const containerScale = interpolate(frame, [0, 60], [0.95, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill className="bg-white flex flex-col justify-center items-center overflow-hidden">
      <div 
        className="flex flex-col items-center"
        style={{ transform: `scale(${containerScale})` }}
      >
        <div className="flex flex-wrap justify-center gap-x-[30px] overflow-hidden py-4">
          {words.map((word, i) => {
            const spr = spring({
              frame: frame - i * 3,
              fps,
              config: {
                damping: 12,
                stiffness: 100,
                mass: 0.8,
              },
            });

            const translateY = interpolate(spr, [0, 1], [150, 0]);
            const opacity = interpolate(spr, [0, 0.5], [0, 1]);

            return (
              <span
                key={i}
                className="inline-block text-[120px] font-bold text-black tracking-tight leading-none"
                style={{
                  transform: `translateY(${translateY}px)`,
                  opacity,
                }}
              >
                {word}
              </span>
            );
          })}
        </div>

        {subtitle && (
          <div className="overflow-hidden mt-12">
            {(() => {
              const subSpr = spring({
                frame: frame - words.length * 3 - 10,
                fps,
                config: {
                  damping: 15,
                },
              });

              const subOpacity = interpolate(subSpr, [0, 1], [0, 1]);
              const subTranslateY = interpolate(subSpr, [0, 1], [20, 0]);

              return (
                <p
                  className="text-gray-500 text-4xl font-normal tracking-wide"
                  style={{
                    opacity: subOpacity,
                    transform: `translateY(${subTranslateY}px)`,
                  }}
                >
                  {subtitle}
                </p>
              );
            })()}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};

export default HeroCentered;
