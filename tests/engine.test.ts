import { describe, expect, it } from 'vitest';
import { newProfile, levelFromXp, xpForLevel, maxHearts } from '../src/engine/profile';
import { addDailyXp, rollDay } from '../src/engine/daily';
import { newPet, tickPet, petMood, feed } from '../src/engine/pet';
import { judge, parseNumber } from '../src/engine/answer';
import { recordAnswer, effectiveMastery } from '../src/engine/mastery';
import { migrate, importProfile, exportProfile } from '../src/engine/save';
import { buy } from '../src/engine/items';
import { refreshWanderers, planProblems } from '../src/engine/encounters';
import { HOUR, DAY, addDays } from '../src/engine/dates';
import { Rng } from '../src/engine/rng';
import type { Problem } from '../src/skills/types';

const hero = () =>
  newProfile({
    name: 'Test',
    cls: 'wizard',
    look: { skin: 0, hair: 0, hairStyle: 0, outfit: 0 },
    goal: 100,
  });

describe('levels', () => {
  it('xp curve is increasing and consistent', () => {
    for (let l = 1; l < 30; l++) {
      expect(xpForLevel(l + 1)).toBeGreaterThan(xpForLevel(l));
      expect(levelFromXp(xpForLevel(l))).toBe(l);
      expect(levelFromXp(xpForLevel(l + 1) - 1)).toBe(l);
    }
  });
  it('knights get an extra heart', () => {
    const p = hero();
    expect(maxHearts(p)).toBe(3);
    p.hero.cls = 'knight';
    expect(maxHearts(p)).toBe(4);
  });
});

