import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, role } = body;

    // Validate required fields: Name and Email
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please enter your name.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    let cleanPhone = '';
    if (phone && typeof phone === 'string') {
      let digits = phone.replace(/\D/g, '');
      if (digits.startsWith('91') && digits.length === 12) {
        digits = digits.slice(2);
      }
      if (digits.length > 10) {
        digits = digits.slice(-10);
      }
      cleanPhone = digits;
    }

    const payload = {
      timestamp: new Date().toISOString(),
      formattedDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone || 'N/A',
      role: role || 'Early Beta Tester',
      source: 'Megha Setu Waitlist',
      userAgent: req.headers.get('user-agent') || 'Unknown',
    };

    console.log('[Waitlist Submission]:', payload);

    // Save lead locally to data/waitlist_leads.json as a persistent backup
    try {
      const dataDir = path.join(process.cwd(), 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const filePath = path.join(dataDir, 'waitlist_leads.json');
      let leads = [];
      if (fs.existsSync(filePath)) {
        try {
          leads = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (_) {
          leads = [];
        }
      }
      leads.push(payload);
      fs.writeFileSync(filePath, JSON.stringify(leads, null, 2), 'utf-8');
    } catch (saveErr) {
      console.warn('[Local leads storage error]:', saveErr);
    }

    // Forward to Google Sheet Webhook if configured
    const googleSheetWebhookUrl =
      process.env.GOOGLE_SHEET_WEBHOOK_URL ||
      process.env.GOOGLE_SHEETS_WEBHOOK_URL ||
      process.env.NEXT_PUBLIC_GOOGLE_SHEET_WEBHOOK_URL;

    let savedToGoogleSheet = false;

    if (googleSheetWebhookUrl) {
      try {
        const response = await fetch(googleSheetWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          redirect: 'follow',
        });

        if (response.ok) {
          savedToGoogleSheet = true;
          console.log('[Waitlist Google Sheets Success]');
        } else {
          console.warn('[Waitlist Google Sheets Non-OK]:', response.status, response.statusText);
        }
      } catch (err) {
        console.error('[Waitlist Google Sheets Error]:', err);
      }
    } else {
      console.log(
        '[Waitlist Notice]: GOOGLE_SHEET_WEBHOOK_URL is not set yet in .env.local. Submission saved in local file and logs.'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'You have been registered for early access!',
      name: cleanName,
      email: cleanEmail,
      phone: cleanPhone,
      savedToGoogleSheet,
    });
  } catch (error: any) {
    console.error('[Waitlist API Error]:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'waitlist_leads.json');
    if (fs.existsSync(filePath)) {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return NextResponse.json({ success: true, count: data.length, leads: data });
    }
    return NextResponse.json({ success: true, count: 0, leads: [] });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Could not read leads' }, { status: 500 });
  }
}
