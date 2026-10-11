import React from "react";
import { Audio, getInputProps, Sequence, staticFile } from "remotion";
import { SLIDE_SFX, type SoundName } from "./slides";

// Faint jazz bed: kept well under the effects (about 15 dB below them).
export const MUSIC_VOLUME = 0.2;
const SFX_GAIN = 2.2; // +2 dB over the previous 1.75

// QA: render a single stem with --props='{"stem":"music"}' or '{"stem":"sfx"}'.
const stem = (getInputProps() as { stem?: "music" | "sfx" }).stem;

type Timed = { start: number }[];

const Sound: React.FC<{ at: number; sound: SoundName; volume: number; rate?: number }> = ({ at, sound, volume, rate }) => (
  <Sequence from={Math.max(0, Math.round(at))} layout="none" name={`sfx:${sound}`}>
    <Audio src={staticFile(`audio/sfx/${sound}.wav`)} volume={volume * SFX_GAIN} playbackRate={rate ?? 1} />
  </Sequence>
);

// Faint jazz bed plus every sound effect, placed on the global timeline.
export const Soundtrack: React.FC<{ timeline: Timed }> = ({ timeline }) => (
  <>
    {stem !== "sfx" ? <Audio src={staticFile("audio/music.wav")} volume={MUSIC_VOLUME} /> : null}
    {stem !== "music" && timeline.map((s, i) => (
      <React.Fragment key={i}>
        {SLIDE_SFX[i].map((e, j) => (
          <Sound key={j} at={s.start + e.at} sound={e.sound} volume={e.volume} rate={e.rate} />
        ))}
      </React.Fragment>
    ))}
  </>
);
