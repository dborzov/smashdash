/**
 * Validates everything under content/: schema, cross-references and LaTeX.
 * `npm run validate` runs just this file.
 */
import {
  bestMove,
  checkBuild,
  eqFrom,
  parseStory,
  sameEquation,
  solutionOf,
  solveSteps,
  tokensFor,
} from '../src/engine/eqcanvas';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import * as S from '../src/content/schema';
import {
  raw,
  regions,
  lessons,
  skills,
  items,
  cast,
  petSpecies,
  itemById,
  classes,
  campaigns,
  achievements,
  news,
} from '../src/content';
import { statValue } from '../src/engine/achievements';
import { newProfile } from '../src/engine/profile';
import { QUESTS } from '../src/engine/quests';
import { generators } from '../src/skills';
import { renderMath } from '../src/ui/math';
import { circuitState } from '../src/skills/electricity';

function check<T>(schema: z.ZodType<T>, data: unknown, where: string): T {
  const r = schema.safeParse(data);
  if (!r.success) {
    throw new Error(
      `${where}:\n${r.error.issues.map((i) => `  ${i.path.join('.')}: ${i.message}`).join('\n')}`,
    );
  }
  return r.data;
}

/** Every $...$ fragment in a rich-text string must render. */
function checkRich(text: string | undefined, where: string) {
  if (!text) return;
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+)\$/g;
  let m;
  while ((m = re.exec(text))) {
    const tex = m[1] ?? m[2];
    try {
      renderMath(tex, !!m[1], true);
    } catch (e) {
      throw new Error(`${where}: bad LaTeX "${tex}": ${(e as Error).message}`);
    }
  }
  const dollars = (text.replace(/\\\$/g, '').match(/\$/g) ?? []).length;
  expect(dollars % 2, `${where}: unbalanced $ in "${text}"`).toBe(0);
}

describe('content schema', () => {
  it('regions', () => {
    for (const [file, data] of Object.entries(raw.regionFiles)) check(S.Region, data, file);
  });
  it('lessons and stories', () => {
    for (const [file, data] of Object.entries({ ...raw.lessonFiles, ...raw.storyFiles }))
      check(S.Lesson, data, file);
  });
  it('skills, items, pets, cast, classes', () => {
    check(z.array(S.Skill), raw.skillsYaml, 'skills.yaml');
    check(z.array(S.Item), raw.itemsYaml, 'items.yaml');
    check(z.array(S.PetSpecies), raw.petsYaml, 'pets.yaml');
    check(z.record(z.string(), S.CastMember), raw.castYaml, 'cast.yaml');
    check(S.Classes, raw.classesYaml, 'classes.yaml');
  });
  it('campaigns, achievements, news', () => {
    check(z.array(S.Campaign), raw.campaignsYaml, 'campaigns.yaml');
    check(z.array(S.Achievement), raw.achievementsYaml, 'achievements.yaml');
    check(z.array(S.News), raw.newsYaml, 'news.yaml');
  });
});

