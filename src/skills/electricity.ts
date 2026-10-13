/**
 * Region 9 — Sparkwick Junkyard: an intuitive feel for electricity, then Ohm's law.
 *
 * The picture we use everywhere: electrons are crying babies piled up at the − end of the
 * battery; the + end is full of Nanny Ions they desperately want to crawl to. They can't go
 * through the battery, so they crawl the long way round, through the wire.
 *   - voltage (V)    = how hard the babies are pushed (how high the water tank is)
 *   - current (A)    = how many babies pass a spot each second (how much water flows)
 *   - resistance (Ω) = how tight and muddy the tunnel is (how narrow the pipe is)
 *   - Ohm's law      = current = voltage ÷ resistance, so V = I × R
 *
 * Stumbling blocks targeted here:
 *  - one wire is enough / a gap far from the bulb doesn't matter (you need a full loop).
 *  - the bulb "uses up" current (no: the same current flows all the way round).
 *  - a backwards battery just stops pushing (no: it pushes the other way and cancels one).
 *  - counting batteries instead of volts; mixing up volts, amps and ohms.
 *  - Ohm's law upside down: I = V × R or I = R ÷ V.
 */
import type { CircuitPic, Generator } from './types';
import { choice, clean, fmt, numeric } from './util';

const r = String.raw;

export const AA = 1.5;
const V = (v: number) => r`${fmt(v)}\,\text{V}`;
const A = (v: number) => r`${fmt(v)}\,\text{A}`;
const O = (v: number) => r`${fmt(v)}\,\Omega`;

/** Volts, ohms and amps for a circuit picture. Shared with the circuit widget. */
export function circuitState(c: CircuitPic): {
  volts: number;
  ohms: number;
  amps: number;
  closed: boolean;
  reversed: boolean;
} {
  const net = c.cells - 2 * (c.flipped ?? 0);
  const volts = clean(Math.abs(net) * (c.volts ?? AA));
  const ohms = clean((c.ohms ?? 3) + (c.mud ?? 0) * (c.mudOhms ?? 3));
  const closed = !c.gap && !c.sameEnd;
  const amps = closed && volts > 0 ? clean(volts / ohms) : 0;
  return { volts, ohms, amps, closed, reversed: net < 0 };
}

// ---------------------------------------------------------------------------
// closed-loop — the babies need a complete road back to Nanny

