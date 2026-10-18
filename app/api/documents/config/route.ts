import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ success: true, data: { externalOcrAvailable: Boolean(process.env.OCR_SERVICE_URL && process.env.OCR_API_KEY) } });
}
