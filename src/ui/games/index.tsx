/** Renders any mini-game (as a lesson widget, a problem picture, or a practice answer). */
import type { Widget } from '../../content/schema';
import type { Outcome } from '../../engine/mastery';
import { ChainGame } from './Chain';
import { ArrayGame, SkipJump, SquareGrow, TableGrid } from './Tables';
import { Sampler, SizeLine } from './Scale';
import { Balloon, Fruit, IneqLine, Matchsticks, Sorter } from './Algebra';

export type GameWidget = Extract<
  Widget,
  {
    kind:
      | 'array'
      | 'skipjump'
      | 'tablegrid'
      | 'squaregrow'
      | 'chain'
      | 'sizeline'
      | 'sampler'
      | 'balloon'
      | 'sorter'
      | 'fruit'
      | 'ineqline'
      | 'matchsticks';
  }
>;

export const GAME_KINDS = new Set<string>([
  'array',
  'skipjump',
  'tablegrid',
  'squaregrow',
  'chain',
  'sizeline',
  'sampler',
  'balloon',
  'sorter',
  'fruit',
  'ineqline',
  'matchsticks',
]);

export function GameView({
  spec,
  onDone,
  still,
}: {
  spec: GameWidget;
  onDone?: (o: Outcome) => void;
  still?: boolean;
}) {
  const props = { onDone, still };
  switch (spec.kind) {
    case 'chain':
      return <ChainGame spec={spec} {...props} />;
    case 'array':
      return <ArrayGame spec={spec} {...props} />;
    case 'skipjump':
      return <SkipJump spec={spec} {...props} />;
    case 'tablegrid':
      return <TableGrid spec={spec} {...props} />;
    case 'squaregrow':
      return <SquareGrow spec={spec} {...props} />;
    case 'sizeline':
      return <SizeLine spec={spec} {...props} />;
    case 'sampler':
      return <Sampler spec={spec} {...props} />;
    case 'balloon':
      return <Balloon spec={spec} {...props} />;
    case 'sorter':
      return <Sorter spec={spec} {...props} />;
    case 'fruit':
      return <Fruit spec={spec} {...props} />;
    case 'ineqline':
      return <IneqLine spec={spec} {...props} />;
    case 'matchsticks':
      return <Matchsticks spec={spec} {...props} />;
  }
}
