/**
 * The adaptive layer: tiers move up only after a clean streak and down after misses; runs get
 * longer when the player struggles (and never end with a mistake left un-ironed) and shorter
 * when a mastered skill is breezed through; atoms are tracked and can be drilled.
 */
import { describe, expect, it } from 'vitest';
import { newProfile, type Profile } from '../src/engine/profile';
import {
  atomStatus,
  hasShakyAtom,
  PROMOTE_RUN,
  recordAnswer,
  skillState,
  tierOf,
  type Outcome,
} from '../src/engine/mastery';
import { applyResult, isOver, newRun, pickNext, remaining, total } from '../src/engine/adaptive';
import { generateFor, generators } from '../src/skills';
import { skillById } from '../src/content';
import { Rng } from '../src/engine/rng';

const hero = (): Profile =>
  newProfile({
    name: 'T',
    cls: 'knight',
    look: { skin: 0, hair: 0, hairStyle: 0, outfit: 0 },
    goal: 100,
  });

describe('tiers', () => {
  it('a clean streak at the current tier promotes, one tier at a time', () => {
    const p = hero();
    skillState(p, 'eval-one');
    for (let i = 0; i < PROMOTE_RUN - 1; i++)
      expect(recordAnswer(p, 'eval-one', 'right', 1, ['add'], 1)).toBeNull();
    expect(recordAnswer(p, 'eval-one', 'right', 1, ['add'], 1)).toEqual({
      skill: 'eval-one',
      from: 1,
      to: 2,
    });
    expect(tierOf(p, 'eval-one')).toBe(2);
  });

  it('nudged answers do not count towards promotion', () => {
    const p = hero();
    const seq: Outcome[] = ['right', 'nudged', 'right', 'right', 'right'];
    seq.forEach((o) => recordAnswer(p, 'eval-one', o, 1, ['mul'], 1));
    expect(tierOf(p, 'eval-one')).toBe(1);
    recordAnswer(p, 'eval-one', 'right', 1, ['mul'], 1);
    expect(tierOf(p, 'eval-one')).toBe(2);
  });

  it('answers at a different level do not promote', () => {
    const p = hero();
    for (let i = 0; i < 10; i++) recordAnswer(p, 'eval-one', 'right', 1, ['add'], 2);
    expect(tierOf(p, 'eval-one')).toBe(1);
  });

  it('two misses out of three drop a tier', () => {
    const p = hero();
    skillState(p, 'eval-one').tier = 3;
    recordAnswer(p, 'eval-one', 'wrong', 1, ['div'], 3);
    recordAnswer(p, 'eval-one', 'right', 1, ['add'], 3);
    expect(recordAnswer(p, 'eval-one', 'wrong', 1, ['div'], 3)).toEqual({
      skill: 'eval-one',
      from: 3,
      to: 2,
    });
  });

  it("doesn't promote while an atom is shaky", () => {
    const p = hero();
    recordAnswer(p, 'eval-one', 'wrong', 1, ['div'], 2); // a miss at another level
    expect(hasShakyAtom(p, 'eval-one')).toBe(true);
    for (let i = 0; i < PROMOTE_RUN; i++) recordAnswer(p, 'eval-one', 'right', 1, ['add'], 1);
    expect(tierOf(p, 'eval-one')).toBe(1);
    // Put the shaky atom right twice and the next clean answer promotes.
    recordAnswer(p, 'eval-one', 'right', 1, ['div'], 1);
    recordAnswer(p, 'eval-one', 'right', 1, ['div'], 1);
    expect(tierOf(p, 'eval-one')).toBe(2);
  });
});

describe('atoms', () => {
  it('status goes unseen → shaky → learning → solid → mastered', () => {
    const p = hero();
    const st = () => atomStatus(p.atoms['pow10-up/e2']);
    expect(st()).toBe('unseen');
    recordAnswer(p, 'pow10-up', 'wrong', 1, ['e2']);
    expect(st()).toBe('shaky');
    recordAnswer(p, 'pow10-up', 'right', 1, ['e2']);
    expect(st()).toBe('shaky'); // the miss is still in the last two
    recordAnswer(p, 'pow10-up', 'right', 1, ['e2']);
    expect(st()).toBe('solid');
    for (let i = 0; i < 4; i++) recordAnswer(p, 'pow10-up', 'right', 1, ['e2']);
    expect(st()).toBe('mastered');
  });

  it('generateFor finds a problem for a requested atom', () => {
    for (const id of ['pow10-up', 'eval-one', 'closed-loop', 'words-to-expr']) {
      for (const a of skillById[id].atoms) {
        let ok = 0;
        for (let seed = 1; seed <= 20; seed++)
          if (generateFor(id, 2, new Rng(seed), a.id).atoms.includes(a.id)) ok++;
        expect(ok, `${id}/${a.id}`).toBeGreaterThan(15);
      }
    }
  });
});

