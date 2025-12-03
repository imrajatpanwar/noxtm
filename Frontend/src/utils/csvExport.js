/**
 * CSV Export Utility
 * Converts analytics data to CSV format and triggers browser download
 */

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Array of header names (optional, will infer from first object)
 * @returns {string} CSV formatted string
 */
const convertToCSV = (data, headers = null) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Infer headers from first object if not provided
  if (!headers) {
    headers = Object.keys(data[0]);
  }

  // Create header row
  const headerRow = headers.map(escapeCSVValue).join(',');

  // Create data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      return escapeCSVValue(value);
    }).join(',');
  });

  return [headerRow, ...dataRows].join('\n');
};

/**
 * Escape CSV values (handle commas, quotes, newlines)
 * @param {*} value - Value to escape
 * @returns {string} Escaped value
 */
const escapeCSVValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  // Convert to string
  let stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    stringValue = '"' + stringValue.replace(/"/g, '""') + '"';
  }

  return stringValue;
};

/**
 * Format time in minutes to human-readable format
 * @param {number} minutes - Time in minutes
 * @returns {string} Formatted time
 */
const formatTime = (minutes) => {
  if (!minutes && minutes !== 0) return 'N/A';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

/**
 * Trigger browser download of CSV file
 * @param {string} csvContent - CSV content as string
 * @param {string} filename - Name of file to download
 */
const triggerDownload = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  window.URL.revokeObjectURL(url);
};

/**
 * Export dashboard summary to CSV
 * @param {Object} summary - Dashboard summary data
 */
export const exportSummaryToCSV = (summary) => {
  if (!summary) return;

  const data = [
    { Metric: 'Total Received', Value: summary.totalReceived || 0 },
    { Metric: 'Total Resolved', Value: summary.totalResolved || 0 },
    { Metric: 'Average Response Time', Value: formatTime(summary.avgResponseTime) },
    { Metric: 'Resolution Rate', Value: summary.resolutionRate ? `${summary.resolutionRate.toFixed(1)}%` : 'N/A' }
  ];

  const csv = convertToCSV(data);
  triggerDownload(csv, 'analytics_summary');
};

/**
 * Export trend data to CSV
 * @param {Array} trends - Trend data array
 * @param {string} metric - Metric type (volume, response-time, priority, status)
 */
export const exportTrendsToCSV = (trends, metric) => {
  if (!trends || trends.length === 0) return;

  let data = [];

  switch (metric) {
    case 'volume':
      data = trends.map(t => ({
        Date: new Date(t.date).toLocaleDateString(),
        Received: t.received || 0,
        Sent: t.sent || 0,
        Resolved: t.resolved || 0
      }));
      break;

    case 'response-time':
      data = trends.map(t => ({
        Date: new Date(t.date).toLocaleDateString(),
        'Average Response Time (min)': Math.round(t.avgResponseTime || 0),
        'Median Response Time (min)': Math.round(t.medianResponseTime || 0)
      }));
      break;

    case 'priority':
      data = trends.map(t => ({
        Date: new Date(t.date).toLocaleDateString(),
        Urgent: t.urgent || 0,
        High: t.high || 0,
        Normal: t.normal || 0,
        Low: t.low || 0
      }));
      break;

    case 'status':
      data = trends.map(t => ({
        Date: new Date(t.date).toLocaleDateString(),
        New: t.new || 0,
        'In Progress': t.in_progress || 0,
        Resolved: t.resolved || 0,
        Closed: t.closed || 0
      }));
      break;

    default:
      data = trends;
  }

  const csv = convertToCSV(data);
  triggerDownload(csv, `analytics_trends_${metric}`);
};

/**
 * Export team performance to CSV
 * @param {Array} teamPerformance - Team performance data
 */
export const exportTeamPerformanceToCSV = (teamPerformance) => {
  if (!teamPerformance || teamPerformance.length === 0) return;

  const data = teamPerformance.map(p => ({
    Name: p.userId?.name || 'Unknown',
    Email: p.userId?.email || 'N/A',
    Department: p.userId?.department || 'N/A',
    'Emails Resolved': p.emailsResolved || 0,
    'Average Response Time': formatTime(p.avgResponseTime)
  }));

  const csv = convertToCSV(data);
  triggerDownload(csv, 'analytics_team_performance');
};

/**
 * Export tag usage to CSV
 * @param {Array} tags - Tag usage data
 */
export const exportTagsToCSV = (tags) => {
  if (!tags || tags.length === 0) return;

  const data = tags.map(t => ({
    Tag: t.tag,
    Count: t.count
  }));

  const csv = convertToCSV(data);
  triggerDownload(csv, 'analytics_tag_usage');
};

/**
 * Export all analytics data to single CSV
 * @param {Object} options - All analytics data
 */
