import jsPDF from "jspdf";
import { AnalysisData } from "../services/attendanceService";

type ChartImages = {
  genderChart?: string;
  defaulterChart?: string;
  barChart?: string;
};

export const generatePDFReport = (data: AnalysisData, images?: ChartImages) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = 30;

  const drawHeader = () => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Attendance Analysis Report", pageWidth / 2, 15, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      `Generated on: ${new Date().toLocaleDateString()}`,
      pageWidth - margin,
      15,
      { align: "right" }
    );
  };

  const drawFooter = (pageNum: number) => {
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(
      `Page ${pageNum}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: "center" }
    );
  };

  const addNewPage = () => {
    const pageNum = doc.internal.getNumberOfPages();
    drawFooter(pageNum);
    doc.addPage();
    drawHeader();
    yPosition = 30;
  };

  drawHeader();

  // Helper for section titles
  const addSectionTitle = (title: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text(title, margin, yPosition);
    yPosition += 6;
    doc.setDrawColor(180, 180, 180);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
  };

  // Helper to draw shaded box
  const drawShadedBox = (callback: () => void) => {
    const startY = yPosition;
    callback();
    const boxHeight = yPosition - startY + 5;
    doc.setFillColor(245, 245, 245);
    doc.rect(margin - 3, startY - 3, pageWidth - 2 * margin + 6, boxHeight, "F");
  };

  // ─── Title Info ────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(30, 30, 30);
  doc.text(data.batch.class_name, pageWidth / 2, yPosition, { align: "center" });
  yPosition += 12;

  // ─── Summary Section ────────────────────────────────
  addSectionTitle("Summary Statistics");

  const summaryData = [
    ["Total Students", data.batch.total_students],
    ["Male Students", data.genderStats.male],
    ["Female Students", data.genderStats.female],
    ["Total Defaulters", `${data.defaulterStats.total} (${(
      (data.defaulterStats.total / data.batch.total_students) *
      100
    ).toFixed(1)}%)`],
    ["Male Defaulters", data.defaulterStats.male],
    ["Female Defaulters", data.defaulterStats.female],
    ["Average Attendance", `${data.insights.averageAttendance.toFixed(2)}%`],
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  summaryData.forEach(([label, value]) => {
    doc.text(label + ":", margin + 2, yPosition);
    doc.text(String(value), pageWidth - margin, yPosition, { align: "right" });
    yPosition += 7;
  });
  yPosition += 10;

  // ─── Charts Section ────────────────────────────────
  const insertImage = (dataUrl: string | undefined, caption: string) => {
    if (!dataUrl) return;
    const imgProps = (doc as any).getImageProperties(dataUrl);
    const imgWidth = pageWidth - 2 * margin;
    const imgHeight = (imgProps.height / imgProps.width) * imgWidth;

    if (yPosition + imgHeight > pageHeight - 40) addNewPage();

    doc.setDrawColor(220);
    doc.rect(margin, yPosition, imgWidth, imgHeight);
    doc.addImage(dataUrl, "PNG", margin, yPosition, imgWidth, imgHeight);
    yPosition += imgHeight + 8;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text(caption, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
  };

  addSectionTitle("Visual Insights");
  insertImage(images?.genderChart, "Gender Distribution");
  insertImage(images?.defaulterChart, "Defaulter vs Non-Defaulter");
  insertImage(images?.barChart, "Defaulters by Gender");

  // ─── Key Insights ────────────────────────────────
  addSectionTitle("Key Insights");

  const insights = [
    `Highest Attendance: ${data.insights.highestAttendance.name} (${data.insights.highestAttendance.percentage.toFixed(2)}%)`,
    `Lowest Attendance: ${data.insights.lowestAttendance.name} (${data.insights.lowestAttendance.percentage.toFixed(2)}%)`,
  ];

  insights.forEach((line) => {
    doc.text(line, margin, yPosition);
    yPosition += 7;
  });

  yPosition += 10;
  doc.setFont("helvetica", "bold");


  // ─── Defaulter List ────────────────────────────────
  if (data.defaulterStats.total > 0) {
    addNewPage();
    addSectionTitle("Defaulter List");

    const headers = ["Roll No", "Name", "Gender", "Attendance %"];
    const colWidths = [25, 60, 25, 30];
    let xPos = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    headers.forEach((header, idx) => {
      doc.text(header, xPos, yPosition);
      xPos += colWidths[idx];
    });

    yPosition += 6;
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;

    const defaulters = data.records.filter((r) => r.is_defaulter);
    doc.setFont("helvetica", "normal");

    defaulters.forEach((record) => {
      if (yPosition > pageHeight - 30) addNewPage();
      xPos = margin;
      const rowData = [
        record.roll_number,
        record.name.length > 20 ? record.name.substring(0, 20) + "..." : record.name,
        record.gender,
        `${record.attendance_percentage.toFixed(2)}%`,
      ];
      rowData.forEach((cell, idx) => {
        doc.text(String(cell), xPos, yPosition);
        xPos += colWidths[idx];
      });
      yPosition += 7;
    });
  }

  // ─── Footer ────────────────────────────────
  const finalPage = doc.internal.getNumberOfPages();
  drawFooter(finalPage);

  doc.setTextColor(100);
  doc.setFontSize(9);
  doc.text(
    "This report was auto-generated by the Attendance Monitoring System",
    pageWidth / 2,
    pageHeight - 5,
    { align: "center" }
  );

  doc.save(
    `attendance_report_${data.batch.class_name}_${new Date()
      .toISOString()
      .split("T")[0]}.pdf`
  );
};
