/**
 * Schema modüllerini sırasıyla yükle — Pothos builder.queryType/mutationType
 * import order'a göre alanları kaydeder.
 */
import './enums';
import './user';
import './account';
import './transaction';
import './subscription';
import './goal';
import './circle';
import './score';
import './notification';
import './analysis';
import './micro-contribution';
import './chat';
import './learn';
import './finance-news';
import './rule';
import './category-auto-save';

import { builder } from '../builder';

export const schema = builder.toSchema();
