/**
 * Loads every YAML file under content/ at build time (Vite plugin in vite.config.ts) and
 * exposes typed lookups. This is the only module the game uses to reach content.
 */
import type {
  Achievement,
  Campaign,
  CastMember,
  Item,
  Lesson,
  News,
  PetSpecies,
  Region,
  Skill,
  SizeCard,
} from './schema';

const regionFiles = import.meta.glob('/content/regions/*/region.yaml', { eager: true, import: 'default' });
const lessonFiles = import.meta.glob('/content/**/lessons/*.yaml', { eager: true, import: 'default' });
const storyFiles = import.meta.glob('/content/story/*.yaml', { eager: true, import: 'default' });
import skillsYaml from '../../content/skills.yaml';
import itemsYaml from '../../content/items.yaml';
import petsYaml from '../../content/pets.yaml';
import castYaml from '../../content/cast.yaml';
import classesYaml from '../../content/classes.yaml';
import campaignsYaml from '../../content/campaigns.yaml';
import achievementsYaml from '../../content/achievements.yaml';
import newsYaml from '../../content/news.yaml';
import sizesYaml from '../../content/sizes.yaml';

/** Default values zod would fill in; applied here so runtime does not depend on zod. */
function regionDefaults(r: Region): Region {
  return {
    ...r,
    requires: r.requires ?? [],
    campaign: r.campaign ?? 'kingdom',
    path: r.path.map((n) => (n.type === 'encounter' ? { ...n, count: n.count ?? 5 } : n)),
    ranks: (r.ranks ?? []).map((d) => ({
      ...d,
      nodes: d.nodes?.map((n) => ({ ...n, count: n.count ?? 5 })),
    })),
    treasures: r.treasures ?? [],
  };
}

export const regions: Region[] = Object.values(regionFiles)
  .map((r) => regionDefaults(r as Region))
  .sort((a, b) => a.order - b.order);

export const regionById: Record<string, Region> = Object.fromEntries(regions.map((r) => [r.id, r]));

export const lessons: Record<string, Lesson> = {};
for (const l of [...Object.values(lessonFiles), ...Object.values(storyFiles)] as Lesson[]) lessons[l.id] = l;

export const skills: Skill[] = (skillsYaml as Skill[]).map((s) => ({
  ...s,
  requires: s.requires ?? [],
}));
export const skillById: Record<string, Skill> = Object.fromEntries(skills.map((s) => [s.id, s]));

export const items: Item[] = (itemsYaml as Item[]).map((i) => ({
  ...i,
  effect: i.effect ?? {},
  inShop: i.inShop ?? true,
  drop: i.drop ?? 0,
  level: i.level ?? 1,
}));
export const itemById: Record<string, Item> = Object.fromEntries(items.map((i) => [i.id, i]));

export const petSpecies: PetSpecies[] = petsYaml as PetSpecies[];
export const petById: Record<string, PetSpecies> = Object.fromEntries(petSpecies.map((p) => [p.id, p]));

export const cast: Record<string, CastMember> = castYaml as Record<string, CastMember>;

export interface HeroClass {
  name: string;
  icon: string;
  perk: string;
  desc: string;
}
export const classes: Record<string, HeroClass> = classesYaml as Record<string, HeroClass>;

export const campaigns: Campaign[] = (campaignsYaml as Campaign[])
  .map((c) => ({ ...c, requires: c.requires ?? [] }))
  .sort((a, b) => a.order - b.order);
export const campaignById: Record<string, Campaign> = Object.fromEntries(
  campaigns.map((c) => [c.id, c]),
);

export const achievements: Achievement[] = (achievementsYaml as Achievement[]).map((a) => ({
  ...a,
  gold: a.gold ?? 0,
}));
export const achievementById: Record<string, Achievement> = Object.fromEntries(
  achievements.map((a) => [a.id, a]),
);

/** Dispatch feed, newest first. */
export const news: News[] = (newsYaml as News[]).slice().sort((a, b) => (a.date < b.date ? 1 : -1));

/** Real things and their sizes, for the Scale Ladder and the Scale Museum (smallest first). */
export const sizes: SizeCard[] = (sizesYaml as SizeCard[]).slice().sort((a, b) => a.m - b.m);
export const sizeById: Record<string, SizeCard> = Object.fromEntries(sizes.map((c) => [c.id, c]));

/** Raw objects for validation tests. */
export const raw = {
  regionFiles,
  lessonFiles,
  storyFiles,
  skillsYaml,
  itemsYaml,
  petsYaml,
  castYaml,
  classesYaml,
  campaignsYaml,
  achievementsYaml,
  newsYaml,
  sizesYaml,
};
