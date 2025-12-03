/**
 * PDF Export Utility
 * Generates professional PDF reports from analytics data using jsPDF
 */

import jsPDF from 'jspdf';
import 'jspdf-autotable';

/**
 * Format time in minutes to human-readable format
 */
const formatTime = (minutes) => {
  if (!minutes && minutes !== 0) return 'N/A';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

/**
 * Format date to readable string
 */
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Add header to PDF
 */
const addHeader = (doc, title) => {
  // Title
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text(title, 14, 22);

  // Generated date
  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30);
  doc.setTextColor(0);

  return 35; // Return Y position after header
};

/**
 * Add section header
 */
const addSectionHeader = (doc, title, y) => {
  doc.setFontSize(14);
  doc.setFont(undefined, 'bold');
  doc.setTextColor(49, 130, 206); // Brand blue
  doc.text(title, 14, y);
  doc.setTextColor(0);
  doc.setFont(undefined, 'normal');

  return y + 8; // Return Y position after section header
};

/**
 * Check if we need a new page
 */
const checkPageBreak = (doc, currentY, spaceNeeded = 40) => {
  if (currentY + spaceNeeded > 280) {
    doc.addPage();
    return 20; // Top margin for new page
  }
  return currentY;
};

/**
 * Export complete analytics report to PDF
 */
