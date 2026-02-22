import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import api from '../config/api';

const WhatsAppContext = createContext();

export const useWhatsApp = () => {
  const context = useContext(WhatsAppContext);
  if (!context) {
    throw new Error('useWhatsApp must be used within a WhatsAppProvider');
  }
  return context;
};

export function WhatsAppProvider({ children, socket }) {
  const [accounts, setAccounts] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState({});  // { contactId: [messages] }
  const [campaigns, setCampaigns] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [phoneLists, setPhoneLists] = useState([]);
  const [chatbot, setChatbot] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [qrCode, setQrCode] = useState(null);       // Current QR for linking
  const [linkingAccountId, setLinkingAccountId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [campaignProgress, setCampaignProgress] = useState({});  // { campaignId: progress }
  const socketRef = useRef(socket);

  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // ===== SOCKET.IO LISTENERS =====
  useEffect(() => {
    if (!socket) return;

    // Join WhatsApp room
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.companyId) {
          socket.emit('join-whatsapp', payload.companyId);
        }
      } catch (e) { }
    }

    // QR Code received from backend
    const handleQR = (data) => {
      setQrCode(data.qr);
      setLinkingAccountId(data.accountId);
    };

    // Account connected successfully
    const handleConnected = (data) => {
      setQrCode(null);
      setLinkingAccountId(null);
      setAccounts(prev =>
        prev.map(a =>
          a._id === data.accountId
            ? { ...a, status: 'connected', phoneNumber: data.phoneNumber, displayName: data.displayName, profilePicture: data.profilePicture }
            : a
        )
      );
      toast.success(`WhatsApp connected: ${data.displayName || data.phoneNumber || 'Account'}`);
    };

    // Account disconnected
    const handleDisconnected = (data) => {
      setAccounts(prev =>
        prev.map(a =>
          a._id === data.accountId ? { ...a, status: 'disconnected' } : a
        )
      );
      const reason = data.reason === 'device_removed' ? ' (device removed)' : data.reason === 'logged_out' ? ' (logged out)' : '';
      toast.warning(`WhatsApp disconnected${reason}`);
    };

    // New incoming message
    const handleNewMessage = (data) => {
      const { contactId, message: msg } = data;
      setMessages(prev => ({
        ...prev,
        [contactId]: [...(prev[contactId] || []), msg]
      }));

      // Update contact's last message preview
      setContacts(prev =>
        prev.map(c =>
          c._id === contactId
            ? {
              ...c,
              lastMessageAt: msg.timestamp,
              lastMessagePreview: (msg.content || '[Media]').substring(0, 150),
              lastMessageDirection: msg.direction,
              unreadCount: msg.direction === 'inbound' ? (c.unreadCount || 0) + 1 : c.unreadCount
            }
            : c
        )
      );
    };

    // Message status update (delivered/read)
    const handleStatusUpdate = (data) => {
      const { contactId, messageId, status } = data;
      setMessages(prev => ({
        ...prev,
        [contactId]: (prev[contactId] || []).map(m =>
          m.whatsappMessageId === messageId ? { ...m, status } : m
        )
      }));
    };

    // Campaign progress
    const handleCampaignProgress = (data) => {
      setCampaignProgress(prev => ({
        ...prev,
        [data.campaignId]: data
      }));

      // Update campaign in list
      if (data.status) {
        setCampaigns(prev =>
          prev.map(c =>
            c._id === data.campaignId ? { ...c, status: data.status, stats: data.stats || c.stats } : c
          )
        );
      }
    };

    socket.on('whatsapp:qr', handleQR);
    socket.on('whatsapp:connected', handleConnected);
    socket.on('whatsapp:disconnected', handleDisconnected);
    socket.on('whatsapp:new-message', handleNewMessage);
    socket.on('whatsapp:message-status', handleStatusUpdate);
    socket.on('whatsapp:campaign:progress', handleCampaignProgress);

    return () => {
      socket.off('whatsapp:qr', handleQR);
      socket.off('whatsapp:connected', handleConnected);
      socket.off('whatsapp:disconnected', handleDisconnected);
      socket.off('whatsapp:new-message', handleNewMessage);
      socket.off('whatsapp:message-status', handleStatusUpdate);
      socket.off('whatsapp:campaign:progress', handleCampaignProgress);
    };
  }, [socket]);

  // ===== API METHODS =====

  // Dashboard
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/dashboard');
      if (res.data.success) setDashboard(res.data.data);
    } catch (e) {
      console.error('Fetch dashboard error:', e);
    }
  }, []);

  // Accounts
  const fetchAccounts = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/accounts');
      if (res.data.success) setAccounts(res.data.data);
    } catch (e) {
      console.error('Fetch accounts error:', e);
    }
  }, []);

  const linkAccount = useCallback(async (displayName) => {
    try {
      setLoading(true);
      const res = await api.post('/whatsapp/accounts/link', { displayName });
      if (res.data.success) {
        setLinkingAccountId(res.data.data.accountId);
        await fetchAccounts();
      }
      return res.data;
    } catch (e) {
      console.error('Link account error:', e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, [fetchAccounts]);

  const reconnectAccount = useCallback(async (accountId) => {
    try {
      await api.post(`/whatsapp/accounts/${accountId}/reconnect`);
      await fetchAccounts();
    } catch (e) {
      console.error('Reconnect error:', e);
      throw e;
    }
  }, [fetchAccounts]);

  const disconnectAccount = useCallback(async (accountId) => {
    try {
      await api.post(`/whatsapp/accounts/${accountId}/disconnect`);
      await fetchAccounts();
    } catch (e) {
      console.error('Disconnect error:', e);
      throw e;
    }
  }, [fetchAccounts]);

  const removeAccount = useCallback(async (accountId) => {
    try {
      await api.delete(`/whatsapp/accounts/${accountId}`);
      setAccounts(prev => prev.filter(a => a._id !== accountId));
    } catch (e) {
      console.error('Remove error:', e);
      throw e;
    }
  }, []);

  const updateAccountSettings = useCallback(async (accountId, settings) => {
    try {
      const res = await api.put(`/whatsapp/accounts/${accountId}/settings`, settings);
      if (res.data.success) {
        setAccounts(prev => prev.map(a => a._id === accountId ? res.data.data : a));
      }
      return res.data;
    } catch (e) {
      console.error('Update settings error:', e);
      throw e;
    }
  }, []);

  const setDefaultAccount = useCallback(async (accountId) => {
    try {
      await api.put(`/whatsapp/accounts/${accountId}/default`);
      await fetchAccounts();
    } catch (e) {
      console.error('Set default error:', e);
      throw e;
    }
  }, [fetchAccounts]);

  // Contacts
  const fetchContacts = useCallback(async (params = {}) => {
    try {
      const res = await api.get('/whatsapp/contacts', { params });
      if (res.data.success) setContacts(res.data.data);
      return res.data;
    } catch (e) {
      console.error('Fetch contacts error:', e);
    }
  }, []);

  const updateContact = useCallback(async (contactId, updates) => {
    try {
      const res = await api.put(`/whatsapp/contacts/${contactId}`, updates);
      if (res.data.success) {
        setContacts(prev => prev.map(c => c._id === contactId ? res.data.data : c));
      }
      return res.data;
    } catch (e) {
      console.error('Update contact error:', e);
      throw e;
    }
  }, []);

  // Messages
  const fetchMessages = useCallback(async (contactId, page = 1) => {
    try {
      const res = await api.get(`/whatsapp/messages/${contactId}`, { params: { page, limit: 50 } });
      if (res.data.success) {
        setMessages(prev => ({
          ...prev,
          [contactId]: page === 1 ? res.data.data : [...res.data.data, ...(prev[contactId] || [])]
        }));
      }
      return res.data;
    } catch (e) {
      console.error('Fetch messages error:', e);
    }
  }, []);

  const sendMessage = useCallback(async (accountId, contactId, jid, content, options = {}) => {
    try {
      const res = await api.post('/whatsapp/messages/send', {
        accountId,
        contactId,
        jid,
        content,
        ...options
      });
      return res.data;
    } catch (e) {
      console.error('Send message error:', e);
      throw e;
    }
  }, []);

  const sendNewMessage = useCallback(async (accountId, phoneNumber, content, options = {}) => {
    try {
      const res = await api.post('/whatsapp/messages/send-new', {
        accountId,
        phoneNumber,
        content,
        ...options
      });
      return res.data;
    } catch (e) {
      console.error('Send new message error:', e);
      throw e;
    }
  }, []);

  // Campaigns
  const fetchCampaigns = useCallback(async (params = {}) => {
    try {
      const res = await api.get('/whatsapp/campaigns', { params });
      if (res.data.success) setCampaigns(res.data.data);
      return res.data;
    } catch (e) {
      console.error('Fetch campaigns error:', e);
    }
  }, []);

  const createCampaign = useCallback(async (data) => {
    try {
      const res = await api.post('/whatsapp/campaigns', data);
      if (res.data.success) setCampaigns(prev => [res.data.data, ...prev]);
      return res.data;
    } catch (e) {
      console.error('Create campaign error:', e);
      throw e;
    }
  }, []);

  const startCampaign = useCallback(async (campaignId) => {
    try {
      return await api.post(`/whatsapp/campaigns/${campaignId}/start`);
    } catch (e) {
      console.error('Start campaign error:', e);
      throw e;
    }
  }, []);

  const pauseCampaign = useCallback(async (campaignId) => {
    try {
      return await api.post(`/whatsapp/campaigns/${campaignId}/pause`);
    } catch (e) {
      console.error('Pause campaign error:', e);
      throw e;
    }
  }, []);

  const resumeCampaign = useCallback(async (campaignId) => {
    try {
      return await api.post(`/whatsapp/campaigns/${campaignId}/resume`);
    } catch (e) {
      console.error('Resume campaign error:', e);
      throw e;
    }
  }, []);

  const deleteCampaign = useCallback(async (campaignId) => {
    try {
      await api.delete(`/whatsapp/campaigns/${campaignId}`);
      setCampaigns(prev => prev.filter(c => c._id !== campaignId));
    } catch (e) {
      console.error('Delete campaign error:', e);
      throw e;
    }
  }, []);

  // Templates
  const fetchTemplates = useCallback(async (params = {}) => {
    try {
      const res = await api.get('/whatsapp/templates', { params });
      if (res.data.success) setTemplates(res.data.data);
      return res.data;
    } catch (e) {
      console.error('Fetch templates error:', e);
    }
  }, []);

  const createTemplate = useCallback(async (data) => {
    try {
      const res = await api.post('/whatsapp/templates', data);
      if (res.data.success) setTemplates(prev => [res.data.data, ...prev]);
      return res.data;
    } catch (e) {
      console.error('Create template error:', e);
      throw e;
    }
  }, []);

  const updateTemplate = useCallback(async (templateId, data) => {
    try {
      const res = await api.put(`/whatsapp/templates/${templateId}`, data);
      if (res.data.success) {
        setTemplates(prev => prev.map(t => t._id === templateId ? res.data.data : t));
      }
      return res.data;
    } catch (e) {
      console.error('Update template error:', e);
      throw e;
    }
  }, []);

  const deleteTemplate = useCallback(async (templateId) => {
    try {
      await api.delete(`/whatsapp/templates/${templateId}`);
      setTemplates(prev => prev.filter(t => t._id !== templateId));
    } catch (e) {
      console.error('Delete template error:', e);
      throw e;
    }
  }, []);

  // Phone Lists
  const fetchPhoneLists = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/phone-lists');
      if (res.data.success) setPhoneLists(res.data.data);
      return res.data;
    } catch (e) {
      console.error('Fetch phone lists error:', e);
    }
  }, []);

  const createPhoneList = useCallback(async (data) => {
    try {
      const res = await api.post('/whatsapp/phone-lists', data);
      if (res.data.success) setPhoneLists(prev => [res.data.data, ...prev]);
      return res.data;
    } catch (e) {
      console.error('Create phone list error:', e);
      throw e;
    }
  }, []);

  const updatePhoneList = useCallback(async (listId, data) => {
    try {
      const res = await api.put(`/whatsapp/phone-lists/${listId}`, data);
      if (res.data.success) {
        setPhoneLists(prev => prev.map(l => l._id === listId ? res.data.data : l));
      }
      return res.data;
    } catch (e) {
      console.error('Update phone list error:', e);
      throw e;
    }
  }, []);

  const deletePhoneList = useCallback(async (listId) => {
    try {
      await api.delete(`/whatsapp/phone-lists/${listId}`);
      setPhoneLists(prev => prev.filter(l => l._id !== listId));
    } catch (e) {
      console.error('Delete phone list error:', e);
      throw e;
    }
  }, []);

  // Chatbot Config
  const fetchChatbot = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/chatbot');
      if (res.data.success) setChatbot(res.data.data);
      return res.data;
    } catch (e) {
      console.error('Fetch chatbot error:', e);
    }
  }, []);

  const updateChatbot = useCallback(async (data) => {
    try {
      const res = await api.put('/whatsapp/chatbot', data);
      if (res.data.success) setChatbot(res.data.data);
      return res.data;
    } catch (e) {
      console.error('Update chatbot error:', e);
      throw e;
    }
  }, []);

  const testChatbot = useCallback(async (message) => {
    try {
      const res = await api.post('/whatsapp/chatbot/test', { message });
      return res.data;
    } catch (e) {
      console.error('Test chatbot error:', e);
      throw e;
    }
  }, []);

  const value = {
    // State
    accounts,
    contacts,
    messages,
    campaigns,
    templates,
    phoneLists,
    chatbot,
    dashboard,
    qrCode,
    linkingAccountId,
    loading,
    campaignProgress,

    // Account methods
    fetchAccounts,
    linkAccount,
    reconnectAccount,
    disconnectAccount,
    removeAccount,
    updateAccountSettings,
    setDefaultAccount,

    // Contact methods
    fetchContacts,
    updateContact,

    // Message methods
    fetchMessages,
    sendMessage,
    sendNewMessage,

    // Campaign methods
    fetchCampaigns,
    createCampaign,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    deleteCampaign,

    // Template methods
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,

    // Phone list methods
    fetchPhoneLists,
    createPhoneList,
    updatePhoneList,
    deletePhoneList,

    // Chatbot methods
    fetchChatbot,
    updateChatbot,
    testChatbot,

    // Dashboard
    fetchDashboard,

    // Helpers
    setQrCode,
    setLinkingAccountId
  };

  return (
    <WhatsAppContext.Provider value={value}>
      {children}
    </WhatsAppContext.Provider>
  );
}

export default WhatsAppContext;
