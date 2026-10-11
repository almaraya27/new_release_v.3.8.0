import React from "react";
import { Easing, Img, interpolate, staticFile } from "remotion";
import { clamp01, ease, expoOut, lerp, pop, ramp } from "./anim";
import { C, DM_14 } from "./theme";
import {
  Box,
  Card,
  CardDots,
  CARD_LAND,
  CheckCircle,
  Chip,
  Crumb,
  Cursor,
  Disc,
  Divider,
  Eyebrow,
  Headline,
  headlineEnd,
  MailIcon,
  Rise,
  Subhead,
  Txt,
  useQa,
} from "./ui";

export type SlideProps = { frame: number };

// Shared text block. Subhead fades up ~200 ms after the headline finishes.
const Text: React.FC<{
  frame: number;
  eyebrow: string;
  headline: string[];
  headlineBaselines: number[];
  headlineSize?: number;
  headlineLs?: number;
  sub: string[];
  subBaselines: number[];
  subSize?: number;
}> = (p) => (
  <>
    <Eyebrow frame={p.frame} text={p.eyebrow} />
    <Headline
      frame={p.frame}
      lines={p.headline}
      baselines={p.headlineBaselines}
      size={p.headlineSize ?? 100}
      ls={p.headlineLs}
    />
    <Subhead
      frame={p.frame}
      start={headlineEnd(p.headline) + 6}
      lines={p.sub}
      baselines={p.subBaselines}
      size={p.subSize ?? 60.5}
    />
  </>
);

const T0 = CARD_LAND; // card contents start once the card has landed

// ---------------------------------------------------------------------------
// 1. What's new: Intake & Matters
// ---------------------------------------------------------------------------

const S1_ROWS = [
  { label: "Larchmont Cloud – Order Form", cy: 1092, base: 1109, tag: "Drafted", tx: 1204, tw: 190, ty: 1055, tb: 1106 },
  { label: "Blue Harbor – Share Purchase", cy: 1207.5, base: 1222, tag: "New", tx: 1263, tw: 131, ty: 1168, tb: 1219 },
  { label: "Northwind – NDA renewal", cy: 1322, base: 1338, tag: "Due Fri", tx: 1215, tw: 179, ty: 1284, tb: 1335 },
];

export const S1Intake: React.FC<SlideProps> = ({ frame: f }) => {
  const head = ease(f, T0, 16);
  const count = ramp(f, T0 + 4, 22, Easing.out(Easing.cubic));
  const n = (to: number) => Math.round(to * count);
  return (
    <>
      <Text
        frame={f}
        eyebrow={"WHAT’S NEW"}
        headline={["Intake & Matters"]}
        headlineBaselines={[398]}
        headlineSize={139}
        headlineLs={-0.03}
        sub={["Your legal requests arrive by email. Now", "they become organized matters."]}
        subBaselines={[542, 617]}
        subSize={65}
      />
      <CardDots cy={1262} opacity={ease(f, 14, 30)} />
      <Card frame={f} top={780} height={649}>
        <Rise t={head} dy={10}>
          <Crumb x={210} y={869} muted="Matters" strong="Intake" />
          <Box x={209} y={922} w={159} h={82} variant="outline" />
          <Txt x={288.5} y={975} size={41} align="center">{`All ${n(3)}`}</Txt>
          <Txt x={415} y={976} size={41} color={C.mutedStrong}>{`New ${n(2)}`}</Txt>
          <Txt x={575} y={976} size={41} color={C.mutedStrong}>{`Drafted ${n(1)}`}</Txt>
        </Rise>
        {S1_ROWS.map((r, i) => {
          const t = ease(f, T0 + 6 + i * 5, 18);
          const tag = pop(f, T0 + 30 + i * 4);
          const done = i === 0;
          return (
            <React.Fragment key={r.label}>
              <Rise t={t} dy={18}>
                <CheckCircle
                  cx={235.5}
                  cy={r.cy}
                  fill={done ? ease(f, T0 + 24, 12) : 0}
                  check={done ? ramp(f, T0 + 28, 12) : 0}
                />
                <Txt x={298} y={r.base} size={46.5}>
                  {r.label}
                </Txt>
              </Rise>
              <Chip
                x={r.tx}
                y={r.ty}
                w={r.tw}
                h={78}
                r={14}
                variant="outline"
                label={r.tag}
                size={38}
                baseline={r.tb}
                color={C.tagText}
                t={tag}
              />
            </React.Fragment>
          );
        })}
      </Card>
    </>
  );
};
export const S1_DUR = 149;