export const exportAnalyticsToPDF = ({ summary, trends, teamPerformance, tags, dateRange }) => {
  const doc = new jsPDF();

  let y = addHeader(doc, 'Analytics Report');

  // Date range info
  if (dateRange) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Report Period: ${dateRange}`, 14, y);
    doc.setTextColor(0);
    y += 10;
  }

  // ====== SUMMARY SECTION ======
  y = checkPageBreak(doc, y, 60);
  y = addSectionHeader(doc, '📊 Summary', y);

  if (summary) {
    doc.autoTable({
      startY: y,
      head: [['Metric', 'Value']],
      body: [
        ['Total Received', summary.totalReceived || 0],
        ['Total Resolved', summary.totalResolved || 0],
        ['Average Response Time', formatTime(summary.avgResponseTime)],
        ['Resolution Rate', summary.resolutionRate ? `${summary.resolutionRate.toFixed(1)}%` : 'N/A']
      ],
      theme: 'striped',
      headStyles: { fillColor: [49, 130, 206], fontSize: 10, fontStyle: 'bold' },
      bodyStyles: { fontSize: 10 },
      alternateRowStyles: { fillColor: [245, 250, 255] },
      margin: { left: 14, right: 14 }
    });

    y = doc.lastAutoTable.finalY + 15;
  }

  // ====== TRENDS SECTION ======
  if (trends && trends.length > 0) {
    y = checkPageBreak(doc, y, 80);
    y = addSectionHeader(doc, '📈 Volume Trends', y);

    // Prepare trend data - limit to last 10 data points for PDF
    const trendData = trends.slice(-10).map(t => [
      formatDate(t.date),
      t.received || 0,
      t.sent || 0,
      t.resolved || 0
    ]);

    doc.autoTable({
      startY: y,
      head: [['Date', 'Received', 'Sent', 'Resolved']],
      body: trendData,
      theme: 'striped',
      headStyles: { fillColor: [49, 130, 206], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 250, 255] },
      margin: { left: 14, right: 14 }
    });

    y = doc.lastAutoTable.finalY + 15;
  }

  // ====== TEAM PERFORMANCE SECTION ======
  if (teamPerformance && teamPerformance.length > 0) {
    y = checkPageBreak(doc, y, 80);
    y = addSectionHeader(doc, '👥 Team Performance', y);

    // Limit to top 10 performers
    const teamData = teamPerformance.slice(0, 10).map((p, index) => [
      index + 1,
      p.userId?.name || 'Unknown',
      p.emailsResolved || 0,
      formatTime(p.avgResponseTime)
    ]);

    doc.autoTable({
      startY: y,
      head: [['Rank', 'Name', 'Resolved', 'Avg Response Time']],
      body: teamData,
      theme: 'striped',
      headStyles: { fillColor: [49, 130, 206], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 250, 255] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 15 },
        1: { cellWidth: 70 },
        2: { halign: 'right', cellWidth: 30 },
        3: { halign: 'right', cellWidth: 45 }
      }
    });

    y = doc.lastAutoTable.finalY + 15;
  }

  // ====== TAG USAGE SECTION ======
  if (tags && tags.length > 0) {
    y = checkPageBreak(doc, y, 80);
    y = addSectionHeader(doc, '🏷️ Tag Usage', y);

    // Limit to top 10 tags
    const tagData = tags.slice(0, 10).map(t => [
      t.tag,
      t.count
    ]);

    doc.autoTable({
      startY: y,
      head: [['Tag', 'Count']],
      body: tagData,
      theme: 'striped',
      headStyles: { fillColor: [49, 130, 206], fontSize: 9, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 250, 255] },
      margin: { left: 14, right: 14 },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { halign: 'right', cellWidth: 40 }
      }
    });

    y = doc.lastAutoTable.finalY + 15;
  }

  // ====== FOOTER ======
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
    doc.text(
      '🤖 Generated with Claude Code',
      doc.internal.pageSize.width - 14,
      doc.internal.pageSize.height - 10,
      { align: 'right' }
    );
  }

  // Save PDF
  const filename = `analytics_report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

/**
 * Export SLA policies to PDF
 */
export const exportSLAPoliciesToPDF = (policies) => {
  if (!policies || policies.length === 0) return;

  const doc = new jsPDF();

  let y = addHeader(doc, 'SLA Policies Report');

  y = addSectionHeader(doc, '📋 SLA Policies', y);

  // Policy summary table
  const policyData = policies.map(p => [
    p.name,
    p.enabled ? 'Yes' : 'No',
    p.priority || 100,
    p.complianceRate ? `${p.complianceRate.toFixed(1)}%` : 'N/A',
    p.totalViolations || 0
  ]);

  doc.autoTable({
    startY: y,
    head: [['Policy Name', 'Enabled', 'Priority', 'Compliance', 'Violations']],
    body: policyData,
    theme: 'striped',
    headStyles: { fillColor: [49, 130, 206], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [245, 250, 255] },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 60 },
      1: { halign: 'center', cellWidth: 25 },
      2: { halign: 'center', cellWidth: 25 },
      3: { halign: 'right', cellWidth: 30 },
      4: { halign: 'right', cellWidth: 30 }
    }
  });

  y = doc.lastAutoTable.finalY + 15;

  // Detailed policy information
  for (const policy of policies) {
    y = checkPageBreak(doc, y, 100);

    // Policy name
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(policy.name, 14, y);
    doc.setFont(undefined, 'normal');
    y += 8;

    // Description
    if (policy.description) {
      doc.setFontSize(9);
      doc.setTextColor(100);
      const splitDescription = doc.splitTextToSize(policy.description, 180);
      doc.text(splitDescription, 14, y);
      y += splitDescription.length * 5 + 5;
      doc.setTextColor(0);
    }

    // Targets table
    if (policy.targets) {
      doc.autoTable({
        startY: y,
        head: [['Priority', 'First Response', 'Resolution Time']],
        body: [
          ['Urgent', `${policy.targets.firstResponseTime?.urgent || 0} min`, `${policy.targets.resolutionTime?.urgent || 0} min`],
          ['High', `${policy.targets.firstResponseTime?.high || 0} min`, `${policy.targets.resolutionTime?.high || 0} min`],
          ['Normal', `${policy.targets.firstResponseTime?.normal || 0} min`, `${policy.targets.resolutionTime?.normal || 0} min`],
          ['Low', `${policy.targets.firstResponseTime?.low || 0} min`, `${policy.targets.resolutionTime?.low || 0} min`]
        ],
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], fontSize: 8, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8 },
        margin: { left: 20, right: 14 },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { halign: 'right', cellWidth: 60 },
          2: { halign: 'right', cellWidth: 60 }
        }
      });

      y = doc.lastAutoTable.finalY + 10;
    }
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  const filename = `sla_policies_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

/**
 * Export SLA violations to PDF
 */
export const exportSLAViolationsToPDF = (violations) => {
  if (!violations || violations.length === 0) return;

  const doc = new jsPDF();

  let y = addHeader(doc, 'SLA Violations Report');

  y = addSectionHeader(doc, '🚨 Active Violations', y);

  const violationData = violations.map(v => [
    v.policyName,
    v.assignment?.subject || 'No subject',
    v.assignment?.priority || 'normal',
    formatDate(v.assignment?.createdAt),
    v.violation?.firstResponseViolation ? 'Yes' : 'No',
    v.violation?.resolutionViolation ? 'Yes' : 'No'
  ]);

  doc.autoTable({
    startY: y,
    head: [['Policy', 'Subject', 'Priority', 'Created', 'First Resp.', 'Resolution']],
    body: violationData,
    theme: 'striped',
    headStyles: { fillColor: [252, 129, 129], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [255, 245, 245] },
    margin: { left: 14, right: 14 },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 60 },
      2: { halign: 'center', cellWidth: 20 },
      3: { cellWidth: 30 },
      4: { halign: 'center', cellWidth: 20 },
      5: { halign: 'center', cellWidth: 25 }
    }
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  const filename = `sla_violations_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};

export default {
  exportAnalyticsToPDF,
  exportSLAPoliciesToPDF,
  exportSLAViolationsToPDF
};
