import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPlateTemplate, updatePlateTemplate, deletePlateTemplate } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templateId } = await params;
    const template = await getPlateTemplate(templateId, userId);
    
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error in GET /api/plate-templates/[templateId]:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plate template' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templateId } = await params;
    const body = await request.json();
    const { 
      name, 
      description, 
      plate_type, 
      template_wells, 
      dosing_parameters, 
      control_configuration 
    } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (plate_type !== undefined) updates.plate_type = plate_type;
    if (template_wells !== undefined) updates.template_wells = template_wells;
    if (dosing_parameters !== undefined) updates.dosing_parameters = dosing_parameters;
    if (control_configuration !== undefined) updates.control_configuration = control_configuration;

    const template = await updatePlateTemplate(templateId, updates, userId);
    return NextResponse.json(template);
  } catch (error) {
    console.error('Error in PUT /api/plate-templates/[templateId]:', error);
    
    if (error instanceof Error && error.message.includes('not found or unauthorized')) {
      return NextResponse.json(
        { error: 'Template not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update plate template' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { templateId } = await params;
    await deletePlateTemplate(templateId, userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/plate-templates/[templateId]:', error);
    return NextResponse.json(
      { error: 'Failed to delete plate template' },
      { status: 500 }
    );
  }
}