// ---------------------------------------------------------------------------
// 2. Matters: drafted from email
// ---------------------------------------------------------------------------

const Sparkle: React.FC<{ x: number; y: number; s: number; color: string; rot: number }> = ({ x, y, s, color, rot }) => (
  <svg
    width={s}
    height={s}
    viewBox="0 0 24 24"
    style={{ position: "absolute", left: x, top: y, transform: `rotate(${rot}deg)` }}
  >
    <path d="M12 1 C12.9 8.2 15.8 11.1 23 12 C15.8 12.9 12.9 15.8 12 23 C11.1 15.8 8.2 12.9 1 12 C8.2 11.1 11.1 8.2 12 1 Z" fill={color} />
  </svg>
);

export const S2_CLICK = 104;

export const S2Matters: React.FC<SlideProps> = ({ frame: f }) => {
  const qa = useQa();
  const crumb = ease(f, T0, 16);
  const email = ease(f, T0 + 2, 20);
  const divider = ramp(f, T0 + 12, 16);
  const proposed = ease(f, T0 + 18, 16);
  const shimmer = interpolate(f, [T0 + 20, T0 + 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });
  const title = ease(f, T0 + 24, 18);
  const chips = [0, 1, 2].map((i) => pop(f, T0 + 30 + i * 4));
  const buttons = ease(f, T0 + 40, 18);

  // Cursor glides in, clicks "Create matter", then leaves.
  const move = interpolate(f, [S2_CLICK - 22, S2_CLICK - 2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.3, 0, 0.15, 1),
  });
  const cx = lerp(1470, 1150, move) + Math.sin(move * Math.PI) * -24;
  const cy = lerp(1760, 1478, move);
  const press = interpolate(f, [S2_CLICK, S2_CLICK + 3, S2_CLICK + 10], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.quad),
  });
  const cursorOpacity = qa
    ? 0
    : interpolate(f, [S2_CLICK - 24, S2_CLICK - 16, S2_CLICK + 10, S2_CLICK + 18], [0, 1, 1, 0], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });

  const proposedColor = "#8b8c8c";
  // Highlight band sweeps left to right across the muted label.
  const band = lerp(-30, 130, shimmer);

  return (
    <>
      <Text
        frame={f}
        eyebrow="MATTERS"
        headline={["Get matters drafted from", "incoming email requests"]}
        headlineBaselines={[361, 471]}
        sub={["instaSpace reads every email request and", "proposes the matter."]}
        subBaselines={[609, 680]}
      />
      <CardDots cy={1340} opacity={ease(f, 14, 30)} />
      <Card frame={f} top={781} height={794}>
        <Rise t={crumb} dy={10}>
          <Crumb x={205} y={871} size={37.5} muted="Intake" strong="New email" />
        </Rise>
        <Rise t={email} dx={-28} dy={0}>
          <Img
            src={staticFile("avatar-dana.png")}
            style={{ position: "absolute", left: 200, top: 927, width: 108, height: 108, borderRadius: "50%" }}
          />
          <Txt x={342} y={964} size={46}>
            Dana Reyes · Larchmont Cloud
          </Txt>
          <Txt x={340} y={1022.5} size={43.5} color={C.mutedStrong}>
            Order form attached, need sign-off by Friday
          </Txt>
        </Rise>
        <Divider x={202} y={1085} w={1190} t={divider} />
        <Rise t={proposed} dy={10}>
          <Sparkle
            x={203}
            y={1139}
            s={30}
            color={proposedColor}
            rot={lerp(-90, 0, ease(f, T0 + 18, 30))}
          />
          <Txt
            x={244}
            y={1166}
            size={38}
            style={{
              color: "transparent",
              backgroundImage: `linear-gradient(100deg, ${proposedColor} ${band - 22}%, #1d1d1d ${band}%, ${proposedColor} ${band + 22}%)`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              paddingBottom: 10,
            }}
          >
            Proposed matter
          </Txt>
        </Rise>
        <Rise t={title} dy={14}>
          <Txt x={206} y={1246} size={54} weight={600}>
            Larchmont Cloud – Order Form
          </Txt>
        </Rise>
        <Chip x={203} y={1299} w={380} h={81} label="Larchmont Cloud" size={38} baseline={1351} t={chips[0]} />
        <Chip x={598} y={1299} w={393} h={81} label="Order form review" size={38} baseline={1351} t={chips[1]} />
        <Chip x={1008} y={1299} w={267} h={81} label="Due Sep 18" size={38} baseline={1351} t={chips[2]} />
        <Rise t={buttons} dy={14}>
          <Box x={202} y={1423} w={584} h={98} variant="button" />
          <Txt x={494} y={1485.5} size={41} align="center">
            Edit
          </Txt>
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              transformOrigin: "1100.5px 1472px",
              transform: `scale(${1 - 0.04 * press})`,
            }}
          >
            <Box x={809} y={1423} w={583} h={98} variant="black" />
            <Txt x={1100.5} y={1485.5} size={41} color="#fff" weight={500} align="center">
              Create matter
            </Txt>
          </div>
        </Rise>
        <Cursor x={cx} y={cy} scale={1 - 0.1 * press} opacity={cursorOpacity} />
      </Card>
    </>
  );
};
export const S2_DUR = 181;

