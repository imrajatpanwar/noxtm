# Phase 3 Week 3: Advanced Features Plan

**Date**: November 27, 2025
**Status**: 📋 Planning Phase
**Goal**: Add export, reporting, and notification features to Analytics & SLA system

---

## Overview

Phase 3 Week 3 builds upon the solid foundation of Week 2 (Analytics Dashboard & SLA Monitor) by adding:
1. **Export Capabilities** - CSV/PDF downloads
2. **Scheduled Reports** - Automated email reports
3. **Enhanced Charts** - Custom date ranges and drill-down
4. **Real-time Notifications** - WebSocket-based SLA breach alerts
5. **Advanced Analytics** - Predictive insights

---

## Feature Breakdown

### 1. Export Functionality 📊

#### 1.1 CSV Export
**Goal**: Allow users to download analytics data as CSV files

**Frontend Changes**:
- Add "Export CSV" button to Analytics Dashboard
- Create utility function to convert JSON to CSV format
- Trigger browser download with generated CSV file

**Implementation**:
```javascript
// Frontend/src/utils/csvExport.js
export const exportToCSV = (data, filename) => {
  const csv = convertToCSV(data);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString()}.csv`;
  link.click();
};
```

**Data to Export**:
- Dashboard summary (date range, totals, averages)
- Trend data (time-series for charts)
- Team performance (leaderboard data)
- Tag usage (top tags with counts)
- SLA violations (active and historical)

**UI Placement**:
- Add button next to date range selector
- Dropdown to select what to export (Summary/Trends/Team/Tags/All)

**Estimated Time**: 2-3 hours

---

#### 1.2 PDF Export
**Goal**: Generate professional PDF reports with charts and tables

**Backend Changes**:
- Add PDF generation library (e.g., PDFKit or jsPDF)
- Create new endpoint: `POST /api/analytics/export/pdf`
- Generate PDF with company branding, charts, and tables

**Frontend Changes**:
- Add "Export PDF" button
- Show loading indicator during PDF generation
- Trigger download when PDF is ready

**Library Options**:
1. **PDFKit** (Node.js backend) - Better for server-side generation
2. **jsPDF** (Client-side) - Lighter, no server load
3. **Puppeteer** - Most powerful, can screenshot actual dashboard

**Recommended**: **jsPDF + jsPDF-AutoTable**
- Client-side generation (no server load)
- Good chart support with plugins
- Auto-table for tabular data

**Implementation**:
```javascript
// Frontend/src/utils/pdfExport.js
import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToPDF = async (summary, trends, teamPerformance, tags) => {
  const doc = new jsPDF();

  // Add title and metadata
  doc.setFontSize(20);
  doc.text('Analytics Report', 14, 22);
  doc.setFontSize(10);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30);

  // Add summary table
  doc.autoTable({
    head: [['Metric', 'Value']],
    body: [
      ['Total Received', summary.totalReceived],
      ['Total Resolved', summary.totalResolved],
      ['Avg Response Time', formatTime(summary.avgResponseTime)],
      ['Resolution Rate', `${summary.resolutionRate}%`]
    ],
    startY: 35
  });

  // Add team performance table
  doc.autoTable({
    head: [['Agent', 'Emails Resolved', 'Avg Response Time']],
    body: teamPerformance.map(p => [
      p.userId.name,
      p.emailsResolved,
      formatTime(p.avgResponseTime)
    ]),
    startY: doc.lastAutoTable.finalY + 10
  });

  // Save PDF
  doc.save(`analytics_report_${new Date().toISOString()}.pdf`);
};
```

**UI Enhancements**:
- PDF preview modal before download
- Options to customize report (include/exclude sections)
- Company logo in header

**Estimated Time**: 4-5 hours

---

### 2. Scheduled Email Reports 📧

#### 2.1 Report Configuration
**Goal**: Allow users to schedule automated email reports

**Frontend Changes**:
- Add "Schedule Reports" button/tab in Analytics Dashboard
- Create `ReportScheduler` component with form:
  - Report name
  - Recipients (multi-select from company members)
  - Frequency (Daily/Weekly/Monthly)
  - Day of week (for weekly)
  - Day of month (for monthly)
  - Time of day
  - Report format (CSV/PDF/Both)
  - Metrics to include (checkboxes)

**Backend Changes**:
- Create `ReportSchedule` model:
  ```javascript
  {
    name: String,
    companyId: ObjectId,
    recipients: [{ type: ObjectId, ref: 'User' }],
    frequency: { type: String, enum: ['daily', 'weekly', 'monthly'] },
    dayOfWeek: Number, // 0-6 for weekly
    dayOfMonth: Number, // 1-31 for monthly
    timeOfDay: String, // "09:00"
    format: { type: String, enum: ['csv', 'pdf', 'both'] },
    metricsToInclude: [String], // ['summary', 'trends', 'team', 'tags']
    enabled: Boolean,
    lastSentAt: Date,
    nextScheduledAt: Date,
    createdBy: ObjectId
  }
  ```
- Create routes:
  - `POST /api/analytics/report-schedules` - Create schedule
  - `GET /api/analytics/report-schedules` - List schedules
  - `PATCH /api/analytics/report-schedules/:id` - Update schedule
  - `DELETE /api/analytics/report-schedules/:id` - Delete schedule
  - `PATCH /api/analytics/report-schedules/:id/toggle` - Enable/disable

**Backend Scheduler**:
- Use **node-cron** for scheduling
- On server start, load all active schedules
- Register cron jobs for each schedule
- When job triggers:
  1. Fetch analytics data for time period
  2. Generate CSV/PDF report
  3. Send email with attachment via Nodemailer
  4. Update `lastSentAt` and `nextScheduledAt`

**Implementation**:
```javascript
// Backend/services/reportScheduler.js
const cron = require('node-cron');
const ReportSchedule = require('../models/ReportSchedule');
const EmailMetric = require('../models/EmailMetric');
const { sendReportEmail } = require('./emailService');
const { generatePDF, generateCSV } = require('./reportGenerator');

