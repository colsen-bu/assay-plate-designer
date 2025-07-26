import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPlateTemplate, incrementTemplateUsage, createPlate, updatePlate } from '@/lib/database';

export async function POST(
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
    const { project_id, compounds, plate_name_prefix = 'Generated Plate' } = body;

    if (!project_id || !compounds || !Array.isArray(compounds)) {
      return NextResponse.json(
        { error: 'project_id and compounds array are required' },
        { status: 400 }
      );
    }

    // Get the template
    const template = await getPlateTemplate(templateId, userId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Generate plates based on template and compounds
    const generatedPlates = [];
    
    // First, identify which wells in the template are available for compounds
    const templateWells = template.template_wells || {};
    const availableWells: string[] = [];
    const controlWells: Record<string, any> = {};
    
    // Get the plate configuration to know all possible wells
    const PLATE_CONFIGURATIONS: Record<number, { rows: number; cols: number }> = {
      6: { rows: 2, cols: 3 },
      12: { rows: 3, cols: 4 },
      24: { rows: 4, cols: 6 },
      48: { rows: 6, cols: 8 },
      96: { rows: 8, cols: 12 },
      384: { rows: 16, cols: 24 }
    };
    
    const plateConfig = PLATE_CONFIGURATIONS[template.plate_type];
    if (!plateConfig) {
      return NextResponse.json(
        { error: 'Invalid plate type in template' },
        { status: 400 }
      );
    }
    
    // Generate all possible well IDs for this plate type
    const getRowLabel = (index: number): string => String.fromCharCode(65 + index);
    const allPossibleWells: string[] = [];
    for (let row = 0; row < plateConfig.rows; row++) {
      for (let col = 0; col < plateConfig.cols; col++) {
        allPossibleWells.push(`${getRowLabel(row)}${col + 1}`);
      }
    }
    
    // Separate control wells from compound wells
    allPossibleWells.forEach(wellId => {
      const well = templateWells[wellId];
      if (well) {
        // Check if this well should be preserved (has controls or specific content)
        const compound = well.compound?.toLowerCase() || '';
        const isControl = compound.includes('control') || 
                        compound.includes('blank') || 
                        compound.includes('positive') || 
                        compound.includes('negative') ||
                        compound.includes('dmso') ||
                        well.wellType === 'positive_control' ||
                        well.wellType === 'negative_control' ||
                        well.wellType === 'blank';
        
        if (isControl) {
          // This well has predefined content (controls, etc.) - preserve it
          controlWells[wellId] = { ...well };
        } else {
          // This well is available for compounds (either placeholder or will be filled)
          availableWells.push(wellId);
        }
      } else {
        // Empty well - available for compounds
        availableWells.push(wellId);
      }
    });
    
    // Calculate how many compounds can fit per plate based on concentrations and replicates
    const concentrations = template.dosing_parameters?.concentrations || [10, 1, 0.1, 0.01];
    const replicates = template.dosing_parameters?.replicates || 3;
    const wellsPerCompound = concentrations.length * replicates;
    const compoundsPerPlate = Math.floor(availableWells.length / wellsPerCompound);
    
    console.log(`Template analysis:`, {
      plateType: template.plate_type,
      totalWells: allPossibleWells.length,
      availableWells: availableWells.length,
      controlWells: Object.keys(controlWells).length,
      concentrations: concentrations.length,
      replicates,
      wellsPerCompound,
      compoundsPerPlate,
      totalCompounds: compounds.length
    });
    
    if (compoundsPerPlate === 0) {
      return NextResponse.json(
        { 
          error: 'Template does not have enough available wells for the specified dosing parameters',
          details: {
            availableWells: availableWells.length,
            wellsNeededPerCompound: wellsPerCompound,
            concentrations: concentrations.length,
            replicates
          }
        },
        { status: 400 }
      );
    }
    
    // Group compounds into plates
    const plateCount = Math.ceil(compounds.length / compoundsPerPlate);
    
    for (let plateIndex = 0; plateIndex < plateCount; plateIndex++) {
      const startCompoundIndex = plateIndex * compoundsPerPlate;
      const endCompoundIndex = Math.min(startCompoundIndex + compoundsPerPlate, compounds.length);
      const plateCompounds = compounds.slice(startCompoundIndex, endCompoundIndex);
      
      // Start with the control wells from template
      const wells: Record<string, any> = { ...controlWells };
      
      // Add compounds to available wells
      let currentWellIndex = 0;
      
      plateCompounds.forEach((compound, compoundIndex) => {
        concentrations.forEach((concentration, concIndex) => {
          for (let rep = 0; rep < replicates; rep++) {
            if (currentWellIndex < availableWells.length) {
              const wellId = availableWells[currentWellIndex];
              wells[wellId] = {
                cellType: templateWells[wellId]?.cellType || '',
                compound: compound,
                concentration: concentration.toString(),
                concentrationUnits: template.dosing_parameters?.concentration_units || 'μM',
                dilutionStep: concIndex + 1,
                replicate: rep + 1,
                titrationId: `${compound}_titration`,
                wellType: 'sample'
              };
              currentWellIndex++;
            }
          }
        });
      });
      
      // Create the plate
      const plateNumber = plateCount > 1 ? ` (${plateIndex + 1}/${plateCount})` : '';
      const plateData = {
        project_id,
        name: `${plate_name_prefix}${plateNumber}`,
        plate_type: template.plate_type,
        description: `Generated from template: ${template.name}. Contains compounds: ${plateCompounds.join(', ')}`,
        created_by: userId,
        tags: ['generated', 'template', template.name, ...plateCompounds.slice(0, 3)], // Include first few compounds as tags
        status: 'draft' as const
      };
      
      const newPlate = await createPlate(plateData);
      
      // Update the plate with wells
      if (Object.keys(wells).length > 0) {
        await updatePlate(newPlate.id, { wells }, userId);
      }
      
      generatedPlates.push({
        ...newPlate,
        wells,
        compounds: plateCompounds
      });
    }
    
    // Increment template usage count
    await incrementTemplateUsage(templateId, userId);
    
    return NextResponse.json({
      success: true,
      generated_plates: generatedPlates,
      count: generatedPlates.length
    });
    
  } catch (error) {
    console.error('Error in POST /api/plate-templates/[templateId]/generate:', error);
    return NextResponse.json(
      { error: 'Failed to generate plates from template' },
      { status: 500 }
    );
  }
}
