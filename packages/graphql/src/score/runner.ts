import { createContext } from '../context';
import { recomputeFutureScoresForAllUsers } from './service';

export async function refreshFutureScoresDaily() {
  const ctx = await createContext();
  return recomputeFutureScoresForAllUsers(ctx);
}
