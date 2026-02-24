const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticateToken } = require('../middleware/auth');
const Task = require('../models/Task');
const Note = require('../models/Note');
const Lead = require('../models/Lead');
const Client = require('../models/Client');
const ContactList = require('../models/ContactList');
const Project = require('../models/Project');
const SocialMediaPost = require('../models/SocialMediaPost');
const Campaign = require('../models/Campaign');
const LinkedInAIComment = require('../models/LinkedInAIComment');
const WhatsAppCampaign = require('../models/WhatsAppCampaign');
const WhatsAppContact = require('../models/WhatsAppContact');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const LeaveApplication = require('../models/LeaveApplication');
const Attendance = require('../models/Attendance');
const Company = require('../models/Company');
const TargetedCompany = require('../models/TargetedCompany');

const toObjectId = (id) => id ? new mongoose.Types.ObjectId(id) : null;

router.use(authenticateToken);

/**
 * GET /api/overview-stats
 * Returns lightweight counts/stats for all dashboard sections
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user.userId;
        const companyId = req.user.companyId;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Run all queries in parallel for speed
        const [
            // Tasks
            taskStats,
            // Notes
            notesCount,
            // Companies Data (Targeted Companies)
            companiesCount,
            // Leads
            leadStats,
            // Contacts
            contactsTotal,
            // Clients
            clientsCount,
            // Projects
            projectStats,
            // Social Media
            socialStats,
            // Email Campaigns
            campaignStats,
            // LinkedIn
            linkedinCount,
            // WhatsApp
            whatsappCampaigns,
            whatsappContacts,
            // HR - Team size
            companyData,
            // HR - Leaves pending
            pendingLeaves,
            // HR - Attendance today
            attendanceToday,
            // Finance - Invoices
            invoiceStats,
            // Finance - Expenses
            expenseStats
        ] = await Promise.all([
            // 1. Tasks by status
            Task.aggregate([
                { $match: { companyId: toObjectId(companyId) } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]).catch(() => []),

            // 2. Notes count
            Note.countDocuments(companyId ? { companyId } : { userId }).catch(() => 0),

            // 3. Targeted Companies count
            TargetedCompany.countDocuments(companyId ? { companyId } : { userId }).catch(() => 0),

            // 4. Leads by status
            Lead.aggregate([
                { $match: { userId: userId } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]).catch(() => []),

            // 5. Total contacts across all lists
            ContactList.aggregate([
                { $match: companyId ? { companyId: toObjectId(companyId) } : { userId: userId } },
                { $project: { count: { $size: { $ifNull: ['$contacts', []] } } } },
                { $group: { _id: null, total: { $sum: '$count' } } }
            ]).catch(() => []),

            // 6. Clients count
            Client.countDocuments({ userId }).catch(() => 0),

            // 7. Projects by status
            Project.aggregate([
                { $match: { companyId: toObjectId(companyId) } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]).catch(() => []),

            // 8. Social media posts by status
            SocialMediaPost.aggregate([
                { $match: { companyId: toObjectId(companyId) } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]).catch(() => []),

            // 9. Email campaigns by status
            Campaign.aggregate([
                { $match: { companyId: toObjectId(companyId) } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]).catch(() => []),

            // 10. LinkedIn AI comments
            LinkedInAIComment.countDocuments({ userId }).catch(() => 0),

            // 11. WhatsApp campaigns count
            WhatsAppCampaign.countDocuments(companyId ? { companyId } : {}).catch(() => 0),

            // 12. WhatsApp contacts count
            WhatsAppContact.countDocuments(companyId ? { companyId } : {}).catch(() => 0),

            // 13. Company for team size
            companyId ? Company.findById(companyId).select('members').lean().catch(() => null) : null,

            // 14. Pending leaves
            companyId ? LeaveApplication.countDocuments({ companyId, status: 'pending' }).catch(() => 0) : 0,

            // 15. Attendance today
            companyId ? Attendance.countDocuments({
                companyId,
                date: { $gte: today, $lt: new Date(today.getTime() + 86400000) },
                status: 'present'
            }).catch(() => 0) : 0,

            // 16. Invoices by status with totals
            Invoice.aggregate([
                { $match: companyId ? { companyId: toObjectId(companyId) } : { userId: userId } },
                { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$total' } } }
            ]).catch(() => []),

            // 17. Expenses  
            Expense.aggregate([
                { $match: companyId ? { companyId: toObjectId(companyId) } : { userId: userId } },
                { $group: { _id: '$status', count: { $sum: 1 }, total: { $sum: '$amount' } } }
            ]).catch(() => [])
        ]);

        // Helper to convert aggregate results to object
        const toMap = (arr) => {
            const map = {};
            let total = 0;
            (arr || []).forEach(item => {
                if (item._id) map[item._id] = item.count;
                total += item.count;
            });
            map._total = total;
            return map;
        };

        const tasks = toMap(taskStats);
        const leads = toMap(leadStats);
        const projects = toMap(projectStats);
        const social = toMap(socialStats);
        const campaigns = toMap(campaignStats);
        const invoices = toMap(invoiceStats);
        const expenses = toMap(expenseStats);

        // Calculate finance totals
        let totalRevenue = 0;
        let pendingRevenue = 0;
        (invoiceStats || []).forEach(i => {
            if (i._id === 'paid') totalRevenue += i.total || 0;
            if (i._id === 'pending') pendingRevenue += i.total || 0;
        });

        let totalExpenses = 0;
        (expenseStats || []).forEach(e => {
            totalExpenses += e.total || 0;
        });

        const teamSize = companyData?.members?.length || 0;

        res.json({
            success: true,
            stats: {
                tasks: {
                    total: tasks._total,
                    todo: tasks['Todo'] || 0,
                    inProgress: tasks['In Progress'] || 0,
                    inReview: tasks['In Review'] || 0,
                    done: tasks['Done'] || 0
                },
                notes: { total: notesCount },
                companiesData: { total: companiesCount },
                leads: {
                    total: leads._total,
                    cold: leads['Cold Lead'] || 0,
                    warm: leads['Warm Lead'] || 0,
                    qualified: leads['Qualified (SQL)'] || 0,
                    active: leads['Active'] || 0,
                    dead: leads['Dead Lead'] || 0
                },
                contacts: { total: contactsTotal?.[0]?.total || 0 },
                clients: { total: clientsCount },
                projects: {
                    total: projects._total,
                    inProgress: projects['In Progress'] || 0,
                    completed: projects['Completed'] || 0,
                    onHold: projects['On Hold'] || 0
                },
                socialMedia: {
                    total: social._total,
                    published: social['Published'] || 0,
                    scheduled: social['Scheduled'] || 0,
                    draft: social['Draft'] || 0
                },
                campaigns: {
                    total: campaigns._total,
                    sent: campaigns['sent'] || 0,
                    draft: campaigns['draft'] || 0,
                    scheduled: campaigns['scheduled'] || 0
                },
                contentCalendar: {
                    scheduled: social['Scheduled'] || 0,
                    published: social['Published'] || 0
                },
                linkedin: { totalComments: linkedinCount },
                whatsapp: {
                    campaigns: whatsappCampaigns,
                    contacts: whatsappContacts
                },
                hr: {
                    teamSize,
                    presentToday: attendanceToday,
                    pendingLeaves
                },
                finance: {
                    totalRevenue,
                    pendingRevenue,
                    totalExpenses,
                    invoicesTotal: invoices._total,
                    invoicesPaid: invoices['paid'] || 0,
                    invoicesPending: invoices['pending'] || 0,
                    invoicesOverdue: invoices['overdue'] || 0
                }
            }
        });

    } catch (error) {
        console.error('Overview stats error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
