import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'waitlist_leads.json');
    let leads = [];
    if (fs.existsSync(filePath)) {
      try {
        leads = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (_) {
        leads = [];
      }
    }

    // Generate CSV
    const headers = ['Timestamp', 'Name', 'Email', 'Phone', 'Source'];
    const rows = leads.map((l: any) => [
      `"${l.formattedDate || l.timestamp || ''}"`,
      `"${(l.name || '').replace(/"/g, '""')}"`,
      `"${(l.email || '').replace(/"/g, '""')}"`,
      `"${(l.phone || 'N/A').replace(/"/g, '""')}"`,
      `"${(l.source || 'Waitlist').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r: string[]) => r.join(','))].join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="megha_setu_waitlist_leads.csv"',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to export CSV' }, { status: 500 });
  }
}
