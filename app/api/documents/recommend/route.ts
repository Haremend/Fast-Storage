import { NextRequest, NextResponse } from 'next/server';
import { VectorService } from '@/lib/services/vector';
import { DocumentService } from '@/lib/services/documents';
import { DocumentItem } from '@/lib/types';

export async function GET(req: NextRequest) {
  try {
    const docId = req.nextUrl.searchParams.get('docId');
    if (!docId) {
      return NextResponse.json({ success: false, error: 'docId is required' }, { status: 400 });
    }

    const recHits = await VectorService.getRecommendations(docId, 4);
    const documents: DocumentItem[] = [];

    for (const hit of recHits) {
      if (hit.metadata?.docId) {
        const doc = await DocumentService.getById(hit.metadata.docId);
        if (doc) documents.push(doc);
      }
    }

    return NextResponse.json({
      success: true,
      recommendations: documents,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Recommendation failed' },
      { status: 500 }
    );
  }
}
