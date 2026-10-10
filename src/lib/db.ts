import { query, queryOne, execute, isMySQLConnected, isMySQLDriver } from './mysql';
import {
  supabase,
  getServiceSupabase,
  isSupabaseConfigured,
  isServiceRoleConfigured,
} from './supabase';
import type {
  Team,
  MatchWithTeams,
  MatchEvent,
  EventSettings,
  Sponsor,
  Match,
  Player,
  TournamentArchive,
} from './types';
import type { AdminUser } from './admin-users';

export { isMySQLDriver };

export function isDatabaseConfigured(): boolean {
  if (isMySQLDriver()) {
    return Boolean(process.env.DB_HOST && process.env.DB_NAME);
  }
  return isSupabaseConfigured();
}

export function isDatabaseWritable(): boolean {
  if (isMySQLDriver()) {
    return Boolean(process.env.DB_HOST && process.env.DB_NAME);
  }
  return isServiceRoleConfigured();
}

export const DB_MISCONFIGURED_MESSAGE =
  'Basis data belum dikonfigurasi. Periksa pengaturan MySQL (DB_HOST, DB_NAME) atau kredensial Supabase di .env.local.';

export const DB_READONLY_MESSAGE =
  'Operasi tulis basis data belum dapat dijalankan. Pastikan izin database (MySQL atau Supabase Service Role) telah dikonfigurasi.';

