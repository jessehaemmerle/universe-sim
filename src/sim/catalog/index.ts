import type { Category, Deletable } from '../types';
import { AIR } from './air';
import { CIV } from './civ';
import { PHYSICS } from './physics';
import { PLANET } from './planet';
import { SPACE } from './space';
import { START } from './start';
import { LIFE } from './life';

export { COMBOS } from './combos';

export const CATEGORIES: { id: Category; name: string }[] = [
  { id: 'start', name: 'From the video' },
  { id: 'space', name: 'Space' },
  { id: 'planet', name: 'The planet' },
  { id: 'air', name: 'Air and elements' },
  { id: 'life', name: 'Life' },
  { id: 'civ', name: 'Civilisation' },
  { id: 'physics', name: 'Laws of physics' },
];

export const DELETABLES: Deletable[] = [...START, ...SPACE, ...PLANET, ...AIR, ...LIFE, ...CIV, ...PHYSICS];

export const CATALOG: ReadonlyMap<string, Deletable> = new Map(DELETABLES.map((d) => [d.id, d]));
