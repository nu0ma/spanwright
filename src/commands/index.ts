import { cli } from 'gunshi';
import { spanwrightCommand } from './spanwright';
import { handleError } from '../errors';

import { description, name, version } from '../../package.json';

export async function run(): Promise<void> {
  const gunshiArgs = ['spanwright', ...process.argv.slice(2)];
  cli(gunshiArgs, spanwrightCommand, {
    name,
    version,
    description,
  }).catch(handleError);
}
