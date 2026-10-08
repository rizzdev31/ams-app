import { NextResponse } from 'next/server';
import { requireAdmin, requireSuperAdmin } from '@/lib/auth';
import {
  getSystemPasscodes,
  updateSystemPasscode,
  generateQuickAuthUrl,
} from '@/lib/operator-auth';
import { audit } from '@/lib/admin-users';
import { parseJsonBody } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json(
      { success: false, error: 'Akses terbatas untuk panitia / superadmin.' },
      { status: 403 }
    );
  }

  try {
    const origin = new URL(request.url).origin;
    const codes = await getSystemPasscodes();

    // Generate link akses langsung terenkripsi (URL containing encrypted JWT)
    const quickLinks = {
      field1: await generateQuickAuthUrl('field_1', origin),
      field2: await generateQuickAuthUrl('field_2', origin),
      scorer: await generateQuickAuthUrl('scorer', origin),
    };

    return NextResponse.json({
      success: true,
      data: {
        passcodes: {
          field1: codes.field1,
          field2: codes.field2,
          scorer: codes.scorer,
        },
        quickLinks,
        currentUserRole: session.role,
      },
    });
  } catch (error) {
    console.error('Fetch security status error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data keamanan.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  // Hanya superadmin yang berhak mengganti kode akses lapangan
  const superadmin = await requireSuperAdmin();
  if (!superadmin) {
    return NextResponse.json(
      { success: false, error: 'Hanya Superadmin yang berhak mengubah kode akses lapangan.' },
      { status: 403 }
    );
  }

  try {
    const parsed = await parseJsonBody(request);
    if (!parsed.ok) return parsed.response;

    const { target, newPasscode } = parsed.body;
    if (!target || !newPasscode || typeof newPasscode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Target dan kode akses baru wajib diisi.' },
        { status: 400 }
      );
    }

    const validTargets = ['field_1', 'field_2', 'scorer'] as const;
    if (!validTargets.includes(target)) {
      return NextResponse.json(
        { success: false, error: 'Target lapangan tidak valid.' },
        { status: 400 }
      );
    }

    await updateSystemPasscode(target, newPasscode);

    await audit(
      superadmin,
      'change_passcode',
      `passcode_${target}`,
      { newCodeMasked: `${newPasscode.slice(0, 2)}***` }
    );

    return NextResponse.json({
      success: true,
      message: `Kode akses untuk ${
        target === 'field_1' ? 'Lapangan 1' : target === 'field_2' ? 'Lapangan 2' : 'Update Skor'
      } berhasil diperbarui.`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: (err as Error).message || 'Gagal memperbarui kode akses.' },
      { status: 500 }
    );
  }
}