// ---------------------------------------------------------------------------
// 3. Brief
// ---------------------------------------------------------------------------

const S3_LINES = ["Three-year auto-renewal, liability capped at three", "months’ fees, $96,000 a year."];
const S3_TYPE_START = T0 + 2;
const S3_CPS = 3.1; // characters per frame

const Typed: React.FC<{ x: number; y: number; size: number; text: string; shown: number; caret: boolean }> = ({
  x,
  y,
  size,
  text,
  shown,
  caret,
}) => (
  <Txt x={x} y={y} size={size}>
    <span>{text.slice(0, shown)}</span>
    {caret ? (
      <span
        style={{
          display: "inline-block",
          width: 3,
          height: size * 0.95,
          marginLeft: 2,
          marginRight: -5,
          verticalAlign: "-0.17em",
          background: C.ink,
        }}
      />
    ) : null}
    <span style={{ color: "transparent" }}>{text.slice(shown)}</span>
  </Txt>
);

export const S3Brief: React.FC<SlideProps> = ({ frame: f }) => {
  const crumb = ease(f, T0, 16);
  const typed = Math.max(0, Math.floor((f - S3_TYPE_START) * S3_CPS));
  const l1 = S3_LINES[0].length;
  const total = l1 + S3_LINES[1].length;
  const typing = typed > 0 && typed < total + 6;
  const chips = [0, 1, 2].map((i) => pop(f, T0 + 28 + i * 4));
  const divider = ramp(f, T0 + 36, 16);
  const row1 = ease(f, T0 + 40, 18);
  const row2 = ease(f, T0 + 44, 18);
  return (
    <>
      <Text
        frame={f}
        eyebrow="BRIEF"
        headline={["See the whole", "deal on one page"]}
        headlineBaselines={[361, 471]}
        sub={["Summary, deadlines, and what needs you, flagged."]}
        subBaselines={[609]}
      />
      <CardDots cy={1300} opacity={ease(f, 14, 30)} />
      <Card frame={f} top={780} height={692}>
        <Rise t={crumb} dy={10}>
          <Crumb x={213} y={868} muted="Matters" strong="Larchmont Cloud" />
        </Rise>
        <Typed x={212} y={963.5} size={44.8} text={S3_LINES[0]} shown={Math.min(typed, l1)} caret={typing && typed <= l1} />
        <Typed
          x={212}
          y={1029.5}
          size={44.8}
          text={S3_LINES[1]}
          shown={clamp01((typed - l1) / S3_LINES[1].length) * S3_LINES[1].length}
          caret={typing && typed > l1}
        />
        <Chip x={212} y={1090} w={269} h={81} label="Order form" size={38} baseline={1143} t={chips[0]} />
        <Chip x={496} y={1090} w={305} h={81} label="New York law" size={38} baseline={1143} t={chips[1]} />
        <Chip x={818} y={1090} w={257} h={81} label="Sign by Fri" size={38} baseline={1143} t={chips[2]} />
        <Divider x={211} y={1216} w={1181} t={divider} />
        <Rise t={row1} dy={14}>
          <CheckCircle cx={238.5} cy={1284.5} fill={0} check={0} />
          <Txt x={301} y={1300.5} size={43.4}>
            Review order form
          </Txt>
          <Txt x={1388} y={1296} size={35.2} color={C.mutedStrong} align="end">
            in 5 days
          </Txt>
        </Rise>
        <Rise t={row2} dy={14}>
          <CheckCircle cx={238.5} cy={1377.5} fill={ease(f, T0 + 52, 12)} check={ramp(f, T0 + 56, 12)} />
          <Txt x={301} y={1391.5} size={43.4}>
            Liability cap checked
          </Txt>
          <Txt x={1389} y={1389} size={35.5} color={C.mutedStrong} align="end" style={{ opacity: ease(f, T0 + 58, 14) }}>
            Done
          </Txt>
        </Rise>
      </Card>
    </>
  );
};
export const S3_DUR = 165;

