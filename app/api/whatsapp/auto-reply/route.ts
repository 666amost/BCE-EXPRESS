// app/api/whatsapp/auto-reply/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Add OPTIONS method to handle pre-flight checks
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

// Add GET method for health checks
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    service: 'whatsapp-auto-reply',
    timestamp: new Date().toISOString()
  });
}

// ================== Types ==================
interface MessageData {
  from: string;
  fromMe: boolean;
  body?: string;
}
interface WahaWebhookBody {
  event: 'message' | 'ack' | 'presence' | string;
  session: string;
  payload: MessageData;
}

// ================== Handler ==================
export async function POST(req: NextRequest) {
  try {
    // Body must be read ONCE to avoid "Body is unusable" errors
    let body: WahaWebhookBody;
    
    try {
      const raw = await req.text();
      body = JSON.parse(raw);
    } catch (parseError) {
      // Return 200 OK even for parsing errors to prevent retry loops
      return NextResponse.json({ ok: true, skipped: true, reason: 'invalid_payload' });
    }

    // Ignore non-message events or messages without text
    if (body.event !== 'message' || !body.payload?.body) {
      return NextResponse.json({ ok: true, info: `Event '${body.event}' ignored` });
    }

    const { from, fromMe } = body.payload;
    
    // Skip messages from bot or group chats
    if (fromMe || from.endsWith('@g.us')) {
      return NextResponse.json({ ok: true, info: 'Message from bot or group chat, skipped' });
    }

    const replyText = `Untuk pertanyaan mengenai pengiriman bisa hubungi Admin di area pengiriman.\n\nWhatsapp ini hanya chat otomatis untuk laporan paket diterima.\n\nAkses bcexp.id untuk tracking paket dengan input no AWB.\n\nTERIMA KASIH.`;

    try {
      await sendTextSafe(from, replyText); // fast send, no typing/delay to avoid 524
    } catch (sendError) {
      // Log error but still return success to prevent retry loops
      // Return 200 OK even for WAHA API errors
      return NextResponse.json({ 
        ok: true, 
        warning: 'Failed to send message but webhook accepted',
        error: sendError instanceof Error ? sendError.message : String(sendError)
      });
    }
    
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    // Return 200 OK even for other errors to prevent retry loops
    return NextResponse.json({ 
      ok: true, 
      error: 'Error processing webhook', 
      details: err instanceof Error ? err.message : String(err) 
    });
  }
}

// ================== Helpers ==================
function normalizePhoneNumber(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('08')) return '62' + digits.slice(1);
  if (digits.startsWith('8')) return '62' + digits;
  return digits;
}

/**
 * Send text quickly to WAHA without long delays/typing to prevent CF 524 timeout.
 * We add a local timeout using AbortController and log WAHA responses.
 */
async function sendTextSafe(phoneOrGroup: string, text: string) {
  // Exit early if WAHA not configured
  if (!process.env.WAHA_API_URL) {
    throw new Error('WAHA_API_URL not configured');
  }
  
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.WAHA_API_KEY) headers['X-Api-Key'] = process.env.WAHA_API_KEY;

  const chatId = /@(c|g)\.us$/.test(phoneOrGroup)
    ? phoneOrGroup
    : `${normalizePhoneNumber(phoneOrGroup)}@c.us`;

  const session = process.env.WAHA_SESSION || 'default';

  // Use a shorter timeout for webhook calls to prevent 524 errors
  const controller = new AbortController();
  const timeoutMs = Number(process.env.WAHA_TIMEOUT_MS ?? 8000); // 8s default, faster than previous 15s
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let retryCount = 0;
  const maxRetries = 1; // Only retry once for webhook calls
  
  try {
    while (true) {
      try {
        const res = await fetch(`${process.env.WAHA_API_URL}/api/sendText`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ 
            chatId, 
            text, 
            session,
            linkPreview: false // Disable link preview to speed up responses
          }),
          signal: controller.signal
        });

        let bodyText = '';
        try {
          bodyText = await res.text();
        } catch (e) {
          // If we can't get response text, continue with empty response
        }

        if (!res.ok) {
          throw new Error(`WAHA ${res.status}: ${bodyText || 'No response body'}`);
        }
        
        return bodyText ? JSON.parse(bodyText) : { success: true };
      } catch (error) {
        retryCount++;
        
        if (retryCount > maxRetries) {
          throw error;
        }
        
        // Wait briefly before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  } finally {
    clearTimeout(timer);
  }
}
