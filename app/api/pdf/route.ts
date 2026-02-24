import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function POST(req: NextRequest) {
  const { html } = await req.json();

  if (!html) {
    return NextResponse.json({ error: "No HTML" }, { status: 400 });
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123 });
    await page.emulateMediaType("screen");
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 });

    // Measure actual content height
    const contentHeight = await page.evaluate(() => {
      return Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight
      );
    });

    // A4 height in px at 96dpi = 1123px
    // Calculate scale to fit everything in one page
    const a4Height = 1123;
    const scale = contentHeight > a4Height ? a4Height / contentHeight : 1;

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      scale: Math.max(0.1, scale), // min 0.1
      pageRanges: "1",
    });

    await browser.close();

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=belge.pdf",
      },
    });
  } catch (err) {
    await browser.close();
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