// ---------------------------------------------------------------------------
// 4. Assistant
// ---------------------------------------------------------------------------

const S4_ANSWER = ["Lead with the liability cap. Keep auto-renewal as the", "fallback under GOL § 5-903."];
const S4_TYPING = T0 + 20;
const S4_STREAM = T0 + 34;
const S4_WORD = 1.4;

export const S4Assistant: React.FC<SlideProps> = ({ frame: f }) => {
  const crumb = ease(f, T0, 16);
  const bubble = ease(f, T0 + 2, 22);
  const avatar = pop(f, T0 + 16, 18);
  const typingIn = ease(f, S4_TYPING, 8);
  const typingOut = 1 - ease(f, S4_STREAM - 4, 8);
  let wordIndex = 0;
  const wordCount = S4_ANSWER.join(" ").split(" ").length;
  const chipStart = S4_STREAM + wordCount * S4_WORD + 6;
  return (
    <>
      <Text
        frame={f}
        eyebrow="ASSISTANT"
        headline={["An AI assistant that", "already knows the deal"]}
        headlineBaselines={[361, 471]}
        sub={["Chat from inside a matter. It already has the", "brief, documents, and history."]}
        subBaselines={[609, 680]}
      />
      <CardDots cy={1250} opacity={ease(f, 14, 30)} />
      <Card frame={f} top={785} height={585}>
        <Rise t={crumb} dy={10}>
          <Crumb x={206} y={873} size={35.5} muted="Assistant" strong="Larchmont Cloud – Order Form" />
        </Rise>
        <Rise t={bubble} dx={70} dy={0}>
          <Box x={531} y={925} w={864} h={109} variant="chip" />
          <Txt x={575} y={992.5} size={40.7}>
            Which clause should I push back on first?
          </Txt>
        </Rise>
        <Disc cx={239.5} cy={1111.5} d={70} dot={16} t={avatar} />
        {/* Typing indicator */}
        <div style={{ position: "absolute", left: 0, top: 0, opacity: typingIn * typingOut }}>
          {[0, 1, 2].map((i) => {
            const wave = 0.5 + 0.5 * Math.sin(((f - S4_TYPING) / 14) * Math.PI * 2 - i * 1.1);
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  left: 312 + i * 26,
                  top: 1106 - wave * 5,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: C.ink,
                  opacity: lerp(0.22, 0.6, wave),
                }}
              />
            );
          })}
        </div>
        {S4_ANSWER.map((line, li) => (
          <Txt key={li} x={311} y={li === 0 ? 1122.4 : 1188} size={42}>
            {line.split(" ").map((w, wi, arr) => {
              const t = ease(f, S4_STREAM + wordIndex++ * S4_WORD, 10);
              return (
                <React.Fragment key={wi}>
                  <span
                    style={{
                      opacity: t,
                      filter: t < 0.999 ? `blur(${(1 - t) * 5}px)` : undefined,
                      display: "inline-block",
                      transform: `translateY(${(1 - t) * 6}px)`,
                    }}
                  >
                    {w}
                  </span>
                  {wi < arr.length - 1 ? " " : null}
                </React.Fragment>
              );
            })}
          </Txt>
        ))}
        <Chip x={309} y={1240} w={144} h={76} label="Brief" size={35.5} baseline={1289} t={pop(f, chipStart)} />
        <Chip
          x={470}
          y={1240}
          w={313}
          h={76}
          label="Order form.pdf"
          size={35.5}
          baseline={1289}
          t={pop(f, chipStart + 4)}
        />
      </Card>
    </>
  );
};
export const S4_DUR = 177;

