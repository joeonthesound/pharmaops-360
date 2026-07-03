import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function GET(request: NextRequest) {
  const recordUuid = String(request.nextUrl.searchParams.get('id') ?? '').trim();

  if (!UUID_PATTERN.test(recordUuid)) {
    return NextResponse.json(
      {
        ok: false,
        message: 'Parametro id de RUI invalido o ausente.',
      },
      { status: 400 },
    );
  }

  return NextResponse.redirect(new URL(`/mantenimiento/imprimir/${recordUuid}`, request.url));
}
