import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateReportStream } from '@/lib/services/ai-reports';
import type { ReportInputData } from '@/lib/services/ai-reports';

/**
 * POST /api/reports/stream
 *
 * Streams an AI-generated market report as SSE (Server-Sent Events).
 * Server Actions can't return streams directly, so we use a Route Handler.
 *
 * Body: { inputData: ReportInputData }
 *   - inputData is pre-computed by generateReportAction (gather step) and sent
 *     by the client. This keeps the heavy Supabase queries out of the hot path.
 *
 * Auth: session cookie (same as Server Actions).
 * Authorization: editor or admin.
 *
 * Events format:
 *   data: {"type":"chunk","text":"..."}
 *   data: {"type":"done","usage":{...}}
 *   data: {"type":"error","message":"..."}
 */

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .single();
  if (!profile?.is_active) return NextResponse.json({ error: 'Inactive' }, { status: 403 });
  if (profile.role !== 'admin' && profile.role !== 'editor') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse body
  let inputData: ReportInputData;
  try {
    const body = await request.json();
    inputData = body.inputData;
    if (!inputData?.project?.name || !inputData?.project?.city) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Stream SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        const iterator = generateReportStream({ input: inputData, language: 'he' });
        for await (const event of iterator) {
          if (request.signal.aborted) {
            controller.close();
            return;
          }
          send(event);
        }
        controller.close();
      } catch (error: any) {
        send({ type: 'error', message: error.message ?? 'Stream failed' });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering
    },
  });
}
