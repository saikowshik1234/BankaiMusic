/**
 * Circular speaker grille, bottom-right of the deck. Perforated dot pattern.
 */
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const SIZE = 78;
const INSET = 9;

function dots(): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const step = 6;
  const r = SIZE / 2 - INSET;
  const c = SIZE / 2;
  for (let y = -r; y <= r; y += step) {
    for (let x = -r; x <= r; x += step) {
      if (Math.sqrt(x * x + y * y) <= r - 2) pts.push({ x: c + x, y: c + y });
    }
  }
  return pts;
}

const DOTS = dots();

export function SpeakerGrille() {
  return (
    <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
      <Defs>
        <RadialGradient id="grille" cx="40%" cy="34%" r="70%">
          <Stop offset="0%" stopColor="#F4F4F4" />
          <Stop offset="100%" stopColor="#E2E2E2" />
        </RadialGradient>
      </Defs>
      <Circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} fill="url(#grille)" />
      {DOTS.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={0.9} fill="rgba(0,0,0,0.62)" />
      ))}
    </Svg>
  );
}
