/**
 * Loads every YAML file under content/ at build time (Vite plugin in vite.config.ts) and
 * exposes typed lookups. This is the only module the game uses to reach content.
 */
import type { CastMember, Item, Lesson, PetSpecies, Region, Skill } from './schema';

const regionFiles = import.meta.glob('/content/regions/*/region.yaml', { eager: true, import: 'default' });
const lessonFiles = import.meta.glob('/content/**/lessons/*.yaml', { eager: true, import: 'default' });
const storyFiles = import.meta.glob('/content/story/*.yaml', { eager: true, import: 'default' });
import skillsYaml from '../../content/skills.yaml';
import itemsYaml from '../../content/items.yaml';
import petsYaml from '../../content/pets.yaml';
import castYaml from '../../content/cast.yaml';
import classesYaml from '../../content/classes.yaml';

/** Default values zod would fill in; applied here so runtime does not depend on zod. */
function regionDefaults(r: Region): Region {
  return {
    ...r,
    requires: r.requires ?? [],
    path: r.path.map((n) => (n.type === 'encounter' ? { ...n, count: n.count ?? 5 } : n)),
  };
}

export const regions: Region[] = Object.values(regionFiles)
  .map((r) => regionDefaults(r as Region))
  .sort((a, b) => a.order - b.order);

export const regionById: Record<string, Region> = Object.fromEntries(regions.map((r) => [r.id, r]));

export const lessons: Record<string, Lesson> = {};
for (const l of [...Object.values(lessonFiles), ...Object.values(storyFiles)] as Lesson[]) lessons[l.id] = l;

export const skills: Skill[] = skillsYaml as Skill[];
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

/** Raw objects for validation tests. */
export const raw = { regionFiles, lessonFiles, storyFiles, skillsYaml, itemsYaml, petsYaml, castYaml, classesYaml };
