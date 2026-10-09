import React from "react";
import { Composition } from "remotion";
import { Compare, Main, TOTAL_FRAMES } from "./Main";
import { DESIGN_H, DESIGN_W, FPS, VIDEO_H, VIDEO_W } from "./theme";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Main"
      component={Main}
      width={VIDEO_W}
      height={VIDEO_H}
      fps={FPS}
      durationInFrames={TOTAL_FRAMES}
    />
    <Composition
      id="Compare"
      component={Compare}
      width={DESIGN_W}
      height={DESIGN_H}
      fps={FPS}
      durationInFrames={1}
      defaultProps={{ slide: 0 }}
    />
  </>
);
