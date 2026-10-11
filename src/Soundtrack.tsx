import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { SLIDE_SFX, type SoundName } from "./slides";
import { CARD_START } from "./ui";

const SFX_GAIN = 1.75;

type Timed = { start: number }[];

const Sound: React.FC<{ at: number; sound: SoundName; volume: number; rate?: number }> = ({ at, sound, volume, rate }) => (
  <Sequence from={Math.max(0, Math.round(at))} layout="none" name={`sfx:${sound}`}>
    <Audio src={staticFile(`audio/sfx/${sound}.wav`)} volume={volume * SFX_GAIN} playbackRate={rate ?? 1} />
  </Sequence>
);

// Every sound effect, placed on the global timeline. No music.
export const Soundtrack: React.FC<{ timeline: Timed }> = ({ timeline }) => (
  <>
    {timeline.map((s, i) => (
      <React.Fragment key={i}>
        {/* The card settling into place. */}
        <Sound at={s.start + CARD_START + 12} sound="land" volume={0.3} />
        {SLIDE_SFX[i].map((e, j) => (
          <Sound key={j} at={s.start + e.at} sound={e.sound} volume={e.volume} rate={e.rate} />
        ))}
      </React.Fragment>
    ))}
  </>
);
