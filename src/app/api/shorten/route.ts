import { NextResponse } from 'next/server';
import { createShortLink, extractNotationFromShareUrl } from '@/lib/short-links';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const url = typeof payload?.url === 'string' ? payload.url : '';
    const notationInput = typeof payload?.notation === 'string' ? payload.notation : '';

    const notation = notationInput.trim() || (url ? extractNotationFromShareUrl(url) : null);

    if (!notation) {
      return NextResponse.json(
        { error: 'Could not find valid plate notation in request.' },
        { status: 400 }
      );
    }

    const { id } = await createShortLink(notation);
    const originHeader = request.headers.get('origin');
    const forwardedProto = request.headers.get('x-forwarded-proto');
    const forwardedHost = request.headers.get('x-forwarded-host');
    const host = request.headers.get('host');
    const fallbackOrigin = `${forwardedProto ?? 'https'}://${forwardedHost ?? host}`;
    const origin = originHeader ?? fallbackOrigin;

    return NextResponse.json({
      id,
      shortUrl: `${origin}/s/${id}`,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to create short link.' }, { status: 500 });
  }
}
