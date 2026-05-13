const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const CompanyData = require('../models/CompanyData');
const ContactLabel = require('../models/ContactLabel');
const Company = require('../models/Company');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const auth = authenticateToken;

const LEGACY_STATUS_MAP = {
  'Cold Lead': 'new', 'Warm Lead': 'followup',
  'Qualified (SQL)': 'converted', 'Active': 'active', 'Dead Lead': 'dead',
};
const CONTACT_STATUS_VALUES = new Set(['new', 'active', 'followup', 'converted', 'dead']);
function normalizeStatus(s) { return LEGACY_STATUS_MAP[s] || s || 'new'; }
function escapeRegex(value = '') {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============ PERMISSION HELPER ============
// Resolves whether the current user can view/edit every company-data record in their
// workspace, or only the ones they created. For now the rule is simply:
//   - Platform role "Admin"                        => full access
//   - Workspace roleInCompany "Owner" (or company.owner) => full access
//   - Everyone else                                => only their own records
// NOTE: Finer-grained permissions (e.g. a dedicated workspacePermissions.companyData.viewAll
// / editAll flag on Company or User) can be layered on top of this helper later without
// changing any callers. The route handlers only ever consume the returned booleans.
async function resolveCompanyDataPermissions(userDoc) {
  if (!userDoc) return { canViewAll: false, canEditAll: false, company: null };

  // Platform admins always see everything
  if (userDoc.role === 'Admin') {
    const company = userDoc.companyId ? await Company.findById(userDoc.companyId) : null;
    return { canViewAll: true, canEditAll: true, company };
  }

  if (!userDoc.companyId) {
    return { canViewAll: false, canEditAll: false, company: null };
  }

  const company = await Company.findById(userDoc.companyId);
  if (!company) return { canViewAll: false, canEditAll: false, company: null };

  const member = company.members?.find(
    m => m.user && m.user.toString() === userDoc._id.toString()
  );
  const isOwner = (member && member.roleInCompany === 'Owner') ||
    (company.owner && company.owner.toString() === userDoc._id.toString());

  // Check delegated view_all / edit_all permissions granted by owner
  const delegatedPerm = (company.dataAccessPermissions || []).find(
    p => p.user && p.user.toString() === userDoc._id.toString()
  );
  const hasViewAll = isOwner || delegatedPerm?.permission === 'view_all' || delegatedPerm?.permission === 'edit_all';
  const hasEditAll = isOwner || delegatedPerm?.permission === 'edit_all';

  const canViewAll = hasViewAll;
  const canEditAll = hasEditAll;

  return { canViewAll, canEditAll, company };
}

// ============ EXTENSION ACCESS SETTINGS ============
// NOTE: These must be defined BEFORE the /:id routes to avoid Express matching "access-settings" as an :id param

// Get extension access settings
router.get('/company-data/access-settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const company = await Company.findById(user.companyId)
      .populate('extensionAccessPeople', 'fullName email profileImage')
      .populate('members.user', 'fullName email profileImage');

    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Check if user is Owner
    const member = company.members.find(m => m.user && m.user._id.toString() === user._id.toString());
    const isOwner = (member && member.roleInCompany === 'Owner') ||
      (company.owner && company.owner.toString() === user._id.toString());

    if (!isOwner && user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only the workspace owner can manage extension access' });
    }

    res.json({
      extensionAccessPeople: company.extensionAccessPeople || [],
      members: company.members.map(m => ({
        user: m.user,
        roleInCompany: m.roleInCompany
      }))
    });
  } catch (error) {
    console.error('Error fetching access settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update extension access settings
router.put('/company-data/access-settings', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const company = await Company.findById(user.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // Check if user is Owner
    const member = company.members.find(m => m.user && m.user.toString() === user._id.toString());
    const isOwner = (member && member.roleInCompany === 'Owner') ||
      (company.owner && company.owner.toString() === user._id.toString());

    if (!isOwner && user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only the workspace owner can manage extension access' });
    }

    const { extensionAccessPeople } = req.body;
    company.extensionAccessPeople = extensionAccessPeople || [];
    await company.save();

    const updated = await Company.findById(company._id)
      .populate('extensionAccessPeople', 'fullName email profileImage');

    res.json({ extensionAccessPeople: updated.extensionAccessPeople });
  } catch (error) {
    console.error('Error updating access settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get data access permissions (who can view/edit company data)
router.get('/company-data/data-access', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const company = await Company.findById(user.companyId)
      .populate('dataAccessPermissions.user', 'fullName email profileImage')
      .populate('members.user', 'fullName email profileImage');

    if (!company) return res.status(404).json({ message: 'Company not found' });

    res.json({
      dataAccessPermissions: company.dataAccessPermissions || [],
      members: company.members.map(m => ({
        user: m.user,
        roleInCompany: m.roleInCompany
      }))
    });
  } catch (error) {
    console.error('Error fetching data access:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a member's data access permission (Owner only)
router.put('/company-data/data-access/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const company = await Company.findById(user.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const member = company.members.find(m => m.user && m.user.toString() === user._id.toString());
    const isOwner = (member && member.roleInCompany === 'Owner') ||
      (company.owner && company.owner.toString() === user._id.toString());
    if (!isOwner && user.role !== 'Admin') {
      return res.status(403).json({ message: 'Only the workspace owner can manage data access' });
    }

    const { permission } = req.body; // 'view' | 'edit' | 'view_all' | 'edit_all' | 'remove'
    const targetUserId = req.params.userId;

    if (permission === 'remove') {
      company.dataAccessPermissions = (company.dataAccessPermissions || []).filter(
        p => p.user.toString() !== targetUserId
      );
    } else if (['view', 'edit', 'view_all', 'edit_all'].includes(permission)) {
      const existing = (company.dataAccessPermissions || []).find(
        p => p.user.toString() === targetUserId
      );
      if (existing) {
        existing.permission = permission;
      } else {
        if (!company.dataAccessPermissions) company.dataAccessPermissions = [];
        company.dataAccessPermissions.push({ user: targetUserId, permission });
      }
    } else {
      return res.status(400).json({ message: 'Invalid permission. Use view, edit, or remove.' });
    }

    await company.save();

    const updated = await Company.findById(company._id)
      .populate('dataAccessPermissions.user', 'fullName email profileImage')
      .populate('members.user', 'fullName email profileImage');

    res.json({
      dataAccessPermissions: updated.dataAccessPermissions || [],
      members: updated.members.map(m => ({
        user: m.user,
        roleInCompany: m.roleInCompany
      }))
    });
  } catch (error) {
    console.error('Error updating data access:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ COMPANY DATA CRUD ============

// Permissions probe — tells the frontend whether the current user can view/edit every
// record in the workspace or only their own. Single source of truth so the UI doesn't
// duplicate permission logic.
router.get('/company-data/permissions', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { canViewAll, canEditAll } = await resolveCompanyDataPermissions(user);
    res.json({ canViewAll, canEditAll });
  } catch (error) {
    console.error('Error resolving company-data permissions:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all company data entries for the user's workspace
// Owner/Admin sees all companies; other users see only companies they extracted
router.get('/company-data', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const {
      search,
      industry,
      industries,
      labelId,
      scope,
      assignedTo,
      contactsMin,
      hasWebsite,
      dateAdded,
      dateFrom,
      dateTo,
      sort,
    } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const skip = (page - 1) * limit;

    const query = { companyId: user.companyId };

    // canViewAll grants permission to see all records, but only when explicitly
    // requested via scope=all. Default (no scope / scope=mine) always shows own records.
    const { canViewAll } = await resolveCompanyDataPermissions(user);
    if (!canViewAll || scope !== 'all') {
      query.createdBy = user._id;
    }

    const scopeQuery = { ...query };

    const industryFilter = industries || industry;
    if (industryFilter) {
      const industryValues = String(industryFilter)
        .split(',')
        .map(value => value.trim())
        .filter(Boolean);
      if (industryValues.length === 1) query.industry = industryValues[0];
      if (industryValues.length > 1) query.industry = { $in: industryValues };
    }

    if (canViewAll && scope === 'all' && assignedTo && mongoose.Types.ObjectId.isValid(assignedTo)) {
      query.createdBy = assignedTo;
    }

    // If filtering by label, find companies whose contacts have this label
    if (labelId) {
      query['contacts.labels'] = labelId;
    }

    const parsedContactsMin = parseInt(contactsMin, 10);
    if (!Number.isNaN(parsedContactsMin) && parsedContactsMin > 0) {
      query.$expr = {
        $gte: [
          { $size: { $ifNull: ['$contacts', []] } },
          parsedContactsMin,
        ],
      };
    }

    if (hasWebsite === 'true') {
      query.website = { $exists: true, $nin: ['', null] };
    }

    if (dateAdded || dateFrom || dateTo) {
      const createdAt = {};
      const now = new Date();
      if (dateAdded === 'today') {
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        createdAt.$gte = start;
        createdAt.$lte = end;
      } else if (dateAdded === 'week') {
        createdAt.$gte = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateAdded === 'month') {
        createdAt.$gte = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateAdded === 'custom' || dateFrom || dateTo) {
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          createdAt.$gte = from;
        }
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          createdAt.$lte = to;
        }
      }
      if (Object.keys(createdAt).length > 0) query.createdAt = createdAt;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      query.$or = [
        { companyName: regex },
        { companyEmail: regex },
        { industry: regex },
      ];
    }

    const sortMap = {
      az: { companyName: 1 },
      za: { companyName: -1 },
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
    };
    const sortBy = sortMap[sort] || sortMap.newest;

    const wantsPagedResponse = req.query.page !== undefined || req.query.limit !== undefined;
    if (!wantsPagedResponse) {
      const companies = await CompanyData.find(query)
        .populate('createdBy', 'fullName email')
        .sort(sortBy);

      res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.json(companies);
    }

    const [companies, total, addedToday, industriesFacet] = await Promise.all([
      CompanyData.find(query)
        .populate('createdBy', 'fullName email')
        .sort(sortBy)
        .skip(skip)
        .limit(limit),
      CompanyData.countDocuments(query),
      (() => {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        return CompanyData.countDocuments({
          ...scopeQuery,
          createdAt: { $gte: start, $lte: end },
        });
      })(),
      CompanyData.aggregate([
        { $match: scopeQuery },
        { $match: { industry: { $exists: true, $nin: ['', null] } } },
        { $group: { _id: '$industry', count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
        { $project: { _id: 0, name: '$_id', count: 1 } },
      ]),
    ]);

    res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({
      data: companies,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + companies.length < total,
      },
      stats: {
        totalRecords: total,
        addedToday,
      },
      facets: {
        industries: industriesFacet,
      },
    });
  } catch (error) {
    console.error('Error fetching company data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single company data entry
router.get('/company-data/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { canViewAll } = await resolveCompanyDataPermissions(user);

    const filter = { _id: req.params.id, companyId: user.companyId };
    if (!canViewAll) filter.createdBy = user._id;

    const company = await CompanyData.findOne(filter).populate('createdBy', 'fullName email');

    if (!company) return res.status(404).json({ message: 'Company not found' });

    res.json(company);
  } catch (error) {
    console.error('Error fetching company data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create company data entry — only via Chrome Extension (source must be 'extension')
// Also enforces extension access: user must be in extensionAccessPeople or be Owner
router.post('/company-data', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const {
      companyName, companyEmail, companyPhone, address,
      website, linkedin, industry, notes, contacts, source
    } = req.body;

    if (!companyName || !companyName.trim()) {
      return res.status(400).json({ message: 'Company name is required' });
    }

    // Only allow creation from extension
    if (source !== 'extension') {
      return res.status(403).json({ message: 'Companies can only be added via the Chrome Extension' });
    }

    // Check extension access permission
    const company = await Company.findById(user.companyId);
    if (company) {
      const member = company.members.find(m => m.user && m.user.toString() === user._id.toString());
      const isOwner = (member && member.roleInCompany === 'Owner') ||
        (company.owner && company.owner.toString() === user._id.toString());

      if (!isOwner && user.role !== 'Admin') {
        const inExtensionAccess = (company.extensionAccessPeople || []).some(
          p => p.toString() === user._id.toString()
        );
        const inDataAccess = (company.dataAccessPermissions || []).some(p => {
          const uid = p.user?._id || p.user;
          return uid && uid.toString() === user._id.toString();
        });
        if (!inExtensionAccess && !inDataAccess) {
          return res.status(403).json({ message: 'You do not have permission to add data via the extension. Contact your workspace owner.' });
        }
      }
    }

    const companyData = new CompanyData({
      companyName: companyName.trim(),
      companyEmail,
      companyPhone,
      address,
      website,
      linkedin,
      industry,
      notes,
      contacts: contacts || [],
      source: 'extension',
      createdBy: user._id,
      companyId: user.companyId
    });

    await companyData.save();
    res.status(201).json(companyData);
  } catch (error) {
    console.error('Error creating company data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update company data entry
router.put('/company-data/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { canEditAll } = await resolveCompanyDataPermissions(user);

    const filter = { _id: req.params.id, companyId: user.companyId };
    if (!canEditAll) filter.createdBy = user._id;

    const company = await CompanyData.findOne(filter);

    if (!company) return res.status(404).json({ message: 'Company not found or not editable' });

    const {
      companyName, companyEmail, companyPhone, address,
      website, linkedin, industry, notes, contacts
    } = req.body;

    if (companyName !== undefined) company.companyName = companyName;
    if (companyEmail !== undefined) company.companyEmail = companyEmail;
    if (companyPhone !== undefined) company.companyPhone = companyPhone;
    if (address !== undefined) company.address = address;
    if (website !== undefined) company.website = website;
    if (linkedin !== undefined) company.linkedin = linkedin;
    if (industry !== undefined) company.industry = industry;
    if (notes !== undefined) company.notes = notes;
    if (contacts !== undefined) company.contacts = contacts;

    await company.save();
    res.json(company);
  } catch (error) {
    console.error('Error updating company data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete company data entry
router.delete('/company-data/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { canEditAll } = await resolveCompanyDataPermissions(user);

    const filter = { _id: req.params.id, companyId: user.companyId };
    if (!canEditAll) filter.createdBy = user._id;

    const company = await CompanyData.findOneAndDelete(filter);

    if (!company) return res.status(404).json({ message: 'Company not found or not deletable' });

    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('Error deleting company data:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Bulk add/remove label from all contacts of a company
router.patch('/company-data/:id/bulk-labels', auth, async (req, res) => {
  try {
    const { labelId, action } = req.body;
    if (!labelId) return res.status(400).json({ message: 'labelId is required' });

    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { canEditAll } = await resolveCompanyDataPermissions(user);
    const filter = { _id: req.params.id, companyId: user.companyId };
    if (!canEditAll) filter.createdBy = user._id;

    const company = await CompanyData.findOne(filter);
    if (!company) return res.status(404).json({ message: 'Company not found or not editable' });

    company.contacts.forEach(contact => {
      if (!contact.labels) contact.labels = [];
      if (action === 'add') {
        if (!contact.labels.some(l => l.toString() === labelId)) {
          contact.labels.push(labelId);
        }
      } else if (action === 'remove') {
        contact.labels = contact.labels.filter(l => l.toString() !== labelId);
      }
    });

    await company.save();
    res.json({ success: true });
  } catch (error) {
    console.error('Error bulk updating labels:', error);
    res.status(500).json({ message: 'Failed to update labels' });
  }
});

// ============ CONTACTS FROM COMPANY DATA ============

// Get all contacts flattened from all company data entries
router.get('/company-data-contacts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { status, search, important, labelId } = req.query;
    const wantsPagedResponse = req.query.page !== undefined || req.query.limit !== undefined;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 15, 1), 100);
    const skip = (page - 1) * limit;

    const { canViewAll } = await resolveCompanyDataPermissions(user);
    const listFilter = { companyId: user.companyId };
    if (!canViewAll) listFilter.createdBy = user._id;

    if (wantsPagedResponse) {
      const contactMatch = {
        $or: [
          { 'contacts.fullName': { $exists: true, $ne: '' } },
          { 'contacts.email': { $exists: true, $ne: '' } },
        ],
      };

      if (status && status !== 'All') {
        const normalized = normalizeStatus(status);
        const legacyValues = Object.entries(LEGACY_STATUS_MAP)
          .filter(([, value]) => value === normalized)
          .map(([key]) => key);
        contactMatch['contacts.status'] = { $in: [normalized, ...legacyValues] };
      }

      if (important === 'true') {
        contactMatch['contacts.isImportant'] = true;
      }

      if (labelId && mongoose.Types.ObjectId.isValid(labelId)) {
        contactMatch['contacts.labels'] = new mongoose.Types.ObjectId(labelId);
      }

      if (search) {
        const regex = new RegExp(escapeRegex(search), 'i');
        contactMatch.$and = [
          ...(contactMatch.$and || []),
          {
            $or: [
              { 'contacts.fullName': regex },
              { companyName: regex },
              { 'contacts.email': regex },
              { 'contacts.designation': regex },
            ],
          },
        ];
      }

      const [result, allLabels, company] = await Promise.all([
        CompanyData.aggregate([
          { $match: listFilter },
          { $sort: { createdAt: -1 } },
          { $unwind: { path: '$contacts', includeArrayIndex: 'contactIndex' } },
          { $match: contactMatch },
          {
            $facet: {
              data: [
                { $skip: skip },
                { $limit: limit },
                {
                  $project: {
                    companyDataId: '$_id',
                    contactIndex: 1,
                    contact: '$contacts',
                    companyName: 1,
                    website: 1,
                    companyId: 1,
                    createdAt: 1,
                  },
                },
              ],
              total: [{ $count: 'count' }],
            },
          },
        ]),
        ContactLabel.find({ companyId: user.companyId }).lean(),
        Company.findById(user.companyId).lean(),
      ]);

      const labelMap = {};
      allLabels.forEach(l => { labelMap[l._id.toString()] = l; });
      const companyLocation = company?.address || company?.headquarters || company?.companyCity || company?.companyState || company?.companyCountry || '';
      const rows = result[0]?.data || [];
      const total = result[0]?.total?.[0]?.count || 0;
      const contacts = rows.map(row => {
        const c = row.contact || {};
        const contactLabels = (c.labels || []).map(lid => labelMap[lid.toString()]).filter(Boolean);

        return {
          _id: `${row.companyDataId}_${row.contactIndex}`,
          companyDataId: row.companyDataId,
          contactIndex: row.contactIndex,
          fullName: c.fullName || '',
          designation: c.designation || '',
          phone: c.phone || '',
          email: c.email || '',
          location: c.location || '',
          companyLocation,
          socialLinks: c.socialLinks || [],
          status: normalizeStatus(c.status),
          followUp: c.followUp || '',
          isImportant: c.isImportant || false,
          labels: contactLabels,
          companyName: row.companyName,
          website: row.website,
          sourceType: 'company-data',
          createdAt: row.createdAt
        };
      });

      return res.json({
        data: contacts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + contacts.length < total,
        },
      });
    }

    const companies = await CompanyData.find(listFilter)
      .sort({ createdAt: -1 });

    const allLabels = await ContactLabel.find({ companyId: user.companyId }).lean();
    const labelMap = {};
    allLabels.forEach(l => { labelMap[l._id.toString()] = l; });

    // Fetch all companies to get their location info
    const companyIds = [...new Set(companies.map(c => c.companyId))];
    const companiesMap = {};
    if (companyIds.length > 0) {
      const companiesList = await Company.find({ _id: { $in: companyIds } }).lean();
      companiesList.forEach(c => { companiesMap[c._id.toString()] = c; });
    }

    const contacts = [];
    for (const comp of companies) {
      if (!comp.contacts || comp.contacts.length === 0) continue;
      for (let i = 0; i < comp.contacts.length; i++) {
        const c = comp.contacts[i];
        if (!c.fullName && !c.email) continue;

        const companyDetails = companiesMap[comp.companyId.toString()] || {};
        const companyLocation = companyDetails.address || companyDetails.headquarters || companyDetails.companyCity || companyDetails.companyState || companyDetails.companyCountry || '';

        const contactLabels = (c.labels || []).map(lid => labelMap[lid.toString()]).filter(Boolean);

        const contact = {
          _id: `${comp._id}_${i}`,
          companyDataId: comp._id,
          contactIndex: i,
          fullName: c.fullName || '',
          designation: c.designation || '',
          phone: c.phone || '',
          email: c.email || '',
          location: c.location || '',
          companyLocation: companyLocation,
          socialLinks: c.socialLinks || [],
          status: normalizeStatus(c.status),
          followUp: c.followUp || '',
          isImportant: c.isImportant || false,
          labels: contactLabels,
          companyName: comp.companyName,
          website: comp.website,
          sourceType: 'company-data',
          createdAt: comp.createdAt
        };

        if (status && status !== 'All' && contact.status !== status) continue;
        if (important === 'true' && !contact.isImportant) continue;
        if (labelId && !contact.labels.some(l => l._id.toString() === labelId)) continue;
        if (search) {
          const q = search.toLowerCase();
          const match = contact.fullName.toLowerCase().includes(q) ||
            contact.companyName.toLowerCase().includes(q) ||
            contact.email.toLowerCase().includes(q) ||
            contact.designation.toLowerCase().includes(q);
          if (!match) continue;
        }

        contacts.push(contact);
      }
    }

    res.json(contacts);
  } catch (error) {
    console.error('Error fetching company data contacts:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update contact status within company data
router.patch('/company-data-contacts/:companyDataId/:contactIndex/status', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { companyDataId, contactIndex } = req.params;
    const { status, followUp } = req.body;
    const idx = parseInt(contactIndex);

    const { canEditAll } = await resolveCompanyDataPermissions(user);
    const filter = { _id: companyDataId, companyId: user.companyId };
    if (!canEditAll) filter.createdBy = user._id;

    const company = await CompanyData.findOne(filter);
    if (!company) return res.status(404).json({ message: 'Company not found or not editable' });
    if (!company.contacts || idx >= company.contacts.length) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (status) {
      const normalizedStatus = normalizeStatus(status);
      if (!CONTACT_STATUS_VALUES.has(normalizedStatus)) {
        return res.status(400).json({ message: 'Invalid contact status' });
      }
      company.contacts[idx].status = normalizedStatus;
    }
    if (followUp !== undefined) company.contacts[idx].followUp = followUp;

    await company.save();

    const c = company.contacts[idx];
    res.json({
      _id: `${company._id}_${idx}`,
      companyDataId: company._id,
      contactIndex: idx,
      fullName: c.fullName || '',
      designation: c.designation || '',
      phone: c.phone || '',
      email: c.email || '',
      location: c.location || '',
      socialLinks: c.socialLinks || [],
      status: normalizeStatus(c.status),
      followUp: c.followUp || '',
      isImportant: c.isImportant || false,
      labels: c.labels || [],
      companyName: company.companyName,
      website: company.website,
      sourceType: 'company-data',
      createdAt: company.createdAt
    });
  } catch (error) {
    console.error('Error updating contact status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle important for contact within company data
router.patch('/company-data-contacts/:companyDataId/:contactIndex/important', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { companyDataId, contactIndex } = req.params;
    const idx = parseInt(contactIndex);

    const { canEditAll } = await resolveCompanyDataPermissions(user);
    const filter = { _id: companyDataId, companyId: user.companyId };
    if (!canEditAll) filter.createdBy = user._id;

    const company = await CompanyData.findOne(filter);
    if (!company) return res.status(404).json({ message: 'Company not found or not editable' });
    if (!company.contacts || idx >= company.contacts.length) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    company.contacts[idx].isImportant = !company.contacts[idx].isImportant;
    await company.save();

    res.json({ isImportant: company.contacts[idx].isImportant });
  } catch (error) {
    console.error('Error toggling important:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add/remove label for contact within company data
router.patch('/company-data-contacts/:companyDataId/:contactIndex/labels', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { companyDataId, contactIndex } = req.params;
    const { labelId, action } = req.body;
    const idx = parseInt(contactIndex);

    const { canEditAll } = await resolveCompanyDataPermissions(user);
    const filter = { _id: companyDataId, companyId: user.companyId };
    if (!canEditAll) filter.createdBy = user._id;

    const company = await CompanyData.findOne(filter);
    if (!company) return res.status(404).json({ message: 'Company not found or not editable' });
    if (!company.contacts || idx >= company.contacts.length) {
      return res.status(404).json({ message: 'Contact not found' });
    }

    if (!company.contacts[idx].labels) company.contacts[idx].labels = [];

    if (action === 'add') {
      const label = await ContactLabel.findOne({ _id: labelId, companyId: user.companyId });
      if (!label) return res.status(404).json({ message: 'Label not found' });
      if (!company.contacts[idx].labels.some(l => l.toString() === labelId)) {
        company.contacts[idx].labels.push(labelId);
      }
    } else if (action === 'remove') {
      company.contacts[idx].labels = company.contacts[idx].labels.filter(l => l.toString() !== labelId);
    }

    await company.save();

    const allLabels = await ContactLabel.find({ companyId: user.companyId }).lean();
    const labelMap = {};
    allLabels.forEach(l => { labelMap[l._id.toString()] = l; });
    const contactLabels = company.contacts[idx].labels.map(lid => labelMap[lid.toString()]).filter(Boolean);

    res.json({ labels: contactLabels });
  } catch (error) {
    console.error('Error updating contact labels:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ============ LABELED CONTACTS AS PHONE LISTS ============
// Returns contacts grouped by label, formatted as phone lists for WhatsApp campaigns
router.get('/company-data-phone-lists', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const { canViewAll } = await resolveCompanyDataPermissions(user);
    const listFilter = { companyId: user.companyId };
    if (!canViewAll) listFilter.createdBy = user._id;

    const allLabels = await ContactLabel.find({ companyId: user.companyId }).lean();
    const companies = await CompanyData.find(listFilter).lean();

    const phoneLists = allLabels.map(label => {
      const phones = [];
      for (const comp of companies) {
        if (!comp.contacts || comp.contacts.length === 0) continue;
        for (const contact of comp.contacts) {
          if (!contact.phone) continue;
          const hasLabel = (contact.labels || []).some(lid => lid.toString() === label._id.toString());
          if (hasLabel) {
            phones.push({
              phone: contact.phone,
              name: contact.fullName || '',
              companyName: comp.companyName,
              designation: contact.designation || '',
              email: contact.email || ''
            });
          }
        }
      }
      return {
        _id: `label_${label._id}`,
        labelId: label._id,
        name: `${label.name} (Company Data)`,
        description: `Auto-generated from labeled company contacts`,
        color: label.color,
        phones,
        phoneCount: phones.length,
        isLabelList: true
      };
    }).filter(pl => pl.phones.length > 0);

    res.json(phoneLists);
  } catch (error) {
    console.error('Error fetching labeled phone lists:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
