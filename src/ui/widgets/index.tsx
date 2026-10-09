/** Renders any content Widget or problem Visual. */
import type { Widget } from '../../content/schema';
import type { Visual } from '../../skills/types';
import { BoxesWidget } from './Boxes';
import { BalanceWidget } from './Balance';
import { HopWidget, PowersWidget, TowerWidget } from './Powers';
import { UnwrapWidget } from './Unwrap';

export function WidgetView({
  w,
  onDone,
  interactive = true,
}: {
  w: Widget | Visual;
  onDone?: () => void;
  interactive?: boolean;
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
  }
}
