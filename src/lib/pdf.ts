import puppeteer from "puppeteer";

/**
 * Generates a PDF buffer from an HTML string using Puppeteer.
 * @param html The HTML content to render into the PDF.
 * @returns A Buffer containing the PDF data.
 */
export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    
    // Set the HTML content
    await page.setContent(html, { waitUntil: "networkidle0" });
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "20mm",
        bottom: "20mm",
        left: "20mm",
      },
    });
    
    // Convert Uint8Array to Buffer
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
