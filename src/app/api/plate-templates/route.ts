import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPlateTemplates, createPlateTemplate } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await getPlateTemplates(userId);
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error in GET /api/plate-templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plate templates' },
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
    const { 
      name, 
      description, 
      plate_type, 
      template_wells, 
      dosing_parameters, 
      control_configuration 
    } = body;

    if (!name || !plate_type || !template_wells) {
      return NextResponse.json(
        { error: 'Name, plate_type, and template_wells are required' },
        { status: 400 }
      );
    }

    const template = await createPlateTemplate({
      user_id: userId,
      name,
      description,
      plate_type,
      template_wells,
      dosing_parameters: dosing_parameters || {},
      control_configuration: control_configuration || {}
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error in POST /api/plate-templates:', error);
    return NextResponse.json(
      { error: 'Failed to create plate template' },
      { status: 500 }
    );
  }
}