export const closedLoop: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['pic', 'pic', 'where']
      : level === 2
        ? ['pic', 'pic', 'why', 'where']
        : ['pic', 'why', 'switch'];
  const kind = rng.pick(kinds);
  if (kind === 'pic') {
    const variants: { atom: string; pic: CircuitPic; lit: boolean; nudge: string }[] = [
      {
        atom: 'loop',
        pic: { kind: 'circuit', cells: 2 },
        lit: true,
        nudge: `Follow the wire from − all the way round to +. Is there any break?`,
      },
      {
        atom: 'gap',
        pic: { kind: 'circuit', cells: 2, gap: true },
        lit: false,
        nudge: `Look for a gap in the wire! Baby electrons can't jump across thin air.`,
      },
      {
        atom: 'same-end',
        pic: { kind: 'circuit', cells: 2, sameEnd: true },
        lit: false,
        nudge: `Both wires go to the **same** end of the battery. The babies never get round to Nanny on the other end!`,
      },
    ];
    if (level >= 2) {
      variants.push(
        {
          atom: 'cancel',
          pic: { kind: 'circuit', cells: 2, flipped: 1 },
          lit: false,
          nudge: `One battery is backwards! It pushes the other way, so the two pushes cancel out.`,
        },
        {
          atom: 'net-push',
          pic: { kind: 'circuit', cells: 3, flipped: 1 },
          lit: true,
          nudge: `Two push one way, one pushes back: there's still one battery's worth of push left.`,
        },
      );
    }
    const v = rng.pick(variants);
    const load = rng.pick(['bulb', 'motor'] as const);
    const pic = { ...v.pic, load };
    const yes = load === 'bulb' ? 'It lights up 💡' : 'The motor spins 🌀';
    const no = load === 'bulb' ? 'It stays dark' : 'The motor stays still';
    return {
      skill: 'closed-loop',
      atoms: [v.atom],
      prompt: `Will this ${load === 'bulb' ? 'bulb light up' : 'motor spin'}?`,
      visual: pic,
      answer: { kind: 'choice', options: [yes, no], correct: v.lit ? 0 : 1 },
      nudges: [{ match: v.lit ? 1 : 0, text: v.nudge }],
      explain: v.lit
        ? `There's a complete loop from − to +, with some push left over, so the babies flow through the ${load}.`
        : `${v.nudge} No flow, nothing happens.`,
    };
  }
  if (kind === 'where') {
    const ch = choice(rng, `To the + end, where the Nanny Ions are`, [
      {
        text: `Into the bulb, to get eaten`,
        nudge: `The bulb doesn't eat them! They squeeze through it and keep going.`,
      },
      {
        text: `Back into the − end`,
        nudge: `They're running *away* from the crowded − end. Where's Nanny?`,
      },
      `Out of the wire, into the air`,
    ]);
    return {
      skill: 'closed-loop',
      atoms: ['where'],
      prompt: `Baby electrons pour out of the − end of the battery. Where are they trying to get to?`,
      ...ch,
      explain: `They crawl through the wire, all the way round the loop, to the + end of the battery where the Nanny Ions are waiting.`,
    };
  }
  if (kind === 'why') {
    const ch = choice(rng, `The loop is broken, so no babies can get round — anywhere`, [
      {
        text: `The electricity leaks out of the cut`,
        nudge: `Electrons don't dribble out of wires like water from a hose. They just stop — everywhere at once.`,
      },
      {
        text: `The cut is too far away to matter, so it still works`,
        nudge: `Any break, anywhere in the loop, stops the whole flow.`,
      },
      `The battery gets scared`,
    ]);
    return {
      skill: 'closed-loop',
      atoms: ['break-anywhere'],
      prompt: `Sprocket snips the wire on the far side of the battery, nowhere near the bulb. The bulb goes out. Why?`,
      ...ch,
      explain: `Electrons only flow if there's a complete loop from − back to +. One break anywhere and the whole crawl stops.`,
    };
  }
  const ch = choice(rng, `A drawbridge in the wire: open makes a gap, closed makes a loop`, [
    {
      text: `A tap that fills the wire up with electrons`,
      nudge: `The wire is always full of electrons. The switch just opens or closes the road.`,
    },
    {
      text: `A tiny extra battery`,
      nudge: `A switch doesn't push anything — it just connects or breaks the loop.`,
    },
    `A place where electrons get stored for later`,
  ]);
  return {
    skill: 'closed-loop',
    atoms: ['switch'],
    prompt: `What does a switch really do?`,
    ...ch,
    explain: `A switch is a drawbridge: flip it open and there's a gap (no flow); close it and the loop is complete again.`,
  };
};

// ---------------------------------------------------------------------------
// volts — the push. AA = 1.5 V; nose-to-tail cells add up; backwards ones cancel one.

export const volts: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['stack', 'stack', 'compare']
      : level === 2
        ? ['stack', 'flip', 'howmany']
        : ['flip', 'howmany', 'stack'];
  const kind = rng.pick(kinds);
  if (kind === 'stack') {
    const n = rng.int(2, level === 1 ? 4 : 8);
    return {
      skill: 'volts',
      atoms: ['stack'],
      prompt: `${n} AA batteries, nose to tail. Each one pushes with $${V(AA)}$. How many volts of push altogether?`,
      visual: { kind: 'circuit', cells: n, load: 'motor', readout: false },
      ...numeric(clean(n * AA), [
        [n, `That's how many batteries. Each one gives $${V(AA)}$ of push!`],
        [AA, `Nose to tail, the pushes stack up! Add them all.`],
      ]),
      hint: r`$${n} \times 1.5$. Tip: two AAs make $${V(3)}$.`,
      explain: r`Each AA adds $${V(AA)}$: $${n} \times 1.5 = ${fmt(n * AA)}$ volts.`,
    };
  }
  if (kind === 'flip') {
    const n = rng.int(3, 6);
    const f = rng.int(1, Math.floor((n - 1) / 2));
    const net = clean((n - 2 * f) * AA);
    return {
      skill: 'volts',
      atoms: ['flip'],
      prompt: `${n} AAs, but Nugget put ${f === 1 ? 'one' : f} in **backwards**! How many volts of push are left?`,
      visual: { kind: 'circuit', cells: n, flipped: f, load: 'motor', readout: false },
      ...numeric(net, [
        [clean(n * AA), `A backwards battery doesn't push forwards — it pushes the *other way*.`],
        [
          clean((n - f) * AA),
          `Sneaky: a backwards battery doesn't just stop. It pushes back and cancels a good one too!`,
        ],
      ]),
      hint: `Each backwards battery cancels out one forwards battery.`,
      explain: r`${n - f} push forwards, ${f} push${f === 1 ? 'es' : ''} back. ${n - f} − ${f} = ${n - 2 * f} batteries' worth: $${n - 2 * f} \times 1.5 = ${fmt(net)}$ volts.`,
    };
  }
  if (kind === 'howmany') {
    const k = rng.int(2, 8);
    const target = clean(k * AA);
    return {
      skill: 'volts',
      atoms: ['howmany'],
      prompt: `Nugget's motor wants $${V(target)}$ of push. How many AAs do you stack?`,
      ...numeric(k, [
        [clean(target * AA), `Divide, don't multiply: how many $1.5$s fit into ${fmt(target)}?`],
        [target, `Each AA is only $${V(AA)}$, not 1 volt.`],
      ]),
      hint: `Two AAs make 3 V. Count up in 1.5s.`,
      explain: r`$${fmt(target)} \div 1.5 = ${k}$ batteries.`,
    };
  }
  const big = rng.pick([4.5, 6, 9, 12]);
  const ch = choice(rng, `The $${V(big)}$ battery`, [
    { text: `The $${V(AA)}$ AA`, nudge: `More volts = more push. Which number is bigger?` },
    {
      text: `They push the same — a battery is a battery`,
      nudge: `Nope! The volts tell you how hard it pushes.`,
    },
  ]);
  return {
    skill: 'volts',
    atoms: ['compare'],
    prompt: `Which battery pushes the baby electrons **harder**?`,
    ...ch,
    explain: `Volts measure push — like how high the water tank is. $${V(big)}$ is a much taller tank than $${V(AA)}$.`,
  };
};