const activeJobs = new Map();

const initializeScheduler = async () => {
  const schedules = await ReportSchedule.find({ enabled: true });

  for (const schedule of schedules) {
    registerSchedule(schedule);
  }
};

const registerSchedule = (schedule) => {
  const cronExpression = buildCronExpression(schedule);

  const job = cron.schedule(cronExpression, async () => {
    await executeReport(schedule);
  });

  activeJobs.set(schedule._id.toString(), job);
};

const executeReport = async (schedule) => {
  try {
    // Fetch data
    const data = await fetchReportData(schedule);

    // Generate reports
    const attachments = [];
    if (schedule.format === 'pdf' || schedule.format === 'both') {
      const pdf = await generatePDF(data);
      attachments.push({ filename: 'report.pdf', content: pdf });
    }
    if (schedule.format === 'csv' || schedule.format === 'both') {
      const csv = await generateCSV(data);
      attachments.push({ filename: 'report.csv', content: csv });
    }

    // Send email
    await sendReportEmail(schedule.recipients, schedule.name, attachments);

    // Update schedule
    schedule.lastSentAt = new Date();
    schedule.nextScheduledAt = calculateNextRun(schedule);
    await schedule.save();
  } catch (error) {
    console.error('Error executing scheduled report:', error);
  }
};

module.exports = { initializeScheduler, registerSchedule };
```

**Estimated Time**: 6-8 hours

---

### 3. Custom Date Range Picker 📅

#### 3.1 Enhanced Date Selection
**Goal**: Replace fixed 7/30/90 day options with flexible date range picker

**Frontend Changes**:
- Add date range picker component (use react-datepicker or custom)
- Support both:
  - Quick presets (Last 7 days, Last 30 days, Last 90 days, This Month, Last Month, This Year)
  - Custom range (Start Date - End Date)
- Update all API calls to use custom range

**Library**: **react-datepicker**
```bash
npm install react-datepicker
```

**Implementation**:
```javascript
// Frontend/src/components/email/DateRangePicker.js
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const DateRangePicker = ({ onRangeChange }) => {
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const handleApply = () => {
    onRangeChange({ startDate, endDate });
  };

  const quickSelect = (preset) => {
    const end = new Date();
    const start = new Date();

    switch (preset) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case 'thisMonth':
        start.setDate(1);
        break;
      case 'lastMonth':
        start.setMonth(start.getMonth() - 1);
        start.setDate(1);
        end.setDate(0); // Last day of previous month
        break;
    }

    setStartDate(start);
    setEndDate(end);
    onRangeChange({ startDate: start, endDate: end });
  };

  return (
    <div className="date-range-picker">
      <div className="quick-presets">
        <button onClick={() => quickSelect('7d')}>Last 7 days</button>
        <button onClick={() => quickSelect('30d')}>Last 30 days</button>
        <button onClick={() => quickSelect('90d')}>Last 90 days</button>
        <button onClick={() => quickSelect('thisMonth')}>This Month</button>
        <button onClick={() => quickSelect('lastMonth')}>Last Month</button>
      </div>

      <div className="custom-range">
        <DatePicker
          selected={startDate}
          onChange={date => setStartDate(date)}
          selectsStart
          startDate={startDate}
          endDate={endDate}
          maxDate={new Date()}
        />
        <span>to</span>
        <DatePicker
          selected={endDate}
          onChange={date => setEndDate(date)}
          selectsEnd
          startDate={startDate}
          endDate={endDate}
          minDate={startDate}
          maxDate={new Date()}
        />
        <button onClick={handleApply}>Apply</button>
      </div>
    </div>
  );
};
```

**Backend Changes**:
- Update analytics routes to accept `startDate` and `endDate` query params
- Fallback to `days` param if date range not provided (backward compatible)

**Estimated Time**: 3-4 hours

---

### 4. Chart Drill-Down 🔍

#### 4.1 Interactive Charts
**Goal**: Allow users to click chart elements to see detailed data

**Frontend Changes**:
- Make chart bars clickable
- On click, open modal with detailed breakdown
- Show:
  - Day-by-day data for clicked bar
  - Individual email assignments for that period
  - Assignee breakdown
  - Tag distribution

**Implementation**:
```javascript
// In AnalyticsDashboard.js
const [drillDownData, setDrillDownData] = useState(null);
const [showDrillDown, setShowDrillDown] = useState(false);

