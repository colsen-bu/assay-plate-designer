import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserCellTypes, addOrUpdateUserCellType } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cellTypes = await getUserCellTypes(userId);
    return NextResponse.json(cellTypes);
  } catch (error) {
    console.error('Error in GET /api/user-cell-types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cell types' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cell_type_name } = body;

    if (!cell_type_name || !cell_type_name.trim()) {
      return NextResponse.json(
        { error: 'Cell type name is required' },
        { status: 400 }
      );
    }

    const cellType = await addOrUpdateUserCellType(userId, cell_type_name.trim());
    return NextResponse.json(cellType);
  } catch (error) {
    console.error('Error in POST /api/user-cell-types:', error);
    return NextResponse.json(
      { error: 'Failed to add cell type' },
      { status: 500 }
    );
  }
}
