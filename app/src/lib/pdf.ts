import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/**
 * Generates an A4 PDF Blob from a DOM element (the .doc element)
 */
export async function generateInvoicePdf(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 2, // 2x scale for sharp text and crisp logos
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.95);
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pdfWidth = 210;
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
  return pdf.output("blob");
}

/**
 * Triggers a direct browser download of the generated PDF file
 */
export async function downloadInvoicePdf(element: HTMLElement, filename: string): Promise<void> {
  const blob = await generateInvoicePdf(element);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Shares the actual PDF document via WhatsApp:
 * - On Mobile / supported browsers: Opens native WhatsApp with the PDF file attached!
 * - On Desktop browsers: Downloads the PDF instantly + opens WhatsApp Web to customer's chat.
 */
export async function shareInvoicePdf(
  element: HTMLElement,
  filename: string,
  customerName: string,
  invoiceNo: string,
  cell?: string
): Promise<{ method: "native" | "download_and_whatsapp" | "cancelled" }> {
  const blob = await generateInvoicePdf(element);
  const file = new File([blob], filename, { type: "application/pdf" });

  const cleanCell = (cell ?? "").replace(/\D/g, "");
  const text = `Dear ${customerName},\n\nPlease find your Invoice No: ${invoiceNo} (e-Signed) from SUNDAR RAM FIN CONSULTANCY [P] LTD attached.\n\nThank you for choosing us!`;

  // 1. Try Native Web Share API with File (Supported on Android, iOS, Windows 11 Chrome/Edge)
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: `Invoice ${invoiceNo}`,
        text: text,
      });
      return { method: "native" };
    } catch (e: any) {
      if (e.name === "AbortError") return { method: "cancelled" };
    }
  }

  // 2. Desktop Fallback:
  // Instantly download the PDF file
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);

  // Open WhatsApp Web with customer's chat
  const encodedText = encodeURIComponent(text);
  const waUrl = cleanCell
    ? `https://api.whatsapp.com/send?phone=91${cleanCell}&text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(waUrl, "_blank");

  return { method: "download_and_whatsapp" };
}