// ---------------------------------------------------------------------------
// 5. Rules
// ---------------------------------------------------------------------------

// Quick, well-damped "snap" for building the rule.
const snap = (f: number, start: number) => pop(f, start, 14);

export const S5Rules: React.FC<SlideProps> = ({ frame: f }) => {
  const crumb = ease(f, T0, 16);
  const s = (k: number) => snap(f, T0 + 2 + k * 4);
  const fill = ease(f, T0 + 28, 12);
  const divider = ramp(f, T0 + 40, 16);
  const row1 = ease(f, T0 + 44, 18);
  const row2 = ease(f, T0 + 49, 18);
  const pillText = interpolate(fill, [0, 1], [0, 1]);
  const ink = Math.round(lerp(0x2c, 0xff, pillText));
  const label = (k: number): React.CSSProperties => ({
    opacity: clamp01(s(k) * 1.5),
    transform: `translateX(${(1 - s(k)) * -14}px)`,
  });
  return (
    <>
      <Text
        frame={f}
        eyebrow="RULES"
        headline={["Let routine requests", "execute themselves"]}
        headlineBaselines={[361, 471]}
        sub={["Write a rule once, and matters open on their", "own, with your reviewers notified."]}
        subBaselines={[609, 680]}
      />
      <CardDots cy={1300} opacity={ease(f, 14, 30)} />
      <Card frame={f} top={781} height={705}>
        <Rise t={crumb} dy={10}>
          <Crumb x={210} y={871} size={36.5} muted="Rules" strong="Standard SaaS renewals" />
        </Rise>
        <Txt x={209} y={974} size={31} weight={500} ls={0.06} color={C.soft} style={label(0)}>
          WHEN
        </Txt>
        <Chip x={354} y={923} w={251} h={81} label="Your team" size={38} baseline={975.5} t={s(1)} />
        <Txt x={627} y={976} size={41} color={C.muted} style={label(2)}>
          sends a
        </Txt>
        <Chip x={793} y={923} w={303} h={81} label="SaaS renewal" size={38} baseline={975.5} t={s(3)} />
        <Txt x={209} y={1077} size={31} weight={500} ls={0.06} color={C.soft} style={label(4)}>
          THEN
        </Txt>
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <Chip
            x={356}
            y={1027}
            w={411}
            h={81}
            label="Open automatically"
            size={38.3}
            baseline={1080}
            t={s(5)}
            color={`rgb(${ink},${ink},${ink})`}
          />
          {/* Black fill sweeps in over the grey chip. */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: 1600,
              height: 2000,
              opacity: s(5),
              transformOrigin: "561.5px 1067.5px",
              transform: `translateY(${(1 - s(5)) * 10}px) scale(${lerp(0.88, 1, s(5))})`,
              clipPath: `inset(0 ${1600 - lerp(356, 767, fill)}px 0 0)`,
            }}
          >
            <Box x={356} y={1027} w={411} h={81} variant="black" />
            <Txt x={561.5} y={1080} size={38.3} color="#fff" align="center">
              Open automatically
            </Txt>
          </div>
        </div>
        <Txt x={800} y={1081} size={38} color={C.muted} align="center" style={label(6)}>
          +
        </Txt>
        <Chip x={832} y={1027} w={356} h={81} label="Notify reviewers" size={38} baseline={1080.5} t={s(7)} />
        <Divider x={211} y={1153.5} w={1181} t={divider} />
        <Rise t={row1} dy={14}>
          <CheckCircle cx={236} cy={1241} fill={ease(f, T0 + 54, 12)} check={ramp(f, T0 + 58, 12)} />
          <Txt x={298} y={1231} size={43.7}>
            Larchmont Cloud – SaaS renewal
          </Txt>
          <Txt x={297} y={1281.5} size={36} color={C.soft}>
            From your team · reviewers notified
          </Txt>
        </Rise>
        <Txt x={1390} y={1252.5} size={36} color={C.muted} align="end" style={{ opacity: ease(f, T0 + 62, 14) }}>
          Opened
        </Txt>
        <Rise t={row2} dy={14}>
          <CheckCircle cx={236} cy={1378.5} fill={0} check={0} />
          <Txt x={298} y={1367} size={43.7}>
            Blue Harbor – Custom MSA
          </Txt>
          <Txt x={297} y={1419} size={36} color={C.soft}>
            From outside your team
          </Txt>
          <Box x={1105} y={1339} w={290} h={79} r={14} variant="outline" />
          <Txt x={1250} y={1390.6} size={38} color={C.tagText} align="center">
            Waits for you
          </Txt>
        </Rise>
      </Card>
    </>
  );
};
export const S5_DUR = 173;