const handleBarClick = async (dataPoint) => {
  try {
    const res = await api.get(`/analytics/drill-down`, {
      params: {
        startDate: dataPoint.date,
        endDate: new Date(new Date(dataPoint.date).getTime() + 24*60*60*1000),
        metric: selectedMetric
      }
    });
    setDrillDownData(res.data);
    setShowDrillDown(true);
  } catch (error) {
    console.error('Error fetching drill-down data:', error);
  }
};

// Update SimpleTrendChart to accept onClick handler
<div
  className="bar"
  onClick={() => handleBarClick(point)}
  style={{ cursor: 'pointer' }}
/>
```

**Backend Changes**:
- Add route: `GET /api/analytics/drill-down`
- Query EmailAssignment with date filter
- Return detailed breakdown

**Estimated Time**: 4-5 hours

---

### 5. Real-time SLA Breach Notifications 🔔

#### 5.1 WebSocket Integration
**Goal**: Push real-time notifications when SLA is about to be breached or breached

**Backend Changes**:
- Use existing Socket.IO setup (already in server)
- Create `slaMonitor` service that:
  - Runs every 5 minutes
  - Checks all open EmailAssignments
  - Finds applicable SLA policy
  - Calculates if approaching threshold (75%) or breached (100%)
  - Emits socket event to relevant users

**Implementation**:
```javascript
// Backend/services/slaMonitor.js
const cron = require('node-cron');
const EmailAssignment = require('../models/EmailAssignment');
const SLAPolicy = require('../models/SLAPolicy');

const initializeSLAMonitor = (io) => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await checkSLAViolations(io);
  });
};

