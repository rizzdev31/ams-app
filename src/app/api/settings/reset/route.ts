import { NextResponse } from 'next/server';
import { getServiceSupabase, isServiceRoleConfigured } from '@/lib/supabase';
import { isMySQLDriver, execute } from '@/lib/mysql';
import { isDatabaseWritable, DB_READONLY_MESSAGE } from '@/lib/db';
import { requireSuperAdmin } from '@/lib/auth';
import { audit } from '@/lib/admin-users';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    const session = await requireSuperAdmin();
    if (!session) {
      return NextResponse.json({ success: false, error: 'Hanya superadmin yang bisa reset data.' }, { status: 403 });
    }

    if (!isDatabaseWritable()) {
      return NextResponse.json({ success: false, error: DB_READONLY_MESSAGE }, { status: 503 });
    }

    if (isMySQLDriver()) {
      await execute('DELETE FROM match_events');
      await execute('DELETE FROM matches');
      await execute('DELETE FROM players');
      await execute('DELETE FROM teams');
    } else {
      const adminSupabase = getServiceSupabase();
      
      const { error: matchesError } = await adminSupabase
        .from('matches')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); 

      if (matchesError) throw matchesError;

      const { error: teamsError } = await adminSupabase
        .from('teams')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (teamsError) throw teamsError;
    }

    await audit(session, 'reset_data', 'teams,matches');

    return NextResponse.json({ success: true, data: null, message: 'Semua data pertandingan dan tim telah direset' });
  } catch (error: unknown) {
    console.error('Reset data error:', error);
    return NextResponse.json({ success: false, error: (error as Error).message || 'Terjadi kesalahan' }, { status: 500 });
  }
}

