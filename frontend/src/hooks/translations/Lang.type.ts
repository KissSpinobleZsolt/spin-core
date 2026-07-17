import type { LANGS } from './LANGS.constant'

/** Union of supported language codes derived from the LANGS tuple. */
export type Lang = (typeof LANGS)[number]
