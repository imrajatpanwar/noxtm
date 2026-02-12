import api from '../config/api';

// ============================================
// USER MANAGEMENT
// ============================================

export const getAdminUsers = (params = {}) => {
  return api.get('/admin/users', { params });
};

export const getAdminUser = (id) => {
  return api.get(`/admin/users/${id}`);
};

export const updateAdminUser = (id, data) => {
  return api.put(`/admin/users/${id}`, data);
};

export const deleteAdminUser = (id, reason = '') => {
  return api.delete(`/admin/users/${id}`, { data: { reason } });
};

export const updateUserSubscription = (id, data) => {
  return api.put(`/admin/users/${id}/subscription`, data);
};

// ============================================
// COMPANY MANAGEMENT
// ============================================

export const getAdminCompanies = (params = {}) => {
  return api.get('/admin/companies', { params });
};

export const getAdminCompany = (id) => {
  return api.get(`/admin/companies/${id}`);
};

export const updateAdminCompany = (id, data) => {
  return api.put(`/admin/companies/${id}`, data);
};

export const adjustCompanyCredits = (companyId, data) => {
  return api.post(`/admin/companies/${companyId}/credits`, data);
};

// ============================================
// STATS & AUDIT
// ============================================

export const getAdminStats = () => {
  return api.get('/admin/stats');
};

export const getAdminAuditLog = (params = {}) => {
  return api.get('/admin/audit-log', { params });
};
