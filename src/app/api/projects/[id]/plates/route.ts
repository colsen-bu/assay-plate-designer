import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPlates, createPlate } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const plates = await getPlates(id, userId);
    return NextResponse.json(plates);
  } catch (error) {
    console.error('Error in GET /api/projects/[id]/plates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plates' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, plate_type, description, tags, status } = body;

    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Plate name is required' },
        { status: 400 }
      );
    }

    if (!plate_type || typeof plate_type !== 'number') {
      return NextResponse.json(
        { error: 'Plate type is required' },
        { status: 400 }
      );
    }

    const plate = await createPlate({
      project_id: id,
      name,
      plate_type,
      description,
      created_by: userId,
      tags: tags || [],
      status: status || 'draft'
    });

    return NextResponse.json(plate, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/projects/[id]/plates:', error);
    return NextResponse.json(
      { error: 'Failed to create plate' },
      { status: 500 }
    );
  }
}
