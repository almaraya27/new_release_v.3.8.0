import React from "react";
import { Audio, getInputProps, Sequence, staticFile } from "remotion";
import { SLIDE_SFX, type SoundName } from "./slides";
import { CARD_START } from "./ui";

export const MUSIC_VOLUME = 0.85;

// QA: render a single stem with --props='{"stem":"music"}' or '{"stem":"sfx"}'.
const stem = (getInputProps() as { stem?: "music" | "sfx" }).stem;
const SFX_GAIN = 1;

type Timed = { start: number }[];

const Sound: React.FC<{ at: number; sound: SoundName; volume: number; rate?: number }> = ({ at, sound, volume, rate }) => (
  <Sequence from={Math.max(0, Math.round(at))} layout="none" name={`sfx:${sound}`}>
    <Audio src={staticFile(`audio/sfx/${sound}.wav`)} volume={volume * SFX_GAIN} playbackRate={rate ?? 1} />
  </Sequence>
);

// Music bed plus every sound effect, placed on the global timeline.
export const Soundtrack: React.FC<{ timeline: Timed; exit: number; overlap: number }> = ({ timeline, exit, overlap }) => (
  <>
    {stem !== "sfx" ? <Audio src={staticFile("audio/music.wav")} volume={MUSIC_VOLUME} /> : null}
    {stem !== "music" && timeline.map((s, i) => (
      <React.Fragment key={i}>
        {/* Soft whoosh as the previous slide drifts out and this one comes in. */}
        {i > 0 ? <Sound at={s.start + overlap - exit - 2} sound="whoosh" volume={0.3} /> : null}
        {/* The card settling into place. */}
        <Sound at={s.start + CARD_START + 12} sound="land" volume={0.3} />
        {SLIDE_SFX[i].map((e, j) => (
          <Sound key={j} at={s.start + e.at} sound={e.sound} volume={e.volume} rate={e.rate} />
        ))}
      </React.Fragment>
    ))}
  </>
);
