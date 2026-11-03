import { NextRequest, NextResponse } from 'next/server';
import { DocumentService } from '@/lib/services/documents';

export async function GET() {
  try {
    const documents = await DocumentService.getAll();
    return NextResponse.json({
      success: true,
      documents,
      count: documents.length,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to retrieve documents' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    
    let filename = 'document.txt';
    let mimeType = 'text/plain';
    let fileBuffer: Buffer;
    let summary: string | undefined;
    let tags: string[] = ['Uploaded'];

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;
      if (!file) {
        return NextResponse.json({ success: false, error: 'No file received' }, { status: 400 });
      }

      filename = file.name;
      mimeType = file.type || 'application/octet-stream';
      const arrayBuf = await file.arrayBuffer();
      fileBuffer = Buffer.from(arrayBuf);
      
      const formSummary = formData.get('summary') as string | null;
      if (formSummary) summary = formSummary;
      const formTags = formData.get('tags') as string | null;
      if (formTags) {
        tags = formTags.split(',').map((t) => t.trim()).filter(Boolean);
      }
    } else {
      // JSON payload upload
      const body = await req.json();
      filename = body.name || 'document.md';
      mimeType = body.type || 'text/markdown';
      fileBuffer = Buffer.from(body.content || '');
      summary = body.summary;
      if (Array.isArray(body.tags)) tags = body.tags;
    }

    const { document, taskId } = await DocumentService.uploadDocument({
      name: filename,
      buffer: fileBuffer,
      contentType: mimeType,
      summary,
      tags,
    });

    return NextResponse.json({
      success: true,
      document,
      taskId,
      message: 'Document stored in Upstash Blob; asynchronous vector indexing enqueued via QStash.',
    });
  } catch (error) {
    console.error('Document upload error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Document upload failed' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'Document id is required' }, { status: 400 });
    }

    const success = await DocumentService.deleteDocument(id);
    return NextResponse.json({
      success,
      message: success ? 'Document deleted from Blob, Vector index, and Redis cache' : 'Document not found',
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Document deletion failed' },
      { status: 500 }
    );
  }
}