describe('adaptive runs', () => {
  const play = (
    p: Profile,
    skills: string[],
    count: number,
    answer: (i: number, skill: string) => Outcome,
    seed = 1,
  ) => {
    const rng = new Rng(seed);
    const run = newRun(p, skills, count, rng);
    let asked = 0;
    while (!isOver(run) && asked < 100) {
      const nx = pickNext(p, run, rng);
      const prob = generateFor(nx.skill, nx.level, rng, nx.atom);
      const o = answer(asked, nx.skill);
      recordAnswer(p, nx.skill, o, 1, prob.atoms, nx.level);
      applyResult(p, run, nx.skill, prob.atoms, o);
      asked++;
    }
    return { run, asked };
  };

  it('all right: exactly the planned number of problems', () => {
    const { run, asked } = play(hero(), ['eval-one', 'eval-two'], 6, () => 'right');
    expect(asked).toBe(6);
    expect(run.done).toBe(6);
    expect(run.extra).toBe(0);
  });

  it('each skill shows up at least once', () => {
    const p = hero();
    const rng = new Rng(3);
    const run = newRun(p, ['notation', 'eval-one', 'eval-two'], 5, rng);
    for (const id of run.skills) expect(run.s[id].quota).toBeGreaterThan(0);
    expect(remaining(run)).toBe(5);
  });

  it('a mistake adds a reinforcement on the same skill, and is asked again straight away', () => {
    const p = hero();
    const rng = new Rng(7);
    const run = newRun(p, ['eval-one', 'notation'], 4, rng);
    const nx = pickNext(p, run, rng);
    const prob = generateFor(nx.skill, nx.level, rng, nx.atom);
    const ev = applyResult(p, run, nx.skill, prob.atoms, 'wrong');
    expect(ev).toContainEqual({ kind: 'reinforce', skill: nx.skill });
    expect(total(run)).toBe(5);
    const again = pickNext(p, run, rng);
    expect(again.skill).toBe(nx.skill);
    expect(again.atom).toBe(prob.atoms[0]);
  });

  it('struggling makes the run longer, but it always ends (capped)', () => {
    const { run, asked } = play(hero(), ['eval-two'], 6, (i) => (i % 2 === 0 ? 'wrong' : 'right'));
    expect(asked).toBeGreaterThan(6);
    expect(run.extra).toBeLessThanOrEqual(run.maxExtra);
    expect(asked).toBeLessThan(40);
  });

  it('never ends with a mistake un-ironed when there is room to fix it', () => {
    // Wrong only on the very last planned problem.
    const { run } = play(hero(), ['eval-one'], 4, (i) => (i === 3 ? 'wrong' : 'right'));
    expect(run.s['eval-one'].misses).toEqual([]);
    expect(run.grit).toBeGreaterThan(0);
  });

  it('a mistake put right counts as grit', () => {
    const p = hero();
    const rng = new Rng(11);
    const run = newRun(p, ['pow10-up'], 3, rng);
    applyResult(p, run, 'pow10-up', ['e3'], 'wrong');
    const ev = applyResult(p, run, 'pow10-up', ['e3'], 'right');
    expect(ev).toContainEqual({ kind: 'redeem', skill: 'pow10-up', atom: 'e3' });
    expect(run.grit).toBe(1);
  });

  it('breezing through a mastered skill finishes early (but not below the floor)', () => {
    const p = hero();
    skillState(p, 'eval-one').tier = 3;
    skillState(p, 'eval-one').m = 0.95;
    const { run, asked } = play(p, ['eval-one'], 10, () => 'right');
    expect(asked).toBeLessThan(10);
    expect(asked).toBeGreaterThanOrEqual(run.min);
    expect(run.saved).toBeGreaterThan(0);
  });

  it('after a miss the next problem scaffolds one level easier', () => {
    const p = hero();
    skillState(p, 'eval-two').tier = 3;
    skillState(p, 'eval-two').m = 0.8;
    skillState(p, 'eval-two').last = Date.now();
    const rng = new Rng(5);
    const run = newRun(p, ['eval-two'], 5, rng);
    expect(pickNext(p, run, rng).level).toBe(3);
    applyResult(p, run, 'eval-two', ['bmax'], 'wrong');
    expect(pickNext(p, run, rng).level).toBe(2);
    applyResult(p, run, 'eval-two', ['bmax'], 'right');
    applyResult(p, run, 'eval-two', ['axpb'], 'right');
    expect(pickNext(p, run, rng).level).toBe(3);
  });

  it('a focused drill keeps asking the focus atom', () => {
    const p = hero();
    const rng = new Rng(9);
    const run = newRun(p, ['pow10-up'], 5, rng, { skill: 'pow10-up', atom: 'e6' });
    for (let i = 0; i < 5; i++) {
      const nx = pickNext(p, run, rng);
      const prob = generateFor(nx.skill, 3, rng, nx.atom);
      expect(prob.atoms).toContain('e6');
      applyResult(p, run, nx.skill, prob.atoms, 'right');
    }
  });

  it('every generator works with generateFor for every atom (smoke)', () => {
    for (const id of Object.keys(generators))
      for (const a of skillById[id].atoms)
        expect(() => generateFor(id, 1, new Rng(1), a.id)).not.toThrow();
  });
});