// ---------------------------------------------------------------------------
// current — babies per second, the same all the way round

export const current: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['same', 'meaning', 'rate']
      : level === 2
        ? ['same', 'rate', 'rate', 'meaning']
        : ['rate', 'same'];
  const kind = rng.pick(kinds);
  if (kind === 'same') {
    const i = rng.int(1, level === 1 ? 3 : 6);
    const where = rng.pick([
      'comes out the other side of the bulb',
      'flows back into the + end of the battery',
      'flows through the wire after the motor',
    ]);
    return {
      skill: 'current',
      atoms: ['same'],
      prompt: `$${A(i)}$ of current flows into the bulb. How much ${where}?`,
      ...numeric(i, [
        [0, `The bulb doesn't eat electrons! Every baby that goes in comes out.`],
        [i / 2, `None get used up — the babies just squeeze through (and get a bit sweaty).`],
        [i - 1, `None get used up — every baby that goes in comes out.`],
      ]),
      explain: `In one loop the current is the same everywhere: $${A(i)}$ in, $${A(i)}$ out. The bulb uses up the *push*, not the babies.`,
    };
  }
  if (kind === 'meaning') {
    const ch = choice(rng, `How many baby electrons pass a spot each second`, [
      {
        text: `How hard the babies are pushed`,
        nudge: `That's voltage — the push. Current is about *how many* go past.`,
      },
      {
        text: `How narrow and muddy the wire is`,
        nudge: `That's resistance — the squeeze. Current is about *how many* go past.`,
      },
      `How old the battery is`,
    ]);
    return {
      skill: 'current',
      atoms: ['meaning'],
      prompt: `Current (measured in amps) tells you…`,
      ...ch,
      explain: `Current is the flow: how many babies crawl past a spot every second — like how many buckets of water pour out of a pipe each second.`,
    };
  }
  const amps = rng.int(1, level === 3 ? 9 : 5);
  const secs = rng.int(2, level === 3 ? 10 : 5);
  const crowds = amps * secs;
  return {
    skill: 'current',
    atoms: ['rate'],
    prompt: `The gnome at the gate counts ${crowds} crowds of baby electrons in ${secs} seconds. One crowd per second is 1 amp. What's the current?`,
    ...numeric(amps, [
      [crowds, `That's crowds in ${secs} seconds. We want crowds **per second**.`],
      [crowds * secs, `Divide by the seconds, don't multiply.`],
    ]),
    hint: `Share the ${crowds} crowds out over ${secs} seconds.`,
    explain: r`$${crowds} \div ${secs} = ${amps}$ crowds per second, so $${A(amps)}$. (A crowd — a *coulomb* — is about 6 billion billion electrons!)`,
  };
};

// ---------------------------------------------------------------------------
// resistance — the squeeze. Tunnels in a row add up; more ohms, less flow.

