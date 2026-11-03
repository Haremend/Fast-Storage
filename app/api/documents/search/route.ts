import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '@/lib/services/documents';

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get('q') || '';
    if (!query.trim()) {
      return NextResponse.json({
        success: true,
        results: [],
        recommendations: [],
        query: '',
        totalMatched: 0,
        latencyMs: 0,
      });
    }

    const data = await DocumentService.searchSemantic(query);

    return NextResponse.json({
      success: true,
      ...data,
    });
  } catch (error) {
    console.error('Semantic search error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Semantic search failed' },
      { status: 500 }
    );
  }
}
