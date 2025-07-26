import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function POST(request: NextRequest) {
  try {
    console.log('Creating plate_templates table...');
    
    // Create the plate_templates table
    await sql`
      CREATE TABLE IF NOT EXISTS plate_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        plate_type INTEGER NOT NULL,
        template_wells JSONB DEFAULT '{}',
        dosing_parameters JSONB DEFAULT '{}',
        control_configuration JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        last_modified TIMESTAMP DEFAULT NOW(),
        use_count INTEGER DEFAULT 0
      )
    `;
    
    console.log('Creating indexes...');
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_plate_templates_user_id ON plate_templates(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_plate_templates_created_at ON plate_templates(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_plate_templates_use_count ON plate_templates(use_count DESC)`;
    
    console.log('Template tables initialized successfully!');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Template tables initialized successfully' 
    });
    
  } catch (error) {
    console.error('Error initializing template tables:', error);
    return NextResponse.json(
      { error: 'Failed to initialize template tables' },
      { status: 500 }
    );
  }
}
