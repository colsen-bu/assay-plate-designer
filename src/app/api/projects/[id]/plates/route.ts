import { NextRequest, NextResponse } from 'next/server';
import { getPlates, createPlate } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const plates = await getPlates(id);
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
    const { id } = await params;
    const body = await request.json();
    const { name, plate_type, description, created_by, tags, status } = body;

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

    if (!created_by || typeof created_by !== 'string') {
      return NextResponse.json(
        { error: 'Created by is required' },
        { status: 400 }
      );
    }

    const plate = await createPlate({
      project_id: id,
      name,
      plate_type,
      description,
      created_by,
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