const checkSLAViolations = async (io) => {
  try {
    const openAssignments = await EmailAssignment.find({
      status: { $in: ['new', 'in_progress', 'reopened'] }
    });

    for (const assignment of openAssignments) {
      const policy = await SLAPolicy.findApplicable(assignment);

      if (policy) {
        const violation = policy.checkViolation(assignment);

        // Check if escalation needed
        if (policy.needsEscalation(assignment)) {
          // Send notification to escalation team
          const escalationUsers = policy.escalation.escalateTo;

          for (const userId of escalationUsers) {
            io.to(`user_${userId}`).emit('sla-escalation', {
              assignment: assignment._id,
              policy: policy.name,
              percentElapsed: Math.max(
                violation.firstResponsePercentElapsed,
                violation.resolutionPercentElapsed
              ),
              subject: assignment.subject
            });
          }
        }

        // Check if breached
        if (violation.firstResponseViolation || violation.resolutionViolation) {
          // Send to assigned user and escalation team
          if (assignment.assignedTo) {
            io.to(`user_${assignment.assignedTo}`).emit('sla-breach', {
              assignment: assignment._id,
              policy: policy.name,
              subject: assignment.subject,
              violationType: violation.firstResponseViolation ? 'first_response' : 'resolution'
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking SLA violations:', error);
  }
};

module.exports = { initializeSLAMonitor };
```

**Frontend Changes**:
- Connect to Socket.IO in SLAMonitor component
- Listen for `sla-escalation` and `sla-breach` events
- Show toast notification with:
  - Red/orange color based on severity
  - Email subject
  - Time remaining/elapsed
  - "View Details" button
- Add notification bell icon in header with badge count

**Implementation**:
```javascript
// In SLAMonitor.js
import { useContext, useEffect } from 'react';
import { MessagingContext } from '../../contexts/MessagingContext';
import { toast } from 'sonner';

const SLAMonitor = () => {
  const { socket } = useContext(MessagingContext);

  useEffect(() => {
    if (!socket) return;

    socket.on('sla-escalation', (data) => {
      toast.warning(`SLA Escalation: ${data.subject}`, {
        description: `${data.percentElapsed.toFixed(0)}% of SLA time elapsed`,
        action: {
          label: 'View',
          onClick: () => {
            // Navigate to email assignment
            window.location.href = `/dashboard?section=team-email&email=${data.assignment}`;
          }
        }
      });
    });

    socket.on('sla-breach', (data) => {
      toast.error(`SLA Breached: ${data.subject}`, {
        description: `${data.violationType === 'first_response' ? 'First Response' : 'Resolution'} SLA exceeded`,
        action: {
          label: 'View',
          onClick: () => {
            window.location.href = `/dashboard?section=team-email&email=${data.assignment}`;
          }
        }
      });
    });

    return () => {
      socket.off('sla-escalation');
      socket.off('sla-breach');
    };
  }, [socket]);

  // ... rest of component
};
```

**Estimated Time**: 5-6 hours

---

### 6. Advanced Analytics 📈

#### 6.1 Predictive Insights (Stretch Goal)
**Goal**: Use historical data to predict future trends

**Features**:
- Predict next week's email volume based on historical trends
- Identify busiest days/hours
- Suggest optimal team size based on volume
- Anomaly detection (unusual spikes/drops)

**Implementation**: Simple linear regression or moving average

**Estimated Time**: 6-8 hours (Optional)

---

## Implementation Priority

### High Priority (Must Have)
1. ✅ CSV Export (2-3 hours)
2. ✅ PDF Export (4-5 hours)
3. ✅ Custom Date Range Picker (3-4 hours)

**Total: 9-12 hours**

### Medium Priority (Should Have)
4. ✅ Scheduled Email Reports (6-8 hours)
5. ✅ Real-time SLA Notifications (5-6 hours)

**Total: 11-14 hours**

### Lower Priority (Nice to Have)
6. ⏸ Chart Drill-Down (4-5 hours)
7. ⏸ Predictive Analytics (6-8 hours)

**Total: 10-13 hours**

---

## Technical Stack Additions

### NPM Packages to Install

**Frontend**:
```bash
npm install jspdf jspdf-autotable react-datepicker
```

**Backend**:
```bash
npm install node-cron
```

---

## File Structure

### New Files to Create

**Frontend**:
```
Frontend/src/
├── components/email/
│   ├── DateRangePicker.js
│   ├── DateRangePicker.css
│   ├── ReportScheduler.js
│   ├── ReportScheduler.css
│   ├── DrillDownModal.js
│   └── DrillDownModal.css
├── utils/
│   ├── csvExport.js
│   ├── pdfExport.js
│   └── formatters.js
```

**Backend**:
```
Backend/
├── models/
│   └── ReportSchedule.js
├── routes/
│   └── report-schedules.js
├── services/
│   ├── reportScheduler.js
│   ├── reportGenerator.js
│   ├── slaMonitor.js
│   └── emailReportService.js
```

---

## Testing Plan

### Unit Tests
- [ ] CSV export utility
- [ ] PDF export utility
- [ ] Date range calculations
- [ ] Cron expression builder
- [ ] SLA violation detection

### Integration Tests
- [ ] Scheduled report execution
- [ ] Email sending with attachments
- [ ] WebSocket notification delivery
- [ ] Export with real data

### E2E Tests
- [ ] Full report scheduling workflow
- [ ] Export all data types
- [ ] Receive real-time notification
- [ ] Custom date range filtering

---

## Success Metrics

### Performance
- Export generation < 5 seconds
- PDF size < 2MB
- Scheduled reports run on time (±1 minute)
- WebSocket latency < 500ms

### User Experience
- Export buttons clearly visible
- Date picker intuitive
- Notifications non-intrusive
- Reports readable and professional

### Business Value
- Users export data at least once per week
- Scheduled reports reduce manual work
- Real-time notifications improve response time
- SLA compliance rate improves

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Prioritize features** (must-have vs nice-to-have)
3. **Start with CSV export** (quickest win)
4. **Then PDF export** (high value)
5. **Implement date range picker** (user-requested)
6. **Add scheduled reports** (automation)
7. **Finally real-time notifications** (polish)

---

**Status**: 📋 **Plan Complete - Ready to Begin Implementation**

**Estimated Total Time**: 20-26 hours for high+medium priority features