// ---------------------------------------------------------------------------
// 6. Try it today
// ---------------------------------------------------------------------------

export const S6Try: React.FC<SlideProps> = ({ frame: f }) => {
  const fwd = ease(f, T0 + 2, 20);
  const icon = pop(f, T0 + 2, 18);
  const line = ramp(f, T0 + 16, 14, expoOut);
  const drafted = ease(f, T0 + 28, 18);
  const disc = pop(f, T0 + 28, 18);
  const now = ease(f, T0 + 36, 14);
  const cta1 = pop(f, T0 + 46, 26);
  const cta2 = pop(f, T0 + 51, 26);
  const ctaStyle = (t: number, ox: number): React.CSSProperties => ({
    position: "absolute",
    left: 0,
    top: 0,
    opacity: clamp01(t * 1.6),
    transformOrigin: `${ox}px 1449px`,
    transform: `translateY(${(1 - t) * 26}px) scale(${lerp(0.92, 1, t)})`,
  });
  return (
    <>
      <Text
        frame={f}
        eyebrow="TRY IT TODAY"
        headline={["Try it with your emails"]}
        headlineBaselines={[463]}
        headlineSize={128}
        headlineLs={-0.024}
        sub={["Forward a real request to your intake address", "and see the matter it drafts."]}
        subBaselines={[609, 678]}
      />
      <CardDots cy={1268} rx={900} ry={330} opacity={ease(f, 14, 30)} />
      <Card frame={f} top={780} height={446}>
        <MailIcon cx={248.5} cy={903.5} t={icon} />
        <Rise t={fwd} dx={-20} dy={0}>
          <Txt x={327} y={889} size={42}>
            Fwd: Order form, need sign-off
          </Txt>
          <Txt x={325} y={946} size={35} color={C.soft}>
            You forwarded a client email
          </Txt>
        </Rise>
        <div
          style={{
            position: "absolute",
            left: 246,
            top: 980,
            width: 3,
            height: 48,
            background: "#d6d8d7",
            transformOrigin: "50% 0",
            transform: `scaleY(${line})`,
          }}
        />
        <Disc cx={248} cy={1104.5} d={75} dot={16} t={disc} />
        <Rise t={drafted} dx={-20} dy={0}>
          <Txt x={327} y={1095} size={42.5}>
            Matter drafted
          </Txt>
          <Txt x={326} y={1147} size={35} color={C.soft}>
            Larchmont Cloud – Order Form
          </Txt>
        </Rise>
        <Txt x={1387} y={1113} size={31} color={C.soft} align="end" style={{ opacity: now }}>
          Just now
        </Txt>
      </Card>
      <div style={ctaStyle(cta1, 536)}>
        <Box x={149} y={1392} w={774} h={115} r={40} variant="cta" />
        <Txt x={536} y={1466} size={57} color="#fff" align="center" opsz={DM_14}>
          Start free at <span style={{ fontWeight: 700 }}>instaSpace.ai</span>
        </Txt>
      </div>
      <div style={ctaStyle(cta2, 1189)}>
        <Box x={975} y={1392} w={429} h={115} r={40} variant="cta" />
        <Txt x={1189.5} y={1466} size={57.5} color="#fff" align="center">
          Book a demo
        </Txt>
      </div>
    </>
  );
};
export const S6_DUR = 170;