export const exportAllToCSV = ({ summary, trends, teamPerformance, tags, metric }) => {
  let allData = [];

  // Add summary section
  allData.push(['SUMMARY']);
  allData.push(['Metric', 'Value']);
  allData.push(['Total Received', summary?.totalReceived || 0]);
  allData.push(['Total Resolved', summary?.totalResolved || 0]);
  allData.push(['Average Response Time', formatTime(summary?.avgResponseTime)]);
  allData.push(['Resolution Rate', summary?.resolutionRate ? `${summary.resolutionRate.toFixed(1)}%` : 'N/A']);
  allData.push([]); // Empty row

  // Add trends section
  if (trends && trends.length > 0) {
    allData.push(['TRENDS']);
    if (metric === 'volume') {
      allData.push(['Date', 'Received', 'Sent', 'Resolved']);
      trends.forEach(t => {
        allData.push([
          new Date(t.date).toLocaleDateString(),
          t.received || 0,
          t.sent || 0,
          t.resolved || 0
        ]);
      });
    }
    // Add more metric types as needed...
    allData.push([]); // Empty row
  }

  // Add team performance section
  if (teamPerformance && teamPerformance.length > 0) {
    allData.push(['TEAM PERFORMANCE']);
    allData.push(['Name', 'Email', 'Emails Resolved', 'Average Response Time']);
    teamPerformance.forEach(p => {
      allData.push([
        p.userId?.name || 'Unknown',
        p.userId?.email || 'N/A',
        p.emailsResolved || 0,
        formatTime(p.avgResponseTime)
      ]);
    });
    allData.push([]); // Empty row
  }

  // Add tags section
  if (tags && tags.length > 0) {
    allData.push(['TAG USAGE']);
    allData.push(['Tag', 'Count']);
    tags.forEach(t => {
      allData.push([t.tag, t.count]);
    });
  }

  // Convert to CSV
  const csv = allData.map(row => row.map(escapeCSVValue).join(',')).join('\n');
  triggerDownload(csv, 'analytics_complete_report');
};

/**
 * Export SLA policies to CSV
 * @param {Array} policies - SLA policies data
 */
export const exportSLAPoliciesToCSV = (policies) => {
  if (!policies || policies.length === 0) return;

  const data = policies.map(p => ({
    Name: p.name,
    Description: p.description || '',
    Enabled: p.enabled ? 'Yes' : 'No',
    Priority: p.priority || 100,
    'First Response (Urgent)': p.targets?.firstResponseTime?.urgent || 0,
    'First Response (High)': p.targets?.firstResponseTime?.high || 0,
    'First Response (Normal)': p.targets?.firstResponseTime?.normal || 0,
    'First Response (Low)': p.targets?.firstResponseTime?.low || 0,
    'Resolution Time (Urgent)': p.targets?.resolutionTime?.urgent || 0,
    'Resolution Time (High)': p.targets?.resolutionTime?.high || 0,
    'Resolution Time (Normal)': p.targets?.resolutionTime?.normal || 0,
    'Resolution Time (Low)': p.targets?.resolutionTime?.low || 0,
    'Compliance Rate': p.complianceRate ? `${p.complianceRate.toFixed(1)}%` : 'N/A',
    'Total Violations': p.totalViolations || 0,
    'Total Compliance': p.totalCompliance || 0
  }));

  const csv = convertToCSV(data);
  triggerDownload(csv, 'sla_policies');
};

/**
 * Export SLA violations to CSV
 * @param {Array} violations - Violations data
 */
export const exportSLAViolationsToCSV = (violations) => {
  if (!violations || violations.length === 0) return;

  const data = violations.map(v => ({
    'Policy Name': v.policyName,
    Subject: v.assignment?.subject || 'N/A',
    Priority: v.assignment?.priority || 'normal',
    'Created At': v.assignment?.createdAt ? new Date(v.assignment.createdAt).toLocaleString() : 'N/A',
    'Assigned To': v.assignment?.assignedTo?.name || 'Unassigned',
    'First Response Violation': v.violation?.firstResponseViolation ? 'Yes' : 'No',
    'Resolution Violation': v.violation?.resolutionViolation ? 'Yes' : 'No',
    'First Response % Elapsed': v.violation?.firstResponsePercentElapsed ? `${v.violation.firstResponsePercentElapsed.toFixed(1)}%` : 'N/A',
    'Resolution % Elapsed': v.violation?.resolutionPercentElapsed ? `${v.violation.resolutionPercentElapsed.toFixed(1)}%` : 'N/A'
  }));

  const csv = convertToCSV(data);
  triggerDownload(csv, 'sla_violations');
};

export default {
  exportSummaryToCSV,
  exportTrendsToCSV,
  exportTeamPerformanceToCSV,
  exportTagsToCSV,
  exportAllToCSV,
  exportSLAPoliciesToCSV,
  exportSLAViolationsToCSV
};
