import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check - you can extend this to check database connectivity
    return NextResponse.json(
      { 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        service: 'assay-plate-designer'
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: 'Service check failed',
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}
