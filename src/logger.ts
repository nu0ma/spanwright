import { consola } from 'consola';

export const logger = consola.create({
  level: process.env.SPANWRIGHT_LOG_LEVEL ? parseInt(process.env.SPANWRIGHT_LOG_LEVEL, 10) : 3,
});