export const resistance: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['meaning', 'compare', 'sum']
      : level === 2
        ? ['sum', 'compare', 'meaning']
        : ['sum', 'double', 'compare'];
  const kind = rng.pick(kinds);
  if (kind === 'sum') {
    const n = level === 1 ? 2 : rng.int(2, 3);
    const parts = Array.from({ length: n }, () => rng.int(1, level === 3 ? 12 : 6));
    const total = parts.reduce((a, b) => a + b, 0);
    return {
      skill: 'resistance',
      atoms: ['sum'],
      prompt: `The babies must squeeze through ${n} mud tunnels in a row: ${parts.map((p) => `$${O(p)}$`).join(', ')}. What's the total resistance?`,
      ...numeric(total, [
        [
          Math.max(...parts),
          `They have to get through **every** tunnel, one after another. Add them all.`,
        ],
        [parts.reduce((a, b) => a * b, 1), `Tunnels in a row add up, they don't multiply.`],
      ]),
      explain: r`In a row, squeezes add: $${parts.join(' + ')} = ${total}$ ohms.`,
    };
  }
  if (kind === 'compare') {
    const lo = rng.int(1, 4);
    const hi = lo + rng.int(2, 6);
    const ch = choice(rng, `The $${O(lo)}$ one`, [
      {
        text: `The $${O(hi)}$ one`,
        nudge: `More ohms means more squeeze — **fewer** babies get through each second.`,
      },
      {
        text: `Both the same`,
        nudge: `Same push, but one tunnel is much tighter. Which lets more through?`,
      },
    ]);
    return {
      skill: 'resistance',
      atoms: ['compare'],
      prompt: `Same battery, two different bulbs: one is $${O(lo)}$, the other $${O(hi)}$. Which one gets **more** current?`,
      ...ch,
      explain: `Less resistance = less squeeze = more babies per second. The $${O(lo)}$ bulb wins.`,
    };
  }
  if (kind === 'double') {
    const i = rng.pick([2, 4, 6, 8]);
    return {
      skill: 'resistance',
      atoms: ['double'],
      prompt: `A motor gets $${A(i)}$. Sprocket keeps the same batteries but **doubles** the resistance. What's the current now?`,
      ...numeric(i / 2, [
        [i * 2, `Backwards! More squeeze means *less* flow.`],
        [i, `The squeeze changed, so the flow changes too.`],
      ]),
      explain: `Twice the squeeze, half the flow: $${A(i)} \\div 2 = ${A(i / 2)}$.`,
    };
  }
  const ch = choice(rng, `Squeezes the flow, so fewer babies pass each second`, [
    {
      text: `Eats some of the electrons`,
      nudge: `Nobody gets eaten! The same number come out as go in — they just pass more slowly.`,
    },
    {
      text: `Adds extra push`,
      nudge: `Push comes from the battery (volts). A resistor does the opposite.`,
    },
    `Turns the electrons into water`,
  ]);
  return {
    skill: 'resistance',
    atoms: ['meaning'],
    prompt: `What does a resistor (a "mud tunnel") do?`,
    ...ch,
    explain: `Resistance is squeeze: a tight, muddy tunnel. It slows the whole flow down, all the way round the loop.`,
  };
};

// ---------------------------------------------------------------------------
// ohm-current — I = V ÷ R

export const ohmCurrent: Generator = (rng, level) => {
  const kinds =
    level === 1 ? ['calc', 'calc', 'law'] : level === 2 ? ['calc', 'aa', 'law'] : ['aa', 'calc'];
  const kind = rng.pick(kinds);
  if (kind === 'law') {
    const ch = choice(rng, r`$\text{current} = \text{push} \div \text{squeeze}$`, [
      {
        text: r`$\text{current} = \text{push} \times \text{squeeze}$`,
        nudge: `More squeeze should mean *less* flow, so we divide by it.`,
      },
      {
        text: r`$\text{current} = \text{squeeze} \div \text{push}$`,
        nudge: `Upside down! More push should mean *more* flow.`,
      },
      r`$\text{current} = \text{push} - \text{squeeze}$`,
    ]);
    return {
      skill: 'ohm-current',
      atoms: ['law'],
      prompt: `Which is Ohm's law in baby-electron language?`,
      ...ch,
      explain: r`More push → more flow; more squeeze → less flow. So $I = \frac{V}{R}$: current = push ÷ squeeze.`,
    };
  }
  let v: number, R: number, i: number, setup: string;
  if (kind === 'aa') {
    i = rng.int(1, 3);
    R = rng.pick([1.5, 3, 4.5, 6]);
    while ((i * R) / AA > 8) i--;
    v = clean(i * R);
    const k = clean(v / AA);
    setup = `${k} AA batteries (that's $${V(v)}$) power a $${O(R)}$ motor.`;
  } else {
    i = rng.int(1, level === 1 ? 4 : 6);
    R = rng.int(1, level === 1 ? 5 : 8);
    v = i * R;
    setup = `A battery with $${V(v)}$ of push drives babies through a $${O(R)}$ bulb.`;
  }
  return {
    skill: 'ohm-current',
    atoms: [kind],
    prompt: `${setup} How many amps flow?`,
    math: r`I = \frac{V}{R}`,
    ...numeric(i, [
      [clean(v * R), `Times makes it bigger with more squeeze — that can't be right. Divide!`],
      [clean(R / v), `Upside down! Push on top, squeeze underneath: $${fmt(v)} \\div ${fmt(R)}$.`],
      [clean(v - R), `Not minus — divide the push by the squeeze.`],
    ]),
    hint: r`Push ÷ squeeze: $${fmt(v)} \div ${fmt(R)}$.`,
    explain: r`$I = \frac{V}{R} = \frac{${fmt(v)}}{${fmt(R)}} = ${fmt(i)}$ amps.`,
  };
};

