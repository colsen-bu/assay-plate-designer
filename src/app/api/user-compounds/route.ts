import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserCompounds, addOrUpdateUserCompound } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const compounds = await getUserCompounds(userId);
    return NextResponse.json(compounds);
  } catch (error) {
    console.error('Error in GET /api/user-compounds:', error);
    return NextResponse.json(
      { error: 'Failed to fetch compounds' },
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
    const { compound_name } = body;

    if (!compound_name || !compound_name.trim()) {
      return NextResponse.json(
        { error: 'Compound name is required' },
        { status: 400 }
      );
    }

    const compound = await addOrUpdateUserCompound(userId, compound_name.trim());
    return NextResponse.json(compound);
  } catch (error) {
    console.error('Error in POST /api/user-compounds:', error);
    return NextResponse.json(
      { error: 'Failed to add compound' },
      { status: 500 }
    );
  }
}
