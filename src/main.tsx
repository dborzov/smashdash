import { render } from 'preact';
import 'katex/dist/katex.min.css';
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import '@fontsource/nunito/400.css';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/800.css';
import './styles/main.css';
import { App } from './ui/App';
import { restore } from './engine/store';

// Resume the last hero before the first render, so we don't flash the title screen.
restore();

render(<App />, document.getElementById('app')!);
