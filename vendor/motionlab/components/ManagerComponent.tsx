import { Sequence } from "remotion";
import { componentRegistry } from "./registry";
import type { TimelineItem } from "../../schema";

export type { TimelineItem };

interface ManagerProps {
  timeline: TimelineItem[];
}

/**
 * ManagerComponent
 *
 * Accepts a `timeline` array and renders each entry as a sequential
 * <Sequence>, dynamically resolving the component via the registry.
 *
 * Unknown component names are skipped and logged as warnings.
 */
export const ManagerComponent: React.FC<ManagerProps> = ({ timeline }) => {
  let cursor = 0;

  return (
    <>
      {timeline.map((item, index) => {
        const Component = componentRegistry[item.component];
        const from = cursor;
        cursor += item.duration;

        if (!Component) {
          console.warn(
            `[ManagerComponent] Unknown component "${item.component}" at index ${index}. Skipping.`
          );
          return null;
        }

        return (
          <Sequence key={index} from={from} durationInFrames={item.duration}>
            <Component {...(item.props as Record<string, unknown>)} />
          </Sequence>
        );
      })}
    </>
  );
};
