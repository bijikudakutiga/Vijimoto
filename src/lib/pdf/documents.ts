import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ------------------------------------------------------------
// Helper: ambil logo dari /public/icons dan ubah jadi data URL,
// supaya bisa disisipkan ke PDF (dijalankan di browser).
// ------------------------------------------------------------
async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/icons/icon-192.png");
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function formatRupiah(v: number) {
  return "Rp " + Math.round(v).toLocaleString("id-ID");
}
function formatDate(d: string | null | undefined) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

type SaleItemLine = {
  product_name: string;
  unit_name: string;
  qty: number;
  unit_price: number;
  discount_amount: number;
  subtotal: number;
};

type CustomerInfo = {
  name: string;
  address: string;
  phone: string;
};

type SaleHeaderInfo = {
  sale_number: string;
  sale_date: string;
  due_date: string;
  subtotal: number;
  discount_amount: number;
  tax_enabled: boolean;
  tax_percent: number;
  tax_amount: number;
  total: number;
};

async function drawHeader(doc: jsPDF, docTitle: string, docNumber: string) {
  const logo = await loadLogoDataUrl();
  if (logo) {
    doc.addImage(logo, "PNG", 14, 12, 16, 16);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(43, 36, 32);
  doc.text("Vijimoto", logo ? 34 : 14, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(107, 96, 88);
  doc.text("Super POS", logo ? 34 : 14, 25);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(232, 93, 44);
  doc.text(docTitle, 196, 20, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(43, 36, 32);
  doc.text(docNumber, 196, 26, { align: "right" });

  doc.setDrawColor(240, 226, 214);
  doc.line(14, 34, 196, 34);
}

// ------------------------------------------------------------
// INVOICE
// ------------------------------------------------------------
export async function generateInvoicePdf({
  invoiceNumber,
  sale,
  customer,
  items,
}: {
  invoiceNumber: string;
  sale: SaleHeaderInfo;
  customer: CustomerInfo;
  items: SaleItemLine[];
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await drawHeader(doc, "INVOICE", invoiceNumber);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(107, 96, 88);
  doc.text("DITAGIHKAN KEPADA", 14, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(43, 36, 32);
  doc.text(customer.name, 14, 48);
  doc.text(customer.address || "-", 14, 53, { maxWidth: 90 });
  doc.text(customer.phone || "-", 14, 58);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(107, 96, 88);
  doc.text("TANGGAL", 140, 42);
  doc.text("JATUH TEMPO", 140, 50);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(43, 36, 32);
  doc.text(formatDate(sale.sale_date), 140, 46);
  doc.text(formatDate(sale.due_date), 140, 54);

  autoTable(doc, {
    startY: 65,
    head: [["Produk", "Qty", "Satuan", "Harga", "Diskon", "Subtotal"]],
    body: items.map((it) => [
      it.product_name,
      String(it.qty),
      it.unit_name,
      formatRupiah(it.unit_price),
      formatRupiah(it.discount_amount),
      formatRupiah(it.subtotal),
    ]),
    styles: { fontSize: 9, textColor: [43, 36, 32], cellPadding: 3 },
    headStyles: { fillColor: [232, 93, 44], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [255, 246, 240] },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const summaryX = 140;
  doc.setFontSize(10);
  doc.setTextColor(107, 96, 88);
  doc.text("Subtotal", summaryX, finalY);
  doc.text(formatRupiah(sale.subtotal), 196, finalY, { align: "right" });
  doc.text("Diskon", summaryX, finalY + 6);
  doc.text("- " + formatRupiah(sale.discount_amount), 196, finalY + 6, { align: "right" });
  if (sale.tax_enabled) {
    doc.text(`Pajak (${sale.tax_percent}%)`, summaryX, finalY + 12);
    doc.text(formatRupiah(sale.tax_amount), 196, finalY + 12, { align: "right" });
  }
  const totalY = finalY + (sale.tax_enabled ? 20 : 14);
  doc.setDrawColor(240, 226, 214);
  doc.line(summaryX, totalY - 4, 196, totalY - 4);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(198, 74, 31);
  doc.text("TOTAL", summaryX, totalY + 2);
  doc.text(formatRupiah(sale.total), 196, totalY + 2, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 140, 132);
  doc.text("Terima kasih atas kepercayaan Anda berbelanja di Vijimoto.", 14, 285);

  doc.save(`${invoiceNumber.replace(/\//g, "-")}.pdf`);
}

// ------------------------------------------------------------
// SURAT JALAN
// ------------------------------------------------------------
export async function generateSuratJalanPdf({
  sjNumber,
  sale,
  customer,
  items,
  courier,
}: {
  sjNumber: string;
  sale: { sale_number: string; sale_date: string };
  customer: CustomerInfo;
  items: SaleItemLine[];
  courier?: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  await drawHeader(doc, "SURAT JALAN", sjNumber);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(107, 96, 88);
  doc.text("DIKIRIM KEPADA", 14, 42);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(43, 36, 32);
  doc.text(customer.name, 14, 48);
  doc.text(customer.address || "-", 14, 53, { maxWidth: 90 });
  doc.text(customer.phone || "-", 14, 58);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(107, 96, 88);
  doc.text("REF. PENJUALAN", 140, 42);
  doc.text("EKSPEDISI", 140, 50);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(43, 36, 32);
  doc.text(sale.sale_number, 140, 46);
  doc.text(courier || "-", 140, 54);

  autoTable(doc, {
    startY: 65,
    head: [["Produk", "Qty", "Satuan"]],
    body: items.map((it) => [it.product_name, String(it.qty), it.unit_name]),
    styles: { fontSize: 9, textColor: [43, 36, 32], cellPadding: 3 },
    headStyles: { fillColor: [31, 74, 71], textColor: 255, fontStyle: "bold" },
    alternateRowStyles: { fillColor: [255, 246, 240] },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;
  doc.setFontSize(10);
  doc.setTextColor(43, 36, 32);
  doc.text("Dikirim oleh,", 30, finalY, { align: "center" });
  doc.text("Diterima oleh,", 166, finalY, { align: "center" });
  doc.line(14, finalY + 20, 60, finalY + 20);
  doc.line(150, finalY + 20, 196, finalY + 20);

  doc.save(`${sjNumber.replace(/\//g, "-")}.pdf`);
}
