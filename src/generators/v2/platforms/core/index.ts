import { Plan } from '../../plan/index.js';

export interface Platform {
  render(plan: Plan): Promise<Record<string, string>>;
}
