import { NextRequest, NextResponse } from 'next/server';
import { getPlate, updatePlate, deletePlate, duplicatePlate } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plateId: string }> }
) {
  try {
    const { plateId } = await params;
    const plate = await getPlate(plateId);
    
    if (!plate) {
      return NextResponse.json(
        { error: 'Plate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(plate);
  } catch (error) {
    console.error('Error in GET /api/plates/[plateId]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plate' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ plateId: string }> }
) {
  try {
    const { plateId } = await params;
    const body = await request.json();
    const { name, description, tags, status, wells } = body;

    const updates: {
      name?: string;
      description?: string;
      tags?: string[];
      status?: 'draft' | 'active' | 'completed' | 'archived';
      wells?: Record<string, any>;
    } = {};

    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (tags !== undefined) updates.tags = tags;
    if (status !== undefined) updates.status = status;
    if (wells !== undefined) updates.wells = wells;

    const plate = await updatePlate(plateId, updates);
    return NextResponse.json(plate);
  } catch (error) {
    console.error('Error in PUT /api/plates/[plateId]:', error);
    
    if (error instanceof Error && error.message === 'Plate not found') {
      return NextResponse.json(
        { error: 'Plate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update plate' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ plateId: string }> }
) {
  try {
    const { plateId } = await params;
    await deletePlate(plateId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/plates/[plateId]:', error);
    return NextResponse.json(
      { error: 'Failed to delete plate' },
      { status: 500 }
    );
  }
}