export const SLIDES = [
  { id: "intake", C: S1Intake, dur: S1_DUR },
  { id: "matters", C: S2Matters, dur: S2_DUR },
  { id: "brief", C: S3Brief, dur: S3_DUR },
  { id: "assistant", C: S4Assistant, dur: S4_DUR },
  { id: "rules", C: S5Rules, dur: S5_DUR },
  { id: "try", C: S6Try, dur: S6_DUR },
] as const;

// ---------------------------------------------------------------------------
// Sound effects, in each slide's local frames. Keyed off the same constants as
// the animations above so they stay in sync when timing changes.
// ---------------------------------------------------------------------------

export type SoundName = "land" | "tap" | "click" | "msg" | "insight";
export type Sfx = { at: number; sound: SoundName; volume: number; rate?: number };

const S4_CHIPS = S4_STREAM + S4_ANSWER.join(" ").split(" ").length * S4_WORD + 6;

// Deliberately sparse: one sound per meaningful moment, not per element.
export const SLIDE_SFX: Sfx[][] = [
  // 1. Intake & Matters: tags arrive.
  [
    { at: T0 + 31, sound: "tap", volume: 0.4 },
  ],
  // 2. Matters: email arrives, the matter is proposed, cursor clicks.
  [
    { at: T0 + 3, sound: "msg", volume: 0.4 },
    { at: T0 + 16, sound: "insight", volume: 0.42 },
    { at: S2_CLICK, sound: "click", volume: 0.6 },
  ],
  // 3. Brief: chips arrive.
  [
    { at: T0 + 29, sound: "tap", volume: 0.4 },
  ],
  // 4. Assistant: question sent, answer arrives, sources land.
  [
    { at: T0 + 3, sound: "msg", volume: 0.4 },
    { at: S4_STREAM, sound: "msg", volume: 0.4, rate: 0.9 },
    { at: Math.round(S4_CHIPS) + 1, sound: "tap", volume: 0.4 },
  ],
  // 5. Rules: the four rule pieces settle.
  [
    ...[1, 3, 5, 7].map((k): Sfx => ({ at: T0 + 3 + k * 4, sound: "tap", volume: 0.32 })),
  ],
  // 6. Try it today: email in, matter drafted, CTAs.
  [
    { at: T0 + 3, sound: "msg", volume: 0.4 },
    { at: T0 + 29, sound: "msg", volume: 0.4, rate: 0.9 },
    { at: T0 + 47, sound: "tap", volume: 0.4 },
  ],
];
