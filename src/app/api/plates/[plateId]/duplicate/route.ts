import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { duplicatePlate } from '@/lib/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ plateId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { plateId } = await params;
    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'New plate name is required' },
        { status: 400 }
      );
    }

    const duplicatedPlate = await duplicatePlate(plateId, name, userId);
    return NextResponse.json(duplicatedPlate, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/plates/[plateId]/duplicate:', error);
    
    if (error instanceof Error && error.message.includes('not found or unauthorized')) {
      return NextResponse.json(
        { error: 'Plate not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to duplicate plate' },
      { status: 500 }
    );
  }
}
