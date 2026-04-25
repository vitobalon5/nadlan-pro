import { NextRequest, NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { createElement } from 'react';
import { createClient } from '@/lib/supabase/server';
import { ProspectusDocument } from '@/lib/export/prospectus-pdf';
import { gatherExportDataAction } from '@/app/actions/export';

/**
 * GET /api/export/prospectus?slug=<project-slug>
 *
 * Generates a branded PDF prospectus for the given project.
 * Runs server-side with react-pdf → streams PDF bytes directly to the client.
 *
 * Auth: requires active session + editor/admin role.
 *
 * Performance notes:
 *   - react-pdf is ~10MB added to the bundle, but only in this route
 *   - Font loading happens on first request per server instance (cached after)
 *   - Typical generation time: 2-5 seconds for a full prospectus
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Auth
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, full_name')
    .eq('id', user.id)
    .single();

  if (!profile?.is_active) return NextResponse.json({ error: 'Inactive' }, { status: 403 });

  // Parse query
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'Missing slug param' }, { status: 400 });

  // Gather all project data
  const result = await gatherExportDataAction(slug);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'Nadlan Pro';
  const logoText = process.env.NEXT_PUBLIC_BRAND_LOGO_TEXT ?? brandName;

  // Render PDF
  try {
    const element = createElement(ProspectusDocument, {
      data: {
        ...(result.data as any),
        generatedAt: new Date(),
        generatedBy: profile.full_name ?? user.email ?? 'Unknown',
      },
      brandName,
      logoText,
    });

    const stream = await renderToStream(element as any);

    // Convert Node.js ReadableStream → Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(new Uint8Array(chunk)));
        stream.on('end', () => controller.close());
        stream.on('error', (err) => controller.error(err));
      },
    });

    const projectName = (result.data as any).project.name.replace(/[^\p{L}\p{N}\-_ ]/gu, '');
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `prospectus-${projectName}-${dateStr}.pdf`.replace(/\s+/g, '-');

    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('PDF generation failed:', error);
    return NextResponse.json(
      { error: error.message ?? 'PDF generation failed' },
      { status: 500 }
    );
  }
}