describe('daily goal and streak', () => {
  it('meeting the goal on consecutive days builds a streak', () => {
    const p = hero();
    expect(addDailyXp(p, 60, '2026-01-01')).toBe(false);
    expect(addDailyXp(p, 60, '2026-01-01')).toBe(true);
    expect(p.daily.streak).toBe(1);
    expect(addDailyXp(p, 100, '2026-01-01')).toBe(false); // only once per day
    expect(addDailyXp(p, 120, '2026-01-02')).toBe(true);
    expect(p.daily.streak).toBe(2);
  });
  it('missing a day breaks the streak', () => {
    const p = hero();
    addDailyXp(p, 100, '2026-01-01');
    const roll = rollDay(p, '2026-01-03');
    expect(roll.lost).toBe(1);
    expect(p.daily.streak).toBe(0);
  });
  it('streak shields save missed days, one per day', () => {
    const p = hero();
    p.inv['streak-shield'] = 2;
    addDailyXp(p, 100, '2026-01-01');
    const roll = rollDay(p, '2026-01-04'); // missed the 2nd and 3rd
    expect(roll.shieldsUsed).toBe(2);
    expect(p.daily.streak).toBe(1);
    expect(p.inv['streak-shield']).toBe(0);
    expect(addDailyXp(p, 100, '2026-01-04')).toBe(true);
    expect(p.daily.streak).toBe(2);
  });
  it('addDays handles month ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('pet', () => {
  it('a fed pet survives a day', () => {
    const t0 = Date.UTC(2026, 0, 1);
    const pet = newPet('blorp', 'Blorp', t0);
    pet.hunger = 100;
    tickPet(pet, t0 + DAY);
    expect(pet.dead).toBeUndefined();
    expect(pet.hunger).toBeLessThan(60);
  });
  it('a neglected pet dies in roughly three to four days', () => {
    const t0 = Date.UTC(2026, 0, 1);
    const pet = newPet('blorp', 'Blorp', t0);
    pet.hunger = 100;
    pet.joy = 100;
    tickPet(pet, t0 + 3 * DAY);
    expect(pet.dead).toBeUndefined();
    tickPet(pet, t0 + 5 * DAY);
    expect(pet.dead?.cause).toBe('starved');
    expect(petMood(pet)).toBe('dead');
  });
  it('eating leads to poop', () => {
    const t0 = Date.UTC(2026, 0, 1);
    const pet = newPet('blorp', 'Blorp', t0);
    feed(pet, 30, new Rng(1), t0);
    expect(pet.nextPoop).not.toBeNull();
    tickPet(pet, t0 + 3 * HOUR);
    expect(pet.poops).toBe(1);
  });
});

describe('answers', () => {
  const num: Problem = {
    skill: 't',
    atoms: [],
    prompt: 'p',
    answer: { kind: 'number', value: 12 },
    nudges: [{ match: 34, text: 'glued' }],
    explain: 'e',
  };
  it('parses keypad input', () => {
    expect(parseNumber('-3')).toBe(-3);
    expect(parseNumber('.5')).toBe(0.5);
    expect(parseNumber('1,000')).toBe(1000);
    expect(Number.isNaN(parseNumber('-'))).toBe(true);
  });
  it('right, nudge once, then wrong', () => {
    expect(judge(num, 12, false).kind).toBe('right');
    expect(judge(num, 34, false)).toEqual({ kind: 'nudge', text: 'glued' });
    expect(judge(num, 34, true).kind).toBe('wrong');
    expect(judge(num, 5, false).kind).toBe('wrong');
  });
  it('generic nudges for sign and decimal point', () => {
    expect(judge(num, -12, false).kind).toBe('nudge');
    expect(judge(num, 120, false).kind).toBe('nudge');
    expect(judge(num, 1.2, false).kind).toBe('nudge');
  });
  it('tolerates floating point', () => {
    const p: Problem = { ...num, answer: { kind: 'number', value: 0.3 } };
    expect(judge(p, 0.1 + 0.2, false).kind).toBe('right');
  });
});

describe('mastery', () => {
  it('goes up with right answers, down with wrong, and fades over time', () => {
    const p = hero();
    const now = Date.UTC(2026, 0, 1);
    for (let i = 0; i < 10; i++) recordAnswer(p, 'eval-one', 'right', now);
    const m = p.skills['eval-one'].m;
    expect(m).toBeGreaterThan(0.8);
    expect(effectiveMastery(p.skills['eval-one'], now + 60 * DAY)).toBeLessThan(m);
    recordAnswer(p, 'eval-one', 'wrong', now);
    expect(p.skills['eval-one'].m).toBeLessThan(m);
  });
});

describe('saves, shop, encounters', () => {
  it('round-trips export/import and migrates', () => {
    const p = hero();
    const q = importProfile(exportProfile(p));
    expect(q).toEqual(migrate(structuredClone(p)));
    expect(() => importProfile('{"nope":1}')).toThrow();
  });
  it('buying costs gold and respects limits', () => {
    const p = hero();
    p.hero.gold = 1000;
    expect(buy(p, 'cheese')).toBeNull();
    expect(p.hero.gold).toBe(1000 - 6);
    expect(buy(p, 'streak-shield')).toBeNull();
    expect(buy(p, 'streak-shield')).toBeNull();
    expect(buy(p, 'streak-shield')).not.toBeNull(); // max 2
    expect(buy(p, 'mystery-egg')).toBeNull();
    expect(p.eggs).toBe(1);
  });
  it('wanderers appear only after something was learned', () => {
    const p = hero();
    const now = Date.UTC(2026, 0, 1);
    refreshWanderers(p, now, new Rng(1));
    expect(p.wanderers.length).toBe(0);
    recordAnswer(p, 'eval-one', 'right', now);
    refreshWanderers(p, now, new Rng(1));
    expect(p.wanderers.length).toBeGreaterThan(0);
    expect(p.wanderers[0].skills).toContain('eval-one');
  });
  it('planned problems cover every skill', () => {
    const p = hero();
    const plan = planProblems(p, ['a', 'b', 'c'], 5, new Rng(3));
    expect(plan).toHaveLength(5);
    expect(new Set(plan.map((x) => x.skill))).toEqual(new Set(['a', 'b', 'c']));
  });
});