describe('content references', () => {
  const skillIds = new Set(skills.map((s) => s.id));
  const regionIds = new Set(regions.map((r) => r.id));

  it('ids are unique', () => {
    expect(new Set(skills.map((s) => s.id)).size).toBe(skills.length);
    expect(new Set(items.map((s) => s.id)).size).toBe(items.length);
    expect(regionIds.size).toBe(regions.length);
    for (const r of regions)
      expect(new Set(r.path.map((n) => n.id)).size, r.id).toBe(r.path.length);
  });

  it('every skill has a generator and a home region, and vice versa', () => {
    for (const s of skills) {
      expect(generators[s.id], `generator for ${s.id}`).toBeDefined();
      expect(regionIds.has(s.region), `region of ${s.id}`).toBe(true);
    }
    for (const id of Object.keys(generators))
      expect(skillIds.has(id), `skills.yaml entry for ${id}`).toBe(true);
  });

  it('every skill is taught by exactly one lesson', () => {
    for (const s of skills) {
      const teachers = Object.values(lessons).filter((l) => l.skill === s.id);
      expect(teachers.length, `lessons teaching ${s.id}`).toBe(1);
    }
  });

  it('regions reference real lessons, skills and regions', () => {
    for (const r of regions) {
      for (const req of r.requires)
        expect(regionIds.has(req), `${r.id} requires ${req}`).toBe(true);
      expect(lessons[r.outro], `${r.id} outro ${r.outro}`).toBeDefined();
      for (const n of r.path) {
        const where = `${r.id}/${n.id}`;
        if (n.type === 'lesson' || n.type === 'story')
          expect(lessons[n.lesson], `${where} lesson ${n.lesson}`).toBeDefined();
        if (n.type === 'encounter')
          for (const s of n.skills) expect(skillIds.has(s), `${where} skill ${s}`).toBe(true);
        if (n.type === 'boss')
          for (const p of n.phases)
            for (const s of p.skills) expect(skillIds.has(s), `${where} skill ${s}`).toBe(true);
      }
      expect(r.path[r.path.length - 1].type, `${r.id} ends with a boss`).toBe('boss');
    }
  });

  it('skills are only practised after they are taught', () => {
    for (const r of regions) {
      const taught = new Set<string>();
      // Skills from regions this one requires (transitively) count as taught.
      const addRegion = (id: string) => {
        const reg = regions.find((x) => x.id === id)!;
        reg.requires.forEach(addRegion);
        for (const n of reg.path)
          if (n.type === 'lesson' && lessons[n.lesson].skill) taught.add(lessons[n.lesson].skill!);
      };
      r.requires.forEach(addRegion);
      for (const n of r.path) {
        const where = `${r.id}/${n.id}`;
        if (n.type === 'lesson') {
          const l = lessons[n.lesson];
          if (l.skill) taught.add(l.skill);
          for (const b of l.beats)
            if (b.type === 'practice')
              expect(taught.has(b.skill), `${where} practises ${b.skill}`).toBe(true);
        }
        const used =
          n.type === 'encounter'
            ? n.skills
            : n.type === 'boss'
              ? n.phases.flatMap((p) => p.skills)
              : [];
        for (const s of used)
          expect(taught.has(s), `${where} uses ${s} before it is taught`).toBe(true);
      }
    }
  });

  it('lesson beats are consistent', () => {
    for (const l of Object.values(lessons)) {
      l.beats.forEach((b, i) => {
        const where = `lesson ${l.id} beat ${i}`;
        if ('who' in b && b.who) expect(cast[b.who], `${where}: speaker ${b.who}`).toBeDefined();
        if (b.type === 'ask') {
          expect(b.correct, where).toBeLessThan(b.options.length);
          for (const k of Object.keys(b.nudges ?? {})) {
            expect(Number(k), `${where}: nudge key ${k}`).toBeLessThan(b.options.length);
            expect(Number(k), `${where}: nudge on the right answer`).not.toBe(b.correct);
          }
        }
        if (b.type === 'input')
          for (const n of b.nudges ?? [])
            expect(n.value, `${where}: nudge equals answer`).not.toBe(b.answer);
        if (b.type === 'practice')
          expect(generators[b.skill], `${where}: skill ${b.skill}`).toBeDefined();
        if ((b.type === 'ask' || b.type === 'input' || b.type === 'order') && b.atom) {
          const sk = skills.find((x) => x.id === l.skill);
          expect(
            sk?.atoms.some((a) => a.id === b.atom),
            `${where}: atom ${b.atom} isn't an atom of ${l.skill}`,
          ).toBe(true);
        }
        if (b.type === 'input' && b.dials) {
          const [int, dec = ''] = String(Math.abs(b.answer)).split('.');
          expect(int.length, `${where}: answer too long for the dials`).toBeLessThanOrEqual(
            b.dials.int,
          );
          expect(dec.length, `${where}: too many decimals for the dials`).toBeLessThanOrEqual(
            b.dials.dec ?? 0,
          );
        }
        if (b.type === 'order') {
          expect([...b.correct].sort(), `${where}: correct must use every item once`).toEqual(
            b.items.map((_, k) => k),
          );
          for (const t of b.traps ?? [])
            expect(t.order.join(), `${where}: a trap equals the answer`).not.toBe(b.correct.join());
        }
        if (b.type === 'reward' && b.item)
          expect(itemById[b.item], `${where}: item ${b.item}`).toBeDefined();
        if (
          (b.type === 'play' || b.type === 'show' || b.type === 'ask' || b.type === 'input') &&
          b.widget?.kind === 'balance' &&
          b.widget.goal === 'isolate'
        ) {
          const w = b.widget;
          expect(w.value, `${where}: balance needs value`).toBeDefined();
          expect(w.left.x * w.value! + w.left.c, `${where}: scale must start balanced`).toBe(
            w.right.x * w.value! + w.right.c,
          );
        }
      });
    }
  });

  it('all text renders (LaTeX) and all speakers exist', () => {
    for (const l of Object.values(lessons)) {
      l.beats.forEach((b, i) => {
        const where = `lesson ${l.id} beat ${i}`;
        const texts: (string | undefined)[] = [];
        if ('text' in b) texts.push(b.text);
        if (b.type === 'ask') texts.push(b.explain, ...b.options, ...Object.values(b.nudges ?? {}));
        if (b.type === 'input')
          texts.push(b.explain, b.hint, ...(b.nudges ?? []).map((n) => n.text));
        if (b.type === 'choose') texts.push(...b.options.flatMap((o) => [o.text, o.reply]));
        if (b.type === 'play') texts.push(b.done);
        if (b.type === 'order')
          texts.push(b.explain, ...b.items, ...(b.traps ?? []).map((t) => t.text));
        for (const t of texts) checkRich(t, where);
        if ('math' in b && b.math) renderMath(b.math, true, true);
      });
    }
  });

  it('interactive widgets can be finished', () => {
    for (const l of Object.values(lessons)) {
      l.beats.forEach((b, i) => {
        if (!('widget' in b) || !b.widget) return;
        const w = b.widget;
        const where = `lesson ${l.id} beat ${i}`;
        if (w.kind === 'plot') {
          const size = w.size ?? 10;
          const inside = (x: number, y: number) => x >= 0 && y >= 0 && x <= size && y <= size;
          for (const p of [...(w.points ?? []), ...(w.aim ?? [])])
            expect(inside(p.x, p.y), `${where}: (${p.x}, ${p.y}) off the grid`).toBe(true);
          if (w.targets) {
            expect(w.rule, `${where}: targets need a rule`).toBeDefined();
            for (const x of w.targets)
              expect(
                inside(x, w.rule!.m * x + w.rule!.b),
                `${where}: target x = ${x} off the grid`,
              ).toBe(true);
          }
        }
        if (w.kind === 'circuit' && w.goal && b.type === 'play') {
          const tools = w.tools ?? [];
          if (w.goal === 'close') {
            expect(
              w.gap && tools.includes('close'),
              `${where}: needs a gap and the close tool`,
            ).toBe(true);
            return;
          }
          const hit = (c: typeof w) => {
            const st = circuitState(c);
            const over = w.fuse !== undefined && st.amps > w.fuse;
            return w.goal === 'volts'
              ? st.volts === w.target && !st.reversed
              : st.amps === w.target && !over;
          };
          expect(hit(w), `${where}: already solved at the start`).toBe(false);
          let reachable = false;
          for (let cells = 0; cells <= 8; cells++)
            for (let mud = 0; mud <= 6; mud++)
              for (const flipped of [0, 1]) {
                if (!tools.includes('cells') && cells !== w.cells) continue;
                if (!tools.includes('mud') && mud !== (w.mud ?? 0)) continue;
                if (!tools.includes('flip') && flipped !== (w.flipped ?? 0)) continue;
                if (hit({ ...w, cells, mud, flipped, gap: false })) reachable = true;
              }
          expect(reachable, `${where}: goal can't be reached with the tools`).toBe(true);
        }
        if (w.kind === 'abacus') {
          const cap = 10 ** w.places;
          expect(w.start ?? 0, `${where}: abacus start doesn't fit`).toBeLessThan(cap);
          if (w.target !== undefined) {
            expect(w.target, `${where}: abacus target doesn't fit`).toBeLessThan(cap);
            expect(w.target, `${where}: abacus already solved`).not.toBe(w.start ?? 0);
          }
        }
        if (w.kind === 'numberline') {
          expect(w.min, `${where}: numberline range`).toBeLessThan(w.max);
          const pts = [w.target, w.arrow, ...(w.marks ?? []).map((m) => m.at), ...(w.band ?? [])];
          for (const x of pts)
            if (x !== undefined)
              expect(x >= w.min && x <= w.max, `${where}: ${x} off the numberline`).toBe(true);
        }
        if (w.kind === 'logline' && w.target !== undefined) {
          const d = Math.floor(Math.log10(w.target) + 1e-9);
          expect(d >= w.min && d < w.max, `${where}: logline target off the scale`).toBe(true);
          // The marker starts in the lowest stretch.
          expect(d, `${where}: logline already solved`).not.toBe(w.min);
        }
        if (w.kind === 'placechart' && w.hl !== undefined && w.top !== undefined)
          expect(w.hl, `${where}: highlighted place not on the chart`).toBeLessThanOrEqual(w.top);
        if (w.kind === 'pipe' && w.target !== undefined) {
          expect(w.height / w.squeeze, `${where}: already solved`).not.toBe(w.target);
          let ok = false;
          for (let h = 1; h <= 6; h++)
            for (let s = 1; s <= 4; s++) if (h / s === w.target) ok = true;
          expect(ok, `${where}: pipe target unreachable`).toBe(true);
        }
        if (w.kind === 'eqcanvas') {
          // The slate must be solvable by peeling layers, and a story must hold every number.
          const eq = eqFrom(w.equation);
          expect(solutionOf(eq), `${where}: no solution`).toBeTruthy();
          if (w.mode === 'move') expect(bestMove(eq), `${where}: no first move`).toBeTruthy();
          else if (w.mode !== 'build')
            expect(solveSteps(eq), `${where}: can't be solved`).toBeTruthy();
          if (w.mode === 'build' || w.mode === 'full') {
            expect(w.story && w.unknown, `${where}: needs a story and unknown`).toBeTruthy();
            const { tiles } = parseStory(w.story!);
            const toks = tokensFor(w.equation, tiles);
            expect(checkBuild(toks, { target: eq, tiles, unknown: w.unknown! }).kind, where).toBe(
              'right',
            );
            for (const t of w.traps ?? [])
              expect(sameEquation(eqFrom(t.eq), eq), where).toBe(false);
            for (const t of [
              w.story!,
              w.words ?? '',
              ...(w.hints ?? []),
              ...(w.traps ?? []).map((t) => t.text),
            ])
              checkRich(t, where);
          }
        }
      });
    }
  });

  it('campaigns, regions and news line up', () => {
    const campaignIds = new Set(campaigns.map((c) => c.id));
    for (const r of regions) {
      expect(campaignIds.has(r.campaign), `${r.id} campaign ${r.campaign}`).toBe(true);
      checkRich(r.topic, `${r.id} topic`);
      // A region only requires regions from its own campaign.
      for (const req of r.requires)
        expect(regions.find((x) => x.id === req)!.campaign, `${r.id} requires ${req}`).toBe(
          r.campaign,
        );
    }
    for (const c of campaigns)
      expect(
        regions.filter((r) => r.campaign === c.id && r.requires.length === 0).length,
        `${c.id} has exactly one starting region`,
      ).toBe(1);
    for (const n of news) {
      if (n.region) expect(regionIds.has(n.region), `news ${n.title}`).toBe(true);
      checkRich(n.text, `news ${n.title}`);
    }
  });

  it('achievements point at real stats and items', () => {
    const ids = new Set(achievements.map((a) => a.id));
    expect(ids.size).toBe(achievements.length);
    const events = new Set([
      ...QUESTS.map((q) => q.ev as string),
      'right',
      'clean',
      'wrong',
      'nudged',
      'grit',
      'combo5',
      'combo10',
      'lesson',
      'win',
      'flawless',
      'boss',
      'wander',
      'comeback',
      'promote',
      'master',
      'drill',
      'feed',
      'scoop',
      'pat',
      'trick',
      'bugs',
      'hatch',
      'funeral',
      'buy',
      'goldEarned',
      'goldSpent',
      'quest',
      'xp',
      'dark',
    ]);
    const derived = new Set([
      'level',
      'streak',
      'regions',
      'skills',
      'masters',
      'atomsMastered',
      'atomsSolid',
      'bosses',
      'wins',
      'graves',
      'petAge',
      'bond',
      'gold',
      'hats',
      'decor',
      'hours',
    ]);
    const fresh = newProfile(
      { name: 'T', cls: 'knight', look: { skin: 0, hair: 0, hairStyle: 0, outfit: 0 }, goal: 100 },
      0,
    );
    for (const a of achievements) {
      if (a.item) expect(itemById[a.item], `${a.id} item ${a.item}`).toBeDefined();
      const st = a.stat;
      if (st.startsWith('campaign:'))
        expect(
          campaigns.some((c) => `campaign:${c.id}` === st),
          `${a.id}: ${st}`,
        ).toBe(true);
      else if (st.startsWith('region:'))
        expect(regionIds.has(st.slice(7)), `${a.id}: ${st}`).toBe(true);
      else expect(events.has(st) || derived.has(st), `${a.id}: unknown stat ${st}`).toBe(true);
      // Nothing is unlocked for a brand-new hero.
      expect(statValue(fresh, st, 0) < a.goal, `${a.id} unlocked from the start`).toBe(true);
    }
  });

  it('pets and classes', () => {
    for (const p of petSpecies) expect(itemById[p.favorite], `pet ${p.id} favourite`).toBeDefined();
    expect(Object.keys(classes).sort()).toEqual(['bard', 'knight', 'rogue', 'wizard']);
  });
});