// ==========================================
// 1. TEAMS REPOSITORY
// ==========================================
export const dbTeams = {
  async getAll(): Promise<Team[]> {
    if (isMySQLDriver()) {
      return query<Team>(
        'SELECT id, name, short_name, logo_url, group_name, color, category, created_at FROM teams ORDER BY category, group_name, name'
      );
    }
    if (!isSupabaseConfigured()) return [];
    const { data } = await supabase.from('teams').select('*').order('group_name').order('name');
    return (data || []) as Team[];
  },

  async getById(id: string): Promise<Team | null> {
    if (isMySQLDriver()) {
      return queryOne<Team>('SELECT * FROM teams WHERE id = ?', [id]);
    }
    if (!isSupabaseConfigured()) return null;
    const { data } = await supabase.from('teams').select('*').eq('id', id).maybeSingle();
    return (data as Team) || null;
  },

  async create(team: {
    id: string;
    name: string;
    short_name: string;
    logo_url?: string | null;
    group_name: string;
    color?: string | null;
    category?: string | null;
  }): Promise<Team> {
    if (isMySQLDriver()) {
      await execute(
        'INSERT INTO teams (id, name, short_name, logo_url, group_name, color, category) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          team.id,
          team.name,
          team.short_name,
          team.logo_url || null,
          team.group_name,
          team.color || null,
          team.category || 'U10',
        ]
      );
      const created = await this.getById(team.id);
      return created!;
    }
    const sb = getServiceSupabase();
    const { data, error } = await sb.from('teams').insert(team).select().single();
    if (error) throw error;
    return data as Team;
  },

  async update(id: string, patch: Partial<Team>): Promise<Team | null> {
    if (isMySQLDriver()) {
      const keys = Object.keys(patch).filter((k) => k !== 'id' && k !== 'created_at');
      if (keys.length === 0) return this.getById(id);
      const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ');
      const values = keys.map((k) => (patch as any)[k]);
      values.push(id);
      await execute(`UPDATE teams SET ${setClause} WHERE id = ?`, values);
      return this.getById(id);
    }
    const sb = getServiceSupabase();
    const { data, error } = await sb.from('teams').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return (data as Team) || null;
  },

  async delete(id: string): Promise<boolean> {
    if (isMySQLDriver()) {
      const res = await execute('DELETE FROM teams WHERE id = ?', [id]);
      return res.affectedRows > 0;
    }
    const sb = getServiceSupabase();
    const { error } = await sb.from('teams').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

// ==========================================
// 2. MATCHES REPOSITORY
// ==========================================
export const dbMatches = {
  async getAll(filters?: {
    status?: string | null;
    date?: string | null;
    group?: string | null;
    category?: string | null;
  }): Promise<MatchWithTeams[]> {
    if (isMySQLDriver()) {
      const whereClauses: string[] = [];
      const params: any[] = [];
      if (filters?.status) {
        whereClauses.push('m.status = ?');
        params.push(filters.status);
      }
      if (filters?.date) {
        whereClauses.push('m.match_date = ?');
        params.push(filters.date);
      }
      if (filters?.group) {
        whereClauses.push('m.group_name = ?');
        params.push(filters.group);
      }
      if (filters?.category) {
        whereClauses.push('m.category = ?');
        params.push(filters.category);
      }
      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      const rows = await query<any>(`
        SELECT 
          m.id, m.team_a_id, m.team_b_id, m.score_a, m.score_b, m.status,
          DATE_FORMAT(m.match_date, '%Y-%m-%d') as match_date,
          TIME_FORMAT(m.kickoff_time, '%H:%i:%s') as kickoff_time,
          m.field, m.stage, m.group_name, m.category, m.updated_at,
          m.penalty_score_a, m.penalty_score_b, m.winner_team_id, m.notes,
          ta.id as ta_id, ta.name as ta_name, ta.short_name as ta_short_name, ta.logo_url as ta_logo_url, ta.group_name as ta_group_name, ta.color as ta_color, ta.category as ta_category, ta.created_at as ta_created_at,
          tb.id as tb_id, tb.name as tb_name, tb.short_name as tb_short_name, tb.logo_url as tb_logo_url, tb.group_name as tb_group_name, tb.color as tb_color, tb.category as tb_category, tb.created_at as tb_created_at
        FROM matches m
        LEFT JOIN teams ta ON m.team_a_id = ta.id
        LEFT JOIN teams tb ON m.team_b_id = tb.id
        ${whereSql}
        ORDER BY m.match_date, m.kickoff_time, m.field
      `, params);

      return rows.map((r) => ({
        id: r.id,
        team_a_id: r.team_a_id,
        team_b_id: r.team_b_id,
        score_a: r.score_a,
        score_b: r.score_b,
        status: r.status,
        match_date: r.match_date,
        kickoff_time: r.kickoff_time,
        field: r.field,
        stage: r.stage,
        group_name: r.group_name,
        category: r.category,
        updated_at: r.updated_at,
        penalty_score_a: r.penalty_score_a !== null && r.penalty_score_a !== undefined ? Number(r.penalty_score_a) : null,
        penalty_score_b: r.penalty_score_b !== null && r.penalty_score_b !== undefined ? Number(r.penalty_score_b) : null,
        winner_team_id: r.winner_team_id ?? null,
        notes: r.notes ?? null,
        team_a: {
          id: r.ta_id,
          name: r.ta_name,
          short_name: r.ta_short_name,
          logo_url: r.ta_logo_url,
          group_name: r.ta_group_name,
          color: r.ta_color,
          category: r.ta_category,
          created_at: r.ta_created_at,
        },
        team_b: {
          id: r.tb_id,
          name: r.tb_name,
          short_name: r.tb_short_name,
          logo_url: r.tb_logo_url,
          group_name: r.tb_group_name,
          color: r.tb_color,
          category: r.tb_category,
          created_at: r.tb_created_at,
        },
      }));
    }

    if (!isSupabaseConfigured()) return [];
    let q = supabase
      .from('matches')
      .select('*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*)')
      .order('match_date')
      .order('kickoff_time')
      .order('field');

    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.date) q = q.eq('match_date', filters.date);
    if (filters?.group) q = q.eq('group_name', filters.group);
    if (filters?.category) q = q.eq('category', filters.category);

    const { data } = await q;
    return (data || []) as MatchWithTeams[];
  },

  async autoStartDueMatches(): Promise<number> {
    const now = new Date();
    if (isMySQLDriver()) {
      try {
        const rows = await query<{ id: string; match_date: string; kickoff_time: string }>(
          "SELECT id, DATE_FORMAT(match_date, '%Y-%m-%d') as match_date, TIME_FORMAT(kickoff_time, '%H:%i:%s') as kickoff_time FROM matches WHERE status = 'scheduled'"
        );
        const dueIds = rows
          .filter((m) => {
            if (!m.match_date || !m.kickoff_time) return false;
            const kickoff = new Date(`${m.match_date}T${m.kickoff_time}+07:00`);
            return !Number.isNaN(kickoff.getTime()) && kickoff.getTime() <= now.getTime();
          })
          .map((m) => m.id);
        if (dueIds.length > 0) {
          const placeholders = dueIds.map(() => '?').join(',');
          await execute(`UPDATE matches SET status = 'live' WHERE id IN (${placeholders})`, dueIds);
          return dueIds.length;
        }
      } catch (err) {
        console.warn('Auto start due matches error in MySQL:', err);
      }
      return 0;
    }

    if (!isServiceRoleConfigured()) return 0;
    try {
      const admin = getServiceSupabase();
      const { data: scheduled } = await admin
        .from('matches')
        .select('id, match_date, kickoff_time')
        .eq('status', 'scheduled')
        .limit(200);
      const dueIds = (scheduled ?? [])
        .filter((m) => {
          if (!m.match_date || !m.kickoff_time) return false;
          const kickoff = new Date(`${m.match_date}T${m.kickoff_time}+07:00`);
          return !Number.isNaN(kickoff.getTime()) && kickoff.getTime() <= now.getTime();
        })
        .map((m) => m.id);
      if (dueIds.length > 0) {
        await admin
          .from('matches')
          .update({ status: 'live', updated_at: now.toISOString() })
          .in('id', dueIds);
        return dueIds.length;
      }
    } catch {
      // Best-effort
    }
    return 0;
  },

  async getById(id: string): Promise<MatchWithTeams | null> {
    if (isMySQLDriver()) {
      const rows = await query<any>(
        `SELECT 
          m.id, m.team_a_id, m.team_b_id, m.score_a, m.score_b, m.status,
          DATE_FORMAT(m.match_date, '%Y-%m-%d') as match_date,
          TIME_FORMAT(m.kickoff_time, '%H:%i:%s') as kickoff_time,
          m.field, m.stage, m.group_name, m.category, m.updated_at,
          m.penalty_score_a, m.penalty_score_b, m.winner_team_id, m.notes,
          ta.id as ta_id, ta.name as ta_name, ta.short_name as ta_short_name, ta.logo_url as ta_logo_url, ta.group_name as ta_group_name, ta.color as ta_color, ta.category as ta_category, ta.created_at as ta_created_at,
          tb.id as tb_id, tb.name as tb_name, tb.short_name as tb_short_name, tb.logo_url as tb_logo_url, tb.group_name as tb_group_name, tb.color as tb_color, tb.category as tb_category, tb.created_at as tb_created_at
        FROM matches m
        LEFT JOIN teams ta ON m.team_a_id = ta.id
        LEFT JOIN teams tb ON m.team_b_id = tb.id
        WHERE m.id = ? LIMIT 1`,
        [id]
      );
      if (rows.length === 0) return null;
      const r = rows[0];
      return {
        id: r.id,
        team_a_id: r.team_a_id,
        team_b_id: r.team_b_id,
        score_a: r.score_a,
        score_b: r.score_b,
        status: r.status,
        match_date: r.match_date,
        kickoff_time: r.kickoff_time,
        field: r.field,
        stage: r.stage,
        group_name: r.group_name,
        category: r.category,
        updated_at: r.updated_at,
        penalty_score_a: r.penalty_score_a !== null && r.penalty_score_a !== undefined ? Number(r.penalty_score_a) : null,
        penalty_score_b: r.penalty_score_b !== null && r.penalty_score_b !== undefined ? Number(r.penalty_score_b) : null,
        winner_team_id: r.winner_team_id ?? null,
        notes: r.notes ?? null,
        team_a: {
          id: r.ta_id,
          name: r.ta_name,
          short_name: r.ta_short_name,
          logo_url: r.ta_logo_url,
          group_name: r.ta_group_name,
          color: r.ta_color,
          category: r.ta_category,
          created_at: r.ta_created_at,
        },
        team_b: {
          id: r.tb_id,
          name: r.tb_name,
          short_name: r.tb_short_name,
          logo_url: r.tb_logo_url,
          group_name: r.tb_group_name,
          color: r.tb_color,
          category: r.tb_category,
          created_at: r.tb_created_at,
        },
      };
    }

    const sb = getServiceSupabase();
    const { data } = await sb
      .from('matches')
      .select('*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*)')
      .eq('id', id)
      .maybeSingle();
    return (data as MatchWithTeams) || null;
  },

  async update(id: string, patch: Partial<Match>): Promise<MatchWithTeams | null> {
    if (isMySQLDriver()) {
      const keys = Object.keys(patch).filter((k) => k !== 'id' && k !== 'updated_at');
      if (keys.length > 0) {
        const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ');
        const values = keys.map((k) => (patch as any)[k]);
        values.push(id);
        await execute(`UPDATE matches SET ${setClause} WHERE id = ?`, values);
      }
      return this.getById(id);
    }

    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('matches')
      .update(patch)
      .eq('id', id)
      .select('*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*)')
      .maybeSingle();
    if (error) throw error;
    return (data as MatchWithTeams) || null;
  },

  async create(match: any): Promise<MatchWithTeams> {
    if (isMySQLDriver()) {
      await execute(
        `INSERT INTO matches (id, team_a_id, team_b_id, score_a, score_b, status, match_date, kickoff_time, field, stage, group_name, category, penalty_score_a, penalty_score_b, winner_team_id, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          match.id,
          match.team_a_id,
          match.team_b_id,
          match.score_a ?? 0,
          match.score_b ?? 0,
          match.status || 'scheduled',
          match.match_date,
          match.kickoff_time,
          match.field,
          match.stage || 'grup',
          match.group_name || null,
          match.category || 'U10',
          match.penalty_score_a ?? null,
          match.penalty_score_b ?? null,
          match.winner_team_id ?? null,
          match.notes ?? null,
        ]
      );
      const created = await this.getById(match.id);
      return created!;
    }
    const sb = getServiceSupabase();
    const { data, error } = await sb
      .from('matches')
      .insert(match)
      .select('*, team_a:teams!matches_team_a_id_fkey(*), team_b:teams!matches_team_b_id_fkey(*)')
      .single();
    if (error) throw error;
    return data as MatchWithTeams;
  },

  async delete(id: string): Promise<boolean> {
    if (isMySQLDriver()) {
      const res = await execute('DELETE FROM matches WHERE id = ?', [id]);
      return res.affectedRows > 0;
    }
    const sb = getServiceSupabase();
    const { error } = await sb.from('matches').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

// ==========================================
// 3. EVENT SETTINGS REPOSITORY
// ==========================================
export const dbSettings = {
  async ensureColumns(): Promise<void> {
    if (isMySQLDriver()) {
      try {
        const cols = await query<any>("SHOW COLUMNS FROM event_settings LIKE 'active_category'");
        if (cols.length === 0) {
          await execute("ALTER TABLE event_settings ADD COLUMN `active_category` VARCHAR(10) DEFAULT 'U12'");
        }
        const colsDate = await query<any>("SHOW COLUMNS FROM event_settings LIKE 'active_date'");
        if (colsDate.length === 0) {
          await execute("ALTER TABLE event_settings ADD COLUMN `active_date` DATE DEFAULT '2026-10-10'");
        }
        const colsPts = await query<any>("SHOW COLUMNS FROM event_settings LIKE 'points_per_win'");
        if (colsPts.length === 0) {
          await execute("ALTER TABLE event_settings ADD COLUMN `points_per_win` INT DEFAULT 3");
        }
      } catch {
        // Abaikan jika tabel belum dibuat atau hak akses terbatas
      }
    }
  },

  async get(): Promise<EventSettings | null> {
    if (isMySQLDriver()) {
      await this.ensureColumns();
      const row = await queryOne<any>(`
        SELECT 
          id, event_name,
          DATE_FORMAT(start_date, '%Y-%m-%d') as start_date,
          DATE_FORMAT(end_date, '%Y-%m-%d') as end_date,
          location, map_url, rules_text, tiebreak_rules, contact_info,
          passcode_field_1, passcode_field_2, passcode_scorer,
          active_category,
          DATE_FORMAT(active_date, '%Y-%m-%d') as active_date,
          COALESCE(points_per_win, 3) as points_per_win
        FROM event_settings LIMIT 1
      `);
      return row || null;
    }
    if (!isSupabaseConfigured()) return null;
    const { data } = await supabase.from('event_settings').select('*').limit(1).maybeSingle();
    return (data as EventSettings) || null;
  },

  async update(patch: Partial<EventSettings>): Promise<EventSettings | null> {
    if (isMySQLDriver()) {
      await this.ensureColumns();
      const existing = await this.get();
      if (!existing) {
        const id = 'f1bc52dd-0df6-4855-a179-bd48875935b6';
        await execute(
          `INSERT INTO event_settings (id, event_name, start_date, end_date, location, map_url, rules_text, tiebreak_rules, contact_info, active_category, active_date, points_per_win)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            patch.event_name || 'An-Nur Mini Soccer',
            patch.start_date || '2026-10-09',
            patch.end_date || '2026-10-10',
            patch.location || 'Lapangan An-Nur',
            patch.map_url || null,
            patch.rules_text || null,
            patch.tiebreak_rules || 'poin → selisih gol → gol masuk',
            patch.contact_info || null,
            patch.active_category || 'U12',
            patch.active_date || '2026-10-10',
            patch.points_per_win || 3,
          ]
        );
        return this.get();
      }
      const keys = Object.keys(patch).filter((k) => k !== 'id');
      const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ');
      const values = keys.map((k) => (patch as any)[k]);
      values.push(existing.id);
      await execute(`UPDATE event_settings SET ${setClause} WHERE id = ?`, values);
      return this.get();
    }

    const sb = getServiceSupabase();
    const { data, error } = await sb.from('event_settings').update(patch).select().single();
    if (error) throw error;
    return data as EventSettings;
  },
};

