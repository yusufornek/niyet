import type { Config } from 'tailwindcss';
import preset from '@niyet/tailwind-config';

const config: Config = {
  presets: [preset as Config],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
    '../../packages/core/src/**/*.{ts,tsx}',
  ],
};

export default config;
