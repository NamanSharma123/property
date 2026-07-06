import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

interface HealthCheck {
  status: 'healthy' | 'unhealthy' | 'down' | 'unknown';
  timestamp: string | null;
  responseTime?: number | null;
  error?: string;
  details?: Record<string, unknown>;
}

export async function GET() {
  const backendUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';
  
  const checks: {
    frontend: HealthCheck;
    backend: HealthCheck;
    overall: 'healthy' | 'degraded' | 'down';
  } = {
    frontend: { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      details: {
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      }
    },
    backend: { 
      status: 'unknown', 
      timestamp: null, 
      responseTime: null 
    },
    overall: 'healthy',
  };

  // Check backend health
  if (backendUrl) {
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${backendUrl}/health`, {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });

      clearTimeout(timeoutId);
      const data = await response.json();
      
      checks.backend = {
        status: response.ok ? 'healthy' : 'unhealthy',
        timestamp: data.timestamp || new Date().toISOString(),
        responseTime: Date.now() - start,
        details: data,
      };
    } catch (error) {
      checks.backend = {
        status: 'down',
        timestamp: null,
        responseTime: null,
        error: error instanceof Error ? error.message : 'Connection failed',
      };
      checks.overall = 'degraded';
    }
  } else {
    checks.backend = {
      status: 'unknown',
      timestamp: null,
      error: 'Backend URL not configured',
    };
    checks.overall = 'degraded';
  }

  // Determine overall status
  if (checks.backend.status === 'down') {
    checks.overall = 'down';
  } else if (checks.backend.status !== 'healthy') {
    checks.overall = 'degraded';
  }

  return NextResponse.json(checks, {
    status: checks.overall === 'healthy' ? 200 : checks.overall === 'degraded' ? 503 : 500,
  });
}
