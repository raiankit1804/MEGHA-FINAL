import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contact, email, phone, name, role } = body;

    const contactValue = contact || email || phone || '';
    if (!contactValue || typeof contactValue !== 'string' || contactValue.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid email or phone number.' },
        { status: 400 }
      );
    }

    const payload = {
      timestamp: new Date().toISOString(),
      formattedDate: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      contact: contactValue.trim(),
      email: contactValue.includes('@') ? contactValue.trim() : (email || ''),
      phone: !contactValue.includes('@') ? contactValue.trim() : (phone || ''),
      name: name?.trim() || 'Anonymous Observer',
      role: role || 'Early Beta Tester',
      source: 'Megha Setu Waitlist (Waitlist 6)',
      userAgent: req.headers.get('user-agent') || 'Unknown',
    };

    console.log('[Waitlist Submission]:', payload);

    // Check for Google Sheet Webhook URL in env
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
        '[Waitlist Notice]: GOOGLE_SHEET_WEBHOOK_URL is not set yet in .env.local. Submission saved in logs.'
      );
    }

    return NextResponse.json({
      success: true,
      message: 'You have been registered for early access!',
      contact: contactValue.trim(),
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
