import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const WHATSAPP_SERVER = process.env.NEXT_PUBLIC_WHATSAPP_SERVER_URL || 'http://localhost:3001';

async function getUserId() {
  const cookieStore = cookies();
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: (name) => cookieStore.get(name)?.value,
      set: () => {},
      remove: () => {},
    },
  });
  
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error('Unauthorized');
  }
  return user.id;
}

async function forwardToWhatsAppServer(req: NextRequest) {
  try {
    const userId = await getUserId();

    const segments = req.nextUrl.pathname.split('/');
    const path = segments.slice(segments.indexOf('whatsapp') + 1).join('/');
    
    if (!path) {
      throw new Error('Invalid route path');
    }

    // Construct URL with /whatsapp prefix
    const requestUrl = new URL(`/whatsapp/${path}`, WHATSAPP_SERVER);
    console.log('Making request to WhatsApp server:', {
      url: requestUrl.toString(),
      method: req.method,
      path,
      originalUrl: req.nextUrl.pathname,
    });

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Origin': new URL(req.url).origin,
      'x-user-id': userId,
    };

    // Forward custom headers needed for session restoration
    const restoreSession = req.headers.get('x-restore-session');
    if (restoreSession) {
      headers['x-restore-session'] = restoreSession;
    }

    // Forward other relevant headers that may be used for session management
    const additionalHeaders = ['x-session-id', 'x-client-id'];
    for (const header of additionalHeaders) {
      const value = req.headers.get(header);
      if (value) {
        headers[header] = value;
      }
    }

    let body;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      try {
        const text = await req.text();
        if (text) {
          body = text;
          console.log('Request body:', body);
        }
      } catch (e) {
        console.error('Error reading request body:', e);
      }
    }

    const response = await fetch(requestUrl, {
      method: req.method,
      headers,
      body,
      credentials: 'include',
    });

    console.log('WhatsApp server response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url,
      headers: Object.fromEntries(response.headers.entries()),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('WhatsApp server error:', {
        status: response.status,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries()),
      });
      
      try {
        const errorJson = JSON.parse(errorText);
        return NextResponse.json(
          { 
            status: 'error',
            error: errorJson.error || `WhatsApp server returned ${response.status}`,
          },
          { status: response.status }
        );
      } catch {
        return NextResponse.json(
          { 
            status: 'error',
            error: `WhatsApp server returned ${response.status}: ${errorText}`,
          },
          { status: response.status }
        );
      }
    }

    const contentType = response.headers.get('Content-Type');
    try {
      if (contentType?.includes('application/json')) {
        const data = await response.json();
        console.log('Successful JSON response:', data);
        return NextResponse.json(data);
      } else {
        const text = await response.text();
        console.log('Successful text response:', text);
        try {
          const jsonData = JSON.parse(text);
          return NextResponse.json(jsonData);
        } catch {
          return new NextResponse(text, {
            status: response.status,
            headers: {
              'Content-Type': contentType || 'text/plain',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error processing response:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in forwardToWhatsAppServer:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: error instanceof Error ? error.message : 'Internal server error',
        details: error instanceof Error ? error.stack : undefined,
      }, 
      { status: error instanceof Error && error.message === 'Unauthorized' ? 401 : 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return forwardToWhatsAppServer(req);
}

export async function POST(req: NextRequest) {
  return forwardToWhatsAppServer(req);
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '*';
  
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, Origin, x-user-id, x-restore-session, x-session-id, x-client-id',
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Max-Age': '86400',
    },
  });
}
