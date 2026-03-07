import { type Hero, type Progression } from '@/api/pik';

export type QuestStatus = 'completed' | 'active' | 'available' | 'locked';
export type QuestRarity = 'common' | 'honored' | 'rare' | 'epic' | 'legendary';

export interface Quest {
  quest_id:       string;
  title:          string;
  lore:           string;
  objective:      string;
  xp_reward:      number;
  status:         QuestStatus;
  progress:       number;
  progress_label: string;
  rarity:         QuestRarity;
  category:       'progression' | 'mastery' | 'legacy';
}

export function generateQuests(hero: Hero): Quest[] {
  const p = hero.progression;
  const quests: Quest[] = [
    quest('first_session', 'The First Trial', 'Every legend begins with a single step into the darkness.', 'Complete your first session', 100, p.sessions_completed >= 1 ? 'completed' : 'active', Math.min(p.sessions_completed, 1), `${Math.min(p.sessions_completed,1)} / 1`, 'common', 'progression'),
    quest('ten_sessions', 'Seasoned Blade', 'Ten trials. Ten chances to prove the worth of your Fate.', 'Complete 10 sessions', 500, p.sessions_completed >= 10 ? 'completed' : p.sessions_completed >= 1 ? 'active' : 'locked', p.sessions_completed / 10, `${Math.min(p.sessions_completed,10)} / 10`, 'honored', 'progression'),
    quest('twenty_sessions', 'Veteran of the Veil', 'Twenty descents into the dark. You are no longer a novice.', 'Complete 20 sessions', 1000, p.sessions_completed >= 20 ? 'completed' : p.sessions_completed >= 10 ? 'active' : 'locked', p.sessions_completed / 20, `${Math.min(p.sessions_completed,20)} / 20`, 'rare', 'progression'),
    quest('level_5', 'Awakened Fate', 'The Kernel stirs. Your true potential begins to surface.', 'Reach Fate Level 5', 300, p.fate_level >= 5 ? 'completed' : 'active', p.fate_level / 5, `Level ${p.fate_level} / 5`, 'common', 'progression'),
    quest('level_10', 'Forged in the Archive', 'Ten levels of consequence. The Archive takes notice.', 'Reach Fate Level 10', 1500, p.fate_level >= 10 ? 'completed' : p.fate_level >= 5 ? 'active' : 'locked', p.fate_level / 10, `Level ${p.fate_level} / 10`, 'epic', 'progression'),
    quest('xp_1000', 'First Echoes', 'The Kernel records your earliest struggles.', 'Accumulate 1,000 Fate XP', 100, p.total_xp >= 1000 ? 'completed' : 'active', p.total_xp / 1000, `${Math.min(p.total_xp,1000).toLocaleString()} / 1,000 XP`, 'common', 'progression'),
    quest('xp_5000', 'The Weight of Fate', 'Five thousand marks of consequence. The veil thins around you.', 'Accumulate 5,000 Fate XP', 500, p.total_xp >= 5000 ? 'completed' : p.total_xp >= 1000 ? 'active' : 'locked', p.total_xp / 5000, `${Math.min(p.total_xp,5000).toLocaleString()} / 5,000 XP`, 'honored', 'progression'),
    quest('hard_difficulty', 'Trial by Darkness', 'The hardest paths reveal the truest selves.', 'Complete a HARD difficulty session', 750, ['hard','extreme'].includes(p.highest_difficulty) ? 'completed' : p.sessions_completed > 0 ? 'available' : 'locked', ['hard','extreme'].includes(p.highest_difficulty) ? 1 : 0, `Highest: ${p.highest_difficulty?.toUpperCase() ?? 'NONE'}`, 'rare', 'mastery'),
    quest('earn_title', 'Named by the Archive', 'A title is not given — it is recognized.', 'Earn your first title', 200, (hero.titles ?? []).length > 0 ? 'completed' : 'available', (hero.titles ?? []).length > 0 ? 1 : 0, `${(hero.titles ?? []).length} title${(hero.titles ?? []).length !== 1 ? 's' : ''} earned`, 'honored', 'mastery'),
    quest('link_venue', 'The First Gate', "The Codex must be bound to a place.", 'Link to a Heroes\' Veritas venue', 150, (hero.sources ?? []).some(s => s.is_active) ? 'completed' : 'available', (hero.sources ?? []).some(s => s.is_active) ? 1 : 0, (hero.sources ?? []).some(s => s.is_active) ? 'Venue linked' : 'No venues', 'common', 'legacy'),
    quest('wristband', 'The Living Bond', 'The wristband is a covenant between your Fate and the physical world.', 'Activate your Fate Wristband', 250, hero.wearable?.status === 'active' ? 'completed' : 'available', hero.wearable?.status === 'active' ? 1 : 0, hero.wearable?.status === 'active' ? 'Active' : 'Not issued', 'honored', 'legacy'),
  ];

  const order: QuestStatus[] = ['active', 'available', 'completed', 'locked'];
  return quests.sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
}

function quest(
  quest_id: string, title: string, lore: string, objective: string,
  xp_reward: number, status: QuestStatus, progressRaw: number,
  progress_label: string, rarity: QuestRarity, category: Quest['category']
): Quest {
  return { quest_id, title, lore, objective, xp_reward, status,
    progress: Math.min(1, Math.max(0, progressRaw)),
    progress_label, rarity, category };
}