// ==========================================
// 4. SPONSORS REPOSITORY
// ==========================================
export const dbSponsors = {
  async getAll(includeInactive = false): Promise<Sponsor[]> {
    if (isMySQLDriver()) {
      const sql = includeInactive
        ? 'SELECT * FROM sponsors ORDER BY display_order ASC, name ASC'
        : 'SELECT * FROM sponsors WHERE active = 1 ORDER BY display_order ASC, name ASC';
      const rows = await query<any>(sql);
      return rows.map((r) => ({ ...r, active: Boolean(r.active) }));
    }
    // Fallback to Supabase / local
    let q = supabase.from('sponsors').select('*');
    if (!includeInactive) q = q.eq('active', true);
    const { data } = await q;
    return (data || []) as Sponsor[];
  },

  async create(sponsor: Sponsor): Promise<Sponsor> {
    if (isMySQLDriver()) {
      await execute(
        'INSERT INTO sponsors (id, name, logo_url, tier, website_url, display_order, active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [
          sponsor.id,
          sponsor.name,
          sponsor.logo_url,
          sponsor.tier,
          sponsor.website_url || null,
          sponsor.display_order ?? 0,
          sponsor.active ? 1 : 0,
        ]
      );
      return sponsor;
    }
    const sb = getServiceSupabase();
    const { data, error } = await sb.from('sponsors').insert(sponsor).select().single();
    if (error) throw error;
    return data as Sponsor;
  },

  async update(id: string, patch: Partial<Sponsor>): Promise<Sponsor | null> {
    if (isMySQLDriver()) {
      const keys = Object.keys(patch).filter((k) => k !== 'id' && k !== 'created_at');
      if (keys.length > 0) {
        const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ');
        const values = keys.map((k) => {
          if (k === 'active') return (patch as any)[k] ? 1 : 0;
          return (patch as any)[k];
        });
        values.push(id);
        await execute(`UPDATE sponsors SET ${setClause} WHERE id = ?`, values);
      }
      const updated = await queryOne<any>('SELECT * FROM sponsors WHERE id = ?', [id]);
      return updated ? { ...updated, active: Boolean(updated.active) } : null;
    }
    const sb = getServiceSupabase();
    const { data, error } = await sb.from('sponsors').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return (data as Sponsor) || null;
  },

  async delete(id: string): Promise<boolean> {
    if (isMySQLDriver()) {
      const res = await execute('DELETE FROM sponsors WHERE id = ?', [id]);
      return res.affectedRows > 0;
    }
    const sb = getServiceSupabase();
    const { error } = await sb.from('sponsors').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

// ==========================================
// 5. MATCH EVENTS REPOSITORY
// ==========================================
export const dbMatchEvents = {
  async getByMatchId(matchId: string): Promise<MatchEvent[]> {
    if (isMySQLDriver()) {
      return query<MatchEvent>(
        'SELECT * FROM match_events WHERE match_id = ? ORDER BY minute ASC, created_at ASC',
        [matchId]
      );
    }
    const { data } = await supabase
      .from('match_events')
      .select('*')
      .eq('match_id', matchId)
      .order('minute', { ascending: true })
      .order('created_at', { ascending: true });
    return (data || []) as MatchEvent[];
  },

  async getById(id: string): Promise<MatchEvent | null> {
    if (isMySQLDriver()) {
      return queryOne<MatchEvent>('SELECT * FROM match_events WHERE id = ?', [id]);
    }
    const { data } = await supabase.from('match_events').select('*').eq('id', id).maybeSingle();
    return (data as MatchEvent) || null;
  },

  async create(ev: MatchEvent): Promise<MatchEvent> {
    if (isMySQLDriver()) {
      await execute(
        'INSERT INTO match_events (id, match_id, team_id, player_id, player_name, type, minute, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [
          ev.id,
          ev.match_id,
          ev.team_id,
          ev.player_id || null,
          ev.player_name,
          ev.type,
          ev.minute,
          ev.note || null,
        ]
      );
      return ev;
    }
    const sb = getServiceSupabase();
    const { data, error } = await sb.from('match_events').insert(ev).select().single();
    if (error) throw error;
    return data as MatchEvent;
  },

  async delete(id: string): Promise<boolean> {
    if (isMySQLDriver()) {
      const res = await execute('DELETE FROM match_events WHERE id = ?', [id]);
      return res.affectedRows > 0;
    }
    const sb = getServiceSupabase();
    const { error } = await sb.from('match_events').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

// ==========================================
// 6. PLAYERS REPOSITORY
// ==========================================
export const dbPlayers = {
  async getAll(teamId?: string): Promise<Player[]> {
    if (isMySQLDriver()) {
      if (teamId) {
        return query<Player>(
          'SELECT id, team_id, name, jersey_number, position, created_at FROM players WHERE team_id = ? ORDER BY jersey_number IS NULL, jersey_number ASC, name ASC',
          [teamId]
        );
      }
      return query<Player>(
        'SELECT id, team_id, name, jersey_number, position, created_at FROM players ORDER BY jersey_number IS NULL, jersey_number ASC, name ASC'
      );
    }
    let q = supabase
      .from('players')
      .select('*')
      .order('jersey_number', { nullsFirst: false })
      .order('name');
    if (teamId) q = q.eq('team_id', teamId);
    const { data } = await q;
    return (data || []) as Player[];
  },

  async getById(id: string): Promise<Player | null> {
    if (isMySQLDriver()) {
      return queryOne<Player>('SELECT * FROM players WHERE id = ?', [id]);
    }
    const { data } = await supabase.from('players').select('*').eq('id', id).maybeSingle();
    return (data as Player) || null;
  },

  async create(player: {
    id?: string;
    team_id: string;
    name: string;
    jersey_number?: number | null;
    position?: string | null;
  }): Promise<Player> {
    const id = player.id || crypto.randomUUID();
    if (isMySQLDriver()) {
      await execute(
        'INSERT INTO players (id, team_id, name, jersey_number, position) VALUES (?, ?, ?, ?, ?)',
        [id, player.team_id, player.name, player.jersey_number ?? null, player.position ?? null]
      );
      return (await this.getById(id))!;
    }
    const sb = getServiceSupabase();
    const { data, error } = await sb.from('players').insert({ ...player, id }).select().single();
    if (error) throw error;
    return data as Player;
  },

  async update(id: string, patch: Partial<Player>): Promise<Player | null> {
    if (isMySQLDriver()) {
      const keys = Object.keys(patch).filter((k) => k !== 'id' && k !== 'created_at');
      if (keys.length > 0) {
        const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ');
        const values = keys.map((k) => (patch as any)[k]);
        values.push(id);
        await execute(`UPDATE players SET ${setClause} WHERE id = ?`, values);
      }
      return this.getById(id);
    }
    const sb = getServiceSupabase();
    const { data, error } = await sb.from('players').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return (data as Player) || null;
  },

  async delete(id: string): Promise<boolean> {
    if (isMySQLDriver()) {
      const res = await execute('DELETE FROM players WHERE id = ?', [id]);
      return res.affectedRows > 0;
    }
    const sb = getServiceSupabase();
    const { error } = await sb.from('players').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

// ==========================================
// 7. TOURNAMENT ARCHIVES REPOSITORY
// ==========================================
export const dbArchives = {
  async ensureTable(): Promise<void> {
    if (isMySQLDriver()) {
      try {
        await execute(`
          CREATE TABLE IF NOT EXISTS \`tournament_archives\` (
            \`id\` VARCHAR(36) NOT NULL,
            \`name\` VARCHAR(255) NOT NULL,
            \`category\` VARCHAR(10) NOT NULL DEFAULT 'U10',
            \`match_date\` DATE DEFAULT NULL,
            \`description\` TEXT DEFAULT NULL,
            \`snapshot_data\` LONGTEXT NOT NULL,
            \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (\`id\`),
            KEY \`idx_archive_category\` (\`category\`),
            KEY \`idx_archive_created\` (\`created_at\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);
      } catch {
        // Abaikan jika tabel sudah ada atau izin DDL terbatas
      }
    }
  },

  async getAll(): Promise<TournamentArchive[]> {
    if (isMySQLDriver()) {
      await this.ensureTable();
      const rows = await query<any>(
        "SELECT id, name, category, DATE_FORMAT(match_date, '%Y-%m-%d') as match_date, description, snapshot_data, created_at FROM tournament_archives ORDER BY created_at DESC"
      );
      return rows.map((r) => {
        let snapshot = {} as any;
        try {
          snapshot = typeof r.snapshot_data === 'string' ? JSON.parse(r.snapshot_data) : r.snapshot_data;
        } catch {}
        return {
          id: r.id,
          name: r.name,
          category: r.category,
          match_date: r.match_date,
          description: r.description,
          snapshot_data: snapshot,
          created_at: r.created_at,
        };
      });
    }

    if (!isSupabaseConfigured()) return [];
    try {
      const { data } = await supabase.from('tournament_archives').select('*').order('created_at', { ascending: false });
      return ((data || []) as any[]).map((r) => ({
        ...r,
        snapshot_data: typeof r.snapshot_data === 'string' ? JSON.parse(r.snapshot_data) : r.snapshot_data,
      }));
    } catch {
      return [];
    }
  },

  async getById(id: string): Promise<TournamentArchive | null> {
    if (isMySQLDriver()) {
      await this.ensureTable();
      const r = await queryOne<any>(
        "SELECT id, name, category, DATE_FORMAT(match_date, '%Y-%m-%d') as match_date, description, snapshot_data, created_at FROM tournament_archives WHERE id = ?",
        [id]
      );
      if (!r) return null;
      let snapshot = {} as any;
      try {
        snapshot = typeof r.snapshot_data === 'string' ? JSON.parse(r.snapshot_data) : r.snapshot_data;
      } catch {}
      return {
        id: r.id,
        name: r.name,
        category: r.category,
        match_date: r.match_date,
        description: r.description,
        snapshot_data: snapshot,
        created_at: r.created_at,
      };
    }

    if (!isSupabaseConfigured()) return null;
    try {
      const { data } = await supabase.from('tournament_archives').select('*').eq('id', id).maybeSingle();
      if (!data) return null;
      return {
        ...data,
        snapshot_data: typeof data.snapshot_data === 'string' ? JSON.parse(data.snapshot_data) : data.snapshot_data,
      };
    } catch {
      return null;
    }
  },

  async create(archive: {
    id?: string;
    name: string;
    category: string;
    match_date?: string | null;
    description?: string | null;
    snapshot_data: any;
  }): Promise<TournamentArchive> {
    const id = archive.id || crypto.randomUUID();
    const snapshotStr = typeof archive.snapshot_data === 'string' ? archive.snapshot_data : JSON.stringify(archive.snapshot_data);

    if (isMySQLDriver()) {
      await this.ensureTable();
      await execute(
        'INSERT INTO tournament_archives (id, name, category, match_date, description, snapshot_data) VALUES (?, ?, ?, ?, ?, ?)',
        [
          id,
          archive.name,
          archive.category || 'U10',
          archive.match_date || null,
          archive.description || null,
          snapshotStr,
        ]
      );
      return (await this.getById(id))!;
    }

    const sb = getServiceSupabase();
    const { data, error } = await sb.from('tournament_archives').insert({
      id,
      name: archive.name,
      category: archive.category,
      match_date: archive.match_date || null,
      description: archive.description || null,
      snapshot_data: archive.snapshot_data,
    }).select().single();
    if (error) throw error;
    return data as TournamentArchive;
  },

  async update(id: string, patch: Partial<TournamentArchive>): Promise<TournamentArchive | null> {
    if (isMySQLDriver()) {
      await this.ensureTable();
      const keys = Object.keys(patch).filter((k) => k !== 'id' && k !== 'created_at');
      if (keys.length > 0) {
        const setClause = keys.map((k) => `\`${k}\` = ?`).join(', ');
        const values = keys.map((k) => {
          if (k === 'snapshot_data') {
            return typeof (patch as any)[k] === 'string' ? (patch as any)[k] : JSON.stringify((patch as any)[k]);
          }
          return (patch as any)[k];
        });
        values.push(id);
        await execute(`UPDATE tournament_archives SET ${setClause} WHERE id = ?`, values);
      }
      return this.getById(id);
    }

    const sb = getServiceSupabase();
    const { data, error } = await sb.from('tournament_archives').update(patch).eq('id', id).select().maybeSingle();
    if (error) throw error;
    return (data as TournamentArchive) || null;
  },

  async delete(id: string): Promise<boolean> {
    if (isMySQLDriver()) {
      await this.ensureTable();
      const res = await execute('DELETE FROM tournament_archives WHERE id = ?', [id]);
      return res.affectedRows > 0;
    }

    const sb = getServiceSupabase();
    const { error } = await sb.from('tournament_archives').delete().eq('id', id);
    if (error) throw error;
    return true;
  },
};