// ---------------------------------------------------------------------------
// ohm-solve — V = I × R as an equation: find the volts, the ohms, or the batteries

export const ohmSolve: Generator = (rng, level) => {
  const kinds =
    level === 1
      ? ['volts', 'ohms']
      : level === 2
        ? ['volts', 'ohms', 'cells']
        : ['ohms', 'cells', 'fuse'];
  const kind = rng.pick(kinds);
  if (kind === 'volts') {
    const i = rng.int(1, 5);
    const R = rng.int(2, 6);
    return {
      skill: 'ohm-solve',
      atoms: ['volts'],
      prompt: `Nugget's motor is $${O(R)}$ and needs $${A(i)}$ to ram at full speed. How many volts of push?`,
      math: r`V = I \times R`,
      ...numeric(i * R, [
        [i + R, `Not plus — volts = amps **times** ohms.`],
        [clean(R / i), `Multiply: $${i} \\times ${R}$.`],
      ]),
      explain: r`$V = I \times R = ${i} \times ${R} = ${i * R}$ volts.`,
    };
  }
  if (kind === 'ohms') {
    const i = rng.int(2, 5);
    const R = rng.int(1, 6);
    const v = i * R;
    return {
      skill: 'ohm-solve',
      atoms: ['ohms'],
      prompt: `A battery with $${V(v)}$ of push makes $${A(i)}$ flow through a mystery tunnel. How many ohms is the tunnel? Solve for $R$!`,
      math: r`${v} = ${i} \times R`,
      ...numeric(R, [
        [v * i, `Undo the ×${i} by **dividing** both sides by ${i}.`],
        [v - i, `It's $${i} \\times R$, so undo it with ÷, not −.`],
      ]),
      hint: r`Divide both sides by ${i}.`,
      explain: r`$${v} = ${i} \times R$, so $R = ${v} \div ${i} = ${R}$ ohms.`,
    };
  }
  if (kind === 'cells') {
    const R = rng.pick([1.5, 3, 4.5]);
    let i = rng.int(1, 3);
    while ((i * R) / AA > 8) i--;
    const v = clean(i * R);
    const k = clean(v / AA);
    return {
      skill: 'ohm-solve',
      atoms: ['cells'],
      prompt: `To ram at full power, Nugget's $${O(R)}$ motor needs $${A(i)}$. How many AA batteries (1.5 V each) do you stack?`,
      ...numeric(k, [
        [v, `That's the volts you need, $${V(v)}$. But each AA gives only 1.5 V.`],
        [clean(v * AA), `Divide the volts by 1.5 to count batteries.`],
      ]),
      hint: r`First the volts: $V = ${i} \times ${fmt(R)}$. Then how many 1.5s make that?`,
      explain: r`$V = ${i} \times ${fmt(R)} = ${fmt(v)}$ volts, and $${fmt(v)} \div 1.5 = ${k}$ batteries.`,
    };
  }
  const fuse = rng.int(2, 5);
  const R = rng.int(2, 4);
  return {
    skill: 'ohm-solve',
    atoms: ['fuse'],
    prompt: `The motor's fuse pops above $${A(fuse)}$ (poof, smoke, sad robot). The motor is $${O(R)}$. What's the most push you can give it?`,
    ...numeric(fuse * R, [
      [fuse + R, `Volts = amps **×** ohms.`],
      [clean(fuse / R), `Multiply: $${fuse} \\times ${R}$.`],
    ]),
    explain: r`$V = I \times R = ${fuse} \times ${R} = ${fuse * R}$ volts. Any more and — *poof*.`,
  };
};
