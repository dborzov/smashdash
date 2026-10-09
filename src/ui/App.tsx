/** Top-level routing and the persistent HUD / tab bar. */
import { useEffect } from 'preact/hooks';
import { useRoute, Redirect } from './router';
import { useProfile, heartbeat } from '../engine/store';
import { setMuted } from '../audio/sfx';
import { regionById } from '../content';
import { Hud, Tabs } from './components/Hud';
import { FxLayer } from './components/Fx';
import { Title } from './screens/Title';
import { CreateHero } from './screens/CreateHero';
import { WorldMap } from './screens/WorldMap';
import { RegionScreen } from './screens/Region';
import { HeroScreen } from './screens/Hero';
import { PetScreen } from './screens/Pet';
import { ShopScreen } from './screens/Shop';
import { PlayNode, PlaySkill, PlayStory, PlayWanderer } from './screens/Play';
import { Preview } from './screens/Preview';

export function App() {
  const route = useRoute();
  const p = useProfile();

  useEffect(() => {
    const t = setInterval(heartbeat, 60_000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => setMuted(!(p?.sound ?? true)), [p?.sound]);

  const [a, b, c] = route;

  if (!p) {
    return (
      <div class="app">
        {a === 'new' ? <CreateHero /> : <Title />}
        <FxLayer />
      </div>
    );
  }

  // Full-screen game modes (no HUD).
  let full = null;
  if (a === 'story' && b) full = <PlayStory key={b} id={b} />;
  else if (a === 'play' && b && c) full = <PlayNode key={`${b}/${c}`} regionId={b} nodeId={c} />;
  else if (a === 'wander' && b) full = <PlayWanderer key={b} id={b} />;
  else if (a === 'practice' && b) full = <PlaySkill key={b} skillId={b} />;
  else if (a === 'new') full = <CreateHero />;
  else if (a === 'preview') full = <Preview kind={b} id={c} />;
  if (full) {
    return (
      <div class="app">
        {full}
        <FxLayer />
      </div>
    );
  }

  // New heroes see the prologue first.
  if (!p.seen.includes('prologue')) return <Redirect to="/story/prologue" />;

  let screen;
  let tab = 'map';
  if (a === 'region' && b && regionById[b]) screen = <RegionScreen p={p} region={regionById[b]} />;
  else if (a === 'hero') {
    screen = <HeroScreen p={p} />;
    tab = 'hero';
  } else if (a === 'pet') {
    screen = <PetScreen p={p} />;
    tab = 'pet';
  } else if (a === 'shop') {
    screen = <ShopScreen p={p} />;
    tab = 'shop';
  } else screen = <WorldMap p={p} />;

  return (
    <div class="app">
      {screen}
      <Hud p={p} />
      <Tabs p={p} active={tab} />
      <FxLayer />
    </div>
  );
}
