import { ComponentType } from "react";
import BigText from "./BigText";
import FloatingCard from "./FloatingCard";
import GradientTextReveal from "./GradientTextReveal";
import HeroCentered from "./HeroCentered";
import ImageBlurToSharp from "./ImageBlurToSharp";
import ImageFullscreen from "./ImageFullscreen";
import ImageParallax from "./ImageParallax";
import ImageWithText from "./ImageWithText";
import ImageZoomFocus from "./ImageZoomFocus";
import OutroCentered from "./OutroCentered";
import SlideCarousel from "./SlideCarousel";
import SplitTextReveal from "./SplitTextReveal";
import StackCards from "./StackCards";
import TextMaskReveal from "./TextMaskReveal";
import TypingText from "./TypingText";
import WindowMockup from "./WindowMockup";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const componentRegistry: Record<string, ComponentType<any>> = {
  BigText,
  FloatingCard,
  GradientTextReveal,
  HeroCentered,
  ImageBlurToSharp,
  ImageFullscreen,
  ImageParallax,
  ImageWithText,
  ImageZoomFocus,
  OutroCentered,
  SlideCarousel,
  SplitTextReveal,
  StackCards,
  TextMaskReveal,
  TypingText,
  WindowMockup,
};
