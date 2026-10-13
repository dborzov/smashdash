/** Renders any content Widget or problem Visual. */
import type { Widget } from '../../content/schema';
import type { Visual } from '../../skills/types';
import { BoxesWidget } from './Boxes';
import { BalanceWidget } from './Balance';
import { HopWidget, PowersWidget, TowerWidget } from './Powers';
import { UnwrapWidget } from './Unwrap';
import { AreaWidget, GroupsWidget } from './Groups';
import { PlotWidget } from './Plot';
import { CircuitWidget, PipeWidget } from './Circuit';
import {
  Abacus,
  DecGrid,
  LogLine,
  NumberLineWidget,
  PlaceChart,
  Rounder,
  Shifter,
} from './PlaceValue';

export function WidgetView({
  w,
  onDone,
  interactive = true,
  quiz = false,
}: {
  w: Widget | Visual;
  onDone?: () => void;
  interactive?: boolean;
  /** The picture belongs to a question: don't give the answer away (no glowing bulbs). */
  quiz?: boolean;
}) {
  switch (w.kind) {
    case 'boxes':
      return (
        <BoxesWidget a={w.a} b={w.b} reveal={interactive ? w.reveal : undefined} onDone={onDone} />
      );
    case 'balance':
      return (
        <BalanceWidget
          left={w.left}
          right={w.right}
          value={'value' in w ? w.value : undefined}
          goal={interactive && 'goal' in w ? (w.goal ?? 'none') : 'none'}
          tools={interactive && 'tools' in w ? (w.tools ?? ['both']) : []}
          onDone={onDone}
        />
      );
    case 'powers':
      return <PowersWidget min={w.min} max={w.max} start={w.start ?? 0} onDone={onDone} />;
    case 'hop':
      return <HopWidget mantissa={w.mantissa} exp={w.exp} onDone={onDone} />;
    case 'tower':
      return <TowerWidget base={w.base} exp={w.exp} onDone={onDone} interactive={interactive} />;
    case 'power':
      return <TowerWidget base={w.base} exp={w.exp} interactive={false} />;
    case 'unwrap':
      return <UnwrapWidget layers={w.layers} value={w.value} onDone={onDone} />;
    case 'groups':
      return <GroupsWidget n={w.n} x={w.x} c={w.c} sort={interactive && w.sort} onDone={onDone} />;
    case 'area':
      return (
        <AreaWidget
          rows={w.rows}
          tens={w.tens}
          extra={w.extra}
          tap={interactive && w.tap}
          onDone={onDone}
        />
      );
    case 'plot':
      return (
        <PlotWidget
          size={w.size}
          points={w.points}
          line={w.line}
          rule={interactive ? w.rule : undefined}
          targets={interactive ? w.targets : undefined}
          aim={interactive ? w.aim : undefined}
          onDone={onDone}
        />
      );
    case 'circuit':
      return <CircuitWidget {...w} interactive={interactive} quiz={quiz} onDone={onDone} />;
    case 'pipe':
      return <PipeWidget height={w.height} squeeze={w.squeeze} target={w.target} onDone={onDone} />;
    case 'placechart':
      return (
        <PlaceChart
          value={w.value}
          dec={w.dec}
          top={w.top}
          hl={w.hl}
          hide={w.hide}
          tap={interactive && 'tap' in w ? w.tap : undefined}
          onDone={onDone}
        />
      );
    case 'abacus':
      return (
        <Abacus
          places={w.places}
          start={w.start}
          target={interactive ? w.target : undefined}
          onDone={onDone}
        />
      );
    case 'numberline':
      return (
        <NumberLineWidget
          {...w}
          target={interactive && 'target' in w ? w.target : undefined}
          tolerance={'tolerance' in w ? w.tolerance : undefined}
          onDone={onDone}
        />
      );
    case 'logline':
      return (
        <LogLine
          min={w.min}
          max={w.max}
          target={interactive ? w.target : undefined}
          linear={w.linear}
          onDone={onDone}
        />
      );
    case 'rounder':
      return <Rounder value={w.value} place={w.place} onDone={onDone} />;
    case 'shifter':
      return <Shifter value={w.value} times={w.times} onDone={onDone} />;
    case 'decgrid':
      return <DecGrid value={w.value} />;
  }
}
