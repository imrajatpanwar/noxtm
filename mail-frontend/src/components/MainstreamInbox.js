import React, { useState, useEffect, useRef } from 'react';
import {
  MdInbox, MdRefresh, MdMoreVert, MdStar, MdStarBorder,
  MdArchive, MdDelete, MdEdit,
  MdChevronLeft, MdChevronRight,
  MdSend, MdAttachFile, MdClose, MdMinimize,
  MdMaximize, MdDownload, MdArrowDropDown,
  MdReply, MdForward,
  MdFormatBold, MdFormatItalic, MdFormatUnderlined,
  MdFormatListBulleted, MdFormatListNumbered,
  MdFormatAlignLeft, MdFormatAlignCenter, MdFormatAlignRight,
  MdFormatIndentIncrease, MdFormatIndentDecrease,
  MdFormatQuote, MdStrikethroughS, MdFormatClear,
  MdUndo, MdRedo, MdInsertLink, MdInsertPhoto,
  MdInsertEmoticon, MdMoreHoriz, MdOpenInFull
} from 'react-icons/md';
import { Search, Settings, UserPlus, LogOut, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../config/api';
import { getMainAppUrl } from '../config/authConfig';
import CreateEmailModal from './CreateEmailModal';
import EmailConnectionForm from './EmailConnectionForm';
import MailSettings from './settings/MailSettings';
import Checkbox from './ui/Checkbox';
import IconButton from './ui/IconButton';
import Tab from './ui/Tab';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from './ui/dropdown-menu';
import { Input } from './ui/input';
import { Button } from './ui/button';
import './MainstreamInbox.css';

function MainstreamInbox({ user, onNavigateToDomains, onLogout, initialTab }) {  // Receive user and navigation callback as props from parent (Inbox)
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab || 'primary'); // 'primary' | 'promotions' | 'social' | 'updates' | 'sent' | 'settings'
  const [emails, setEmails] = useState([]);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accountsLoading, setAccountsLoading] = useState(true); // NEW: Track initial account fetch
  const [accountsError, setAccountsError] = useState(null); // Track account fetch errors
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeMinimized, setComposeMinimized] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeAttachments, setComposeAttachments] = useState([]);
  const [composeCc, setComposeCc] = useState('');
  const [composeBcc, setComposeBcc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [showFormattingBar, setShowFormattingBar] = useState(false);
  const [composeExpanded, setComposeExpanded] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [showLinkPopover, setShowLinkPopover] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [savedSelection, setSavedSelection] = useState(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const editorRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const moreOptionsRef = useRef(null);
  const linkPopoverRef = useRef(null);

  // Common emojis grid
  const emojiList = [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
    '😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
    '😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔',
    '😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔',
    '😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶',
    '😱','😨','😰','😥','😢','😭','😤','😡','🤬','😈',
    '👿','💀','☠️','💩','🤡','👹','👺','👻','👽','👾',
    '🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾',
    '👋','🤚','🖐️','✋','🖖','👌','🤌','🤏','✌️','🤞',
    '🤟','🤘','🤙','👈','👉','👆','🖕','👇','☝️','👍',
    '👎','✊','👊','🤛','🤜','👏','🙌','👐','🤲','🤝',
    '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔',
    '💯','💢','💥','💫','💦','💨','🕳️','💣','💬','👁️',
    '⭐','🌟','✨','⚡','🔥','💥','🎉','🎊','🎈','🎁',
    '✅','❌','⚠️','🚀','💡','📌','📎','🔗','📝','✏️',
  ];

  // Close emoji picker, link popover & more options on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setShowEmojiPicker(false);
      }
      if (moreOptionsRef.current && !moreOptionsRef.current.contains(e.target)) {
        setShowMoreOptions(false);
      }
      if (linkPopoverRef.current && !linkPopoverRef.current.contains(e.target)) {
        setShowLinkPopover(false);
        setLinkUrl('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save current selection range (for link insertion)
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      setSavedSelection(sel.getRangeAt(0).cloneRange());
    }
  };

  // Restore saved selection
  const restoreSelection = () => {
    if (savedSelection) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(savedSelection);
    }
  };

  // Apply link to selected text/image
  const applyLink = () => {
    if (!linkUrl.trim()) return;
    let url = linkUrl.trim();
    // Auto-add https:// if no protocol
    if (!/^https?:\/\//i.test(url) && !url.startsWith('mailto:')) {
      url = 'https://' + url;
    }
    // Restore the saved selection first
    restoreSelection();
    document.execCommand('createLink', false, url);
    setShowLinkPopover(false);
    setLinkUrl('');
    setSavedSelection(null);
    editorRef.current?.focus();
  };

  // Insert emoji into editor
  const insertEmoji = (emoji) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertText', false, emoji);
    }
    setShowEmojiPicker(false);
  };

  // Insert image into editor
  const handleImageInsert = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand('insertHTML', false, `<img src="${ev.target.result}" style="max-width: 100%; height: auto; border-radius: 4px; margin: 8px 0;" />`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = ''; // reset so same file can be re-selected
  };
  const [createEmailModalOpen, setCreateEmailModalOpen] = useState(false);
  const [loginMailModalOpen, setLoginMailModalOpen] = useState(false); // NEW: Control Login Mail modal
  const [currentUser, setCurrentUser] = useState(user);  // Initialize with prop
  const [avatarUploadState, setAvatarUploadState] = useState({ uploading: false, error: null, success: null });
  const emailsPerPage = 14;

  // Gmail-style checkbox selection
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [starredEmails, setStarredEmails] = useState(new Set());
  const [selectDropdownOpen, setSelectDropdownOpen] = useState(false);

  // Fetch hosted email accounts - only after user is ready
  useEffect(() => {
    if (user) {
      // Small delay to ensure token is stable and auth loading flag is cleared
      const timer = setTimeout(() => {
        fetchHostedAccounts();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Fetch emails when account or tab changes
  useEffect(() => {
    if (selectedAccount && activeTab !== 'settings') {
      fetchEmails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, activeTab, currentPage]);

  // Update currentUser when prop changes
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  // Persist selected account ID to localStorage
  useEffect(() => {
    if (selectedAccount?._id) {
      localStorage.setItem('selectedEmailAccountId', selectedAccount._id);
    }
  }, [selectedAccount]);

  // Sync activeTab when initialTab prop changes (sidebar Settings click)
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Dropdown click-outside is handled by Radix DropdownMenu automatically

  const fetchHostedAccounts = async () => {
    setAccountsLoading(true); // Set loading state
    setAccountsError(null); // Clear previous error
    try {
      // Fetch both owned accounts and connected accounts
      const [ownedResponse, connectedResponse] = await Promise.all([
        api.get('/email-accounts/by-verified-domain'),
        api.get('/email-accounts/connected')
      ]);

      const ownedAccounts = ownedResponse.data?.accounts || [];
      const connectedAccounts = connectedResponse.data?.accounts || [];
      const verifiedDomains = ownedResponse.data?.verifiedDomains || [];

      // Merge both lists, avoiding duplicates
      const accountMap = new Map();

      [...ownedAccounts, ...connectedAccounts].forEach(account => {
        if (account.accountType === 'noxtm-hosted' &&
          account.imapSettings &&
          account.imapSettings.encryptedPassword) {
          accountMap.set(account._id, account);
        }
      });

      const allAccounts = Array.from(accountMap.values());

      setAccounts(allAccounts);

      // Check if user just created a new account (Phase 3A: Auto-switch)
      const lastCreatedDomain = localStorage.getItem('lastCreatedDomain');

      if (lastCreatedDomain && allAccounts.length > 0) {
        // Try to find account on the newly created domain
        const newAccount = allAccounts.find(acc =>
          acc.domain?.toLowerCase() === lastCreatedDomain.toLowerCase()
        );

        if (newAccount) {
          setSelectedAccount(newAccount);
          localStorage.removeItem('lastCreatedDomain'); // Clear flag
        } else {
          // Fallback to first account
          setSelectedAccount(allAccounts[0]);
        }
      } else if (allAccounts.length > 0) {
        // Try to restore previously selected account from localStorage
        const savedAccountId = localStorage.getItem('selectedEmailAccountId');
        if (savedAccountId) {
          const savedAccount = allAccounts.find(acc => acc._id === savedAccountId);
          if (savedAccount) {
            setSelectedAccount(savedAccount);
          } else {
            setSelectedAccount(allAccounts[0]);
          }
        } else {
          // No saved selection, select first account
          setSelectedAccount(allAccounts[0]);
        }
      }
    } catch (error) {
      setAccounts([]);
      setAccountsError('Failed to load email accounts. Please try again.');
    } finally {
      setAccountsLoading(false); // Clear loading state
    }
  };

  const fetchEmails = async () => {
    if (!selectedAccount || activeTab === 'settings') {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Map Gmail tabs to folders (all tabs currently use INBOX, can be extended later)
      const folder = activeTab === 'sent' ? 'Sent' : 'INBOX';

      const response = await api.get('/email-accounts/fetch-inbox', {
        params: {
          accountId: selectedAccount._id,
          folder: folder,
          page: currentPage,
          limit: emailsPerPage
        }
      });

      let fetchedEmails = response.data.emails || [];
      const total = response.data.total || 0;

      // Filter out emails sent by the current user (self-sent emails in Inbox)
      if (activeTab !== 'sent') {
        const originalLength = fetchedEmails.length;
        fetchedEmails = fetchedEmails.filter(email => {
          const fromAddress = email.from?.address || '';
          return fromAddress.toLowerCase() !== selectedAccount.email.toLowerCase();
        });
      }

      setEmails(fetchedEmails);
      setTotalEmails(total);
    } catch (error) {

      const status = error.response?.status;
      const serverMessage = error.response?.data?.message;

      if (status === 404) {
        // Account was deleted or recreated on the server. Refresh list so we pick the new ID.
        setError('Email account was refreshed. Reloading account list...');
        await fetchHostedAccounts();
      } else if (status === 500 && serverMessage?.toLowerCase().includes('decrypt')) {
        setError('Stored mailbox credentials are invalid. Please recreate this email account.');
      } else {
        setError(serverMessage || 'Failed to load emails. Please try again.');
      }

      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailClick = async (email) => {
    // Gmail-style: Open email in full view by setting it as selected
    // Fetch full email body only when clicked (if not already loaded)
    if (!email.bodyLoaded && email.uid) {
      try {
        setLoading(true);
        const folder = activeTab === 'sent' ? 'Sent' : 'INBOX';
        const response = await api.get('/email-accounts/fetch-email-body', {
          params: {
            accountId: selectedAccount._id,
            uid: email.uid,
            folder: folder
          }
        });

        // Update the email with full body data and mark as seen
        const fullEmail = {
          ...email,
          ...response.data.email,
          bodyLoaded: true,
          seen: true  // Mark as read when opened
        };

        setSelectedEmail(fullEmail);

        // Update the email in the list as well
        setEmails(prevEmails =>
          prevEmails.map(e => e.uid === email.uid ? fullEmail : e)
        );

        // Mark email as read on server (fire and forget)
        try {
          await api.post('/email-accounts/mark-as-read', {
            accountId: selectedAccount._id,
            uid: email.uid,
            folder: folder
          });
        } catch (markReadError) {
          // Don't show error to user - email is already marked as read in UI
        }
      } catch (error) {
        setError('Failed to load email content');
      } finally {
        setLoading(false);
      }
    } else {
      setSelectedEmail(email);
      // If email was unread, mark it as read
      if (!email.seen && email.uid) {
        const updatedEmail = { ...email, seen: true };
        setSelectedEmail(updatedEmail);
        setEmails(prevEmails =>
          prevEmails.map(e => e.uid === email.uid ? updatedEmail : e)
        );

        // Mark email as read on server (fire and forget)
        try {
          const folder = activeTab === 'sent' ? 'Sent' : 'INBOX';
          await api.post('/email-accounts/mark-as-read', {
            accountId: selectedAccount._id,
            uid: email.uid,
            folder: folder
          });
        } catch (markReadError) {
        }
      }
    }
  };

  const handleBackToList = () => {
    setSelectedEmail(null);
  };

  const handleDownloadAttachment = async (attachment, index) => {
    try {
      const folder = activeTab === 'sent' ? 'Sent' : 'INBOX';
      const response = await api.get('/email-accounts/download-attachment', {
        params: {
          accountId: selectedAccount._id,
          uid: selectedEmail.uid,
          folder: folder,
          index: index
        },
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', attachment.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download attachment');
    }
  };

  const handleCompose = () => {
    setComposeOpen(true);
    setComposeMinimized(false);
    setComposeTo('');
    setComposeCc('');
    setComposeBcc('');
    setShowCc(false);
    setShowBcc(false);
    setComposeSubject('');
    setComposeBody('');
    setComposeAttachments([]);
    // Reset editor content
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
        editorRef.current.dataset.initialized = 'true';
      }
    }, 0);
  };

  // Rich text formatting command
  const execFormat = (command, value = null) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleSendEmail = async () => {
    // Get body from contentEditable or fallback to state
    const body = editorRef.current ? editorRef.current.innerHTML : composeBody;

    if (!selectedAccount || !composeTo || !composeSubject) {
      toast.error('Please fill in recipient and subject');
      return;
    }

    setSendingEmail(true);
    try {
      const formData = new FormData();
      formData.append('accountId', selectedAccount._id);
      formData.append('to', composeTo);
      formData.append('subject', composeSubject);
      formData.append('body', body);
      if (composeCc.trim()) formData.append('cc', composeCc.trim());
      if (composeBcc.trim()) formData.append('bcc', composeBcc.trim());

      // Append attachments
      composeAttachments.forEach(file => {
        formData.append('attachments', file);
      });

      const sendRes = await api.post('/email-accounts/send-email', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000 // 2 min for large attachments
      });

      const remaining = sendRes.data?.remainingCredits;
      toast.success(remaining != null ? `Email sent! (${remaining} credits left)` : 'Email sent successfully!');
      setComposeOpen(false);
      setComposeTo('');
      setComposeCc('');
      setComposeBcc('');
      setShowCc(false);
      setShowBcc(false);
      setComposeSubject('');
      setComposeBody('');
      setComposeAttachments([]);
    } catch (error) {
      toast.error('Failed to send email: ' + (error.response?.data?.message || error.message));
    } finally {
      setSendingEmail(false);
    }
  };

  const handleAttachFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setComposeAttachments(prev => [...prev, ...files]);
    }
    // Reset input so same file can be selected again
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setComposeAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Reply to email
  const handleReply = () => {
    if (!selectedEmail) return;

    const replyTo = selectedEmail.from?.address || '';
    const originalSubject = selectedEmail.subject || '';
    const replySubject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

    // Format quoted original message
    const originalDate = new Date(selectedEmail.date).toLocaleString();
    const originalFrom = selectedEmail.from?.name || selectedEmail.from?.address || '';
    const originalBody = selectedEmail.text || '';
    const quotedBody = `\n\n--- Original Message ---\nFrom: ${originalFrom}\nDate: ${originalDate}\n\n${originalBody}`;

    setComposeTo(replyTo);
    setComposeSubject(replySubject);
    setComposeBody(quotedBody);
    setComposeAttachments([]);
    setComposeOpen(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = quotedBody.replace(/\n/g, '<br>');
        editorRef.current.dataset.initialized = 'true';
      }
    }, 0);
  };

  // Forward email
  const handleForward = () => {
    if (!selectedEmail) return;

    const originalSubject = selectedEmail.subject || '';
    const fwdSubject = originalSubject.startsWith('Fwd:') ? originalSubject : `Fwd: ${originalSubject}`;

    // Format forwarded message
    const originalDate = new Date(selectedEmail.date).toLocaleString();
    const originalFrom = selectedEmail.from?.name || selectedEmail.from?.address || '';
    const originalTo = selectedEmail.to?.[0]?.address || '';
    const originalBody = selectedEmail.text || '';
    const forwardBody = `\n\n--- Forwarded Message ---\nFrom: ${originalFrom}\nTo: ${originalTo}\nDate: ${originalDate}\nSubject: ${originalSubject}\n\n${originalBody}`;

    setComposeTo('');
    setComposeSubject(fwdSubject);
    setComposeBody(forwardBody);
    setComposeAttachments([]);
    setComposeOpen(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.innerHTML = forwardBody.replace(/\n/g, '<br>');
        editorRef.current.dataset.initialized = 'true';
      }
    }, 0);
  };

  const handleAvatarUpload = async (file) => {
    try {
      setAvatarUploadState({ uploading: true, error: null, success: null });
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const { imageUrl, user } = response.data || {};
      if (user) {
        setCurrentUser(user);
      } else if (imageUrl) {
        setCurrentUser(prev => (prev ? { ...prev, emailAvatar: imageUrl } : prev));
      }

      setAvatarUploadState({ uploading: false, error: null, success: 'Avatar updated successfully!' });
    } catch (uploadError) {
      const message = uploadError.response?.data?.message || 'Failed to upload avatar';
      setAvatarUploadState({ uploading: false, error: message, success: null });
    }
  };

  useEffect(() => {
    if (avatarUploadState.success || avatarUploadState.error) {
      const timer = setTimeout(() => {
        setAvatarUploadState(prev => ({ ...prev, error: null, success: null }));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [avatarUploadState.success, avatarUploadState.error]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'settings') {
      setSelectedEmail(null);
    }
    // Clear selections when switching tabs
    setSelectedEmails(new Set());
    setSelectAll(false);
  };

  // Checkbox selection handlers
  const handleCheckboxClick = (emailUid) => {
    const newSelected = new Set(selectedEmails);
    if (newSelected.has(emailUid)) {
      newSelected.delete(emailUid);
    } else {
      newSelected.add(emailUid);
    }
    setSelectedEmails(newSelected);
    setSelectAll(newSelected.size === emails.length && emails.length > 0);
  };

  const handleSelectAllChange = (checked) => {
    if (checked) {
      setSelectedEmails(new Set(emails.map(e => e.uid)));
      setSelectAll(true);
    } else {
      setSelectedEmails(new Set());
      setSelectAll(false);
    }
  };

  const handleSelectOption = (option) => {
    if (option === 'all') {
      setSelectedEmails(new Set(emails.map(e => e.uid)));
      setSelectAll(true);
    } else if (option === 'none') {
      setSelectedEmails(new Set());
      setSelectAll(false);
    } else if (option === 'read') {
      setSelectedEmails(new Set(emails.filter(e => e.seen).map(e => e.uid)));
      setSelectAll(false);
    } else if (option === 'unread') {
      setSelectedEmails(new Set(emails.filter(e => !e.seen).map(e => e.uid)));
      setSelectAll(false);
    } else if (option === 'starred') {
      setSelectedEmails(new Set(emails.filter(e => starredEmails.has(e.uid)).map(e => e.uid)));
      setSelectAll(false);
    }
  };

  const handleStarToggle = (emailUid) => {
    const newStarred = new Set(starredEmails);
    if (newStarred.has(emailUid)) {
      newStarred.delete(emailUid);
    } else {
      newStarred.add(emailUid);
    }
    setStarredEmails(newStarred);
  };

  // Bulk action handlers
  const handleBulkDelete = async () => {
    if (selectedEmails.size === 0) {
      toast.error('No emails selected');
      return;
    }

    if (!window.confirm(`Delete ${selectedEmails.size} selected email(s)?`)) {
      return;
    }

    try {
      // Delete emails one by one
      const deletePromises = Array.from(selectedEmails).map(uid =>
        api.delete(`/email-accounts/hosted/${selectedAccount._id}/emails/${uid}`)
      );

      await Promise.all(deletePromises);

      toast.success(`${selectedEmails.size} email(s) deleted successfully`);
      setSelectedEmails(new Set());
      setSelectAll(false);
      await fetchEmails();
    } catch (error) {
      toast.error('Failed to delete emails: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleBulkArchive = async () => {
    if (selectedEmails.size === 0) {
      toast.error('No emails selected');
      return;
    }
    toast('Archive functionality coming soon', { icon: '📦' });
  };

  const getEmailPreview = (email) => {
    // Use preview from backend if available
    if (email.preview) {
      // Remove [html content] and [plain content] tags from preview
      let cleanPreview = email.preview.replace(/\s*-?\s*\[(html|plain)\s+content\]/gi, '').trim();

      // Remove empty parentheses and brackets patterns like "( )", "- ( )", etc.
      cleanPreview = cleanPreview.replace(/\s*-?\s*\(\s*\)\s*/g, '').trim();
      cleanPreview = cleanPreview.replace(/^\s*-\s+/, '').trim(); // Remove leading dash

      // Only remove standalone URLs (tracking links that are the only content)
      const urlPattern = /^https?:\/\/[^\s]+$/;
      if (urlPattern.test(cleanPreview)) {
        // This is just a URL, try to get text from body
        const body = email.text || email.html || '';
        if (body) {
          let text = body.replace(/<[^>]*>/g, '').trim();
          text = text.replace(/\s*-?\s*\(\s*\)\s*/g, '').replace(/^\s*-\s+/, '').trim();
          // Remove standalone URLs from body text too
          text = text.replace(/^https?:\/\/\S+\s*/g, '').trim();
          if (text && text.length >= 3) {
            return text.substring(0, 150);
          }
        }
        return '';
      }

      // If after cleaning we have meaningful content, return it
      if (cleanPreview && cleanPreview.length >= 3 && !/^[\s\-()]+$/.test(cleanPreview)) {
        return cleanPreview.substring(0, 150);
      }
    }

    // Fallback to text/html if preview not available or empty
    const body = email.text || email.html || '';
    if (body) {
      let text = body.replace(/<[^>]*>/g, '').trim();
      text = text.replace(/\s*-?\s*\(\s*\)\s*/g, '').replace(/^\s*-\s+/, '').trim();
      // Remove leading URLs
      text = text.replace(/^https?:\/\/\S+\s*/g, '').trim();
      if (text && text.length >= 3) {
        return text.substring(0, 150);
      }
    }

    return '';
  };

  const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    const today = new Date();

    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  };

  const handleCreateEmailSuccess = (data) => {
    // Refresh the accounts list
    fetchHostedAccounts();
    // Show success message
    toast.success(`Email account ${data.email} created successfully!`);
  };

  return (
    <div className="mail-mainstream-inbox mail-gmail-style">
      {/* Header */}
      <div className="mail-gmail-header">
        <div className="mail-gmail-header-left">
          {/* Search - shadcn/ui */}
          <div className="relative flex items-center w-full max-w-[720px]">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search mail"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 bg-secondary border-transparent hover:bg-accent focus-visible:bg-background focus-visible:border-border focus-visible:ring-1 focus-visible:ring-ring rounded-lg transition-colors"
            />
          </div>
        </div>

        <div className="mail-gmail-header-right">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateEmailModalOpen(true)}
            className="gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Create Email
          </Button>

          {/* Account Dropdown - shadcn/ui */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                {selectedAccount?.email?.charAt(0).toUpperCase() || 'U'}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[300px] p-0 rounded-xl shadow-xl border border-gray-200">
              {/* User Header */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground text-base font-semibold shrink-0">
                    {user?.fullName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">Hello, {user?.fullName || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email || ''}</p>
                  </div>
                </div>
                <button
                  onClick={() => window.open(getMainAppUrl(), '_blank')}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors cursor-pointer bg-transparent border-none p-0"
                >
                  <ExternalLink className="h-3 w-3" />
                  Back to Dashboard
                </button>
              </div>

              {/* Email Accounts */}
              {accounts.length > 0 && (
                <>
                  <DropdownMenuSeparator className="my-0" />
                  <div className="px-1.5 py-1.5">
                    <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium px-2 py-1.5">Email Accounts</DropdownMenuLabel>
                    {accounts.map(account => (
                      <DropdownMenuItem
                        key={account._id}
                        className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg cursor-pointer mb-0.5 ${selectedAccount?._id === account._id ? 'bg-accent' : ''}`}
                        onClick={() => {
                          setSelectedAccount(account);
                          setSelectedEmail(null);
                          setSelectedEmails(new Set());
                        }}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-foreground text-xs font-semibold shrink-0 border border-border">
                          {account.email?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-foreground truncate">{account.displayName || account.email?.split('@')[0]}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{account.email}</p>
                        </div>
                        {selectedAccount?._id === account._id && (
                          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                </>
              )}

              <DropdownMenuSeparator className="my-0" />

              {/* Menu Items */}
              <div className="px-1.5 py-1.5">
                <DropdownMenuItem
                  className="gap-2.5 cursor-pointer rounded-lg px-2.5 py-2.5"
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[13px]">Settings & Privacy</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2.5 cursor-pointer rounded-lg px-2.5 py-2.5"
                  onClick={() => setLoginMailModalOpen(true)}
                >
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <span className="text-[13px]">Add Existing Mail</span>
                </DropdownMenuItem>
              </div>

              <DropdownMenuSeparator className="my-0" />

              {/* Sign Out */}
              <div className="px-1.5 py-1.5">
                <DropdownMenuItem
                  className="gap-2.5 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 rounded-lg px-2.5 py-2.5"
                  onClick={() => onLogout && onLogout()}
                >
                  <LogOut className="h-4 w-4" />
                  <span className="text-[13px]">Sign Out</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Gmail-style Tabs with Toolbar */}
      <div className="mail-gmail-tabs">
        {activeTab !== 'settings' && (
          <>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Checkbox
                checked={selectAll}
                indeterminate={selectedEmails.size > 0 && selectedEmails.size < emails.length}
                onChange={handleSelectAllChange}
              />
              <button
                onClick={() => setSelectDropdownOpen(!selectDropdownOpen)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#5f6368'
                }}
              >
                <MdArrowDropDown size={20} />
              </button>
              {selectDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: 'white',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    minWidth: '120px',
                    marginTop: '4px'
                  }}
                >
                  <div
                    onClick={() => { handleSelectOption('all'); setSelectDropdownOpen(false); }}
                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    All
                  </div>
                  <div
                    onClick={() => { handleSelectOption('none'); setSelectDropdownOpen(false); }}
                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    None
                  </div>
                  <div
                    onClick={() => { handleSelectOption('read'); setSelectDropdownOpen(false); }}
                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    Read
                  </div>
                  <div
                    onClick={() => { handleSelectOption('unread'); setSelectDropdownOpen(false); }}
                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    Unread
                  </div>
                  <div
                    onClick={() => { handleSelectOption('starred'); setSelectDropdownOpen(false); }}
                    style={{ padding: '8px 16px', cursor: 'pointer', fontSize: '14px' }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                  >
                    Starred
                  </div>
                </div>
              )}
            </div>
            {selectedEmails.size > 0 && (
              <div style={{
                fontSize: '13px',
                color: '#5f6368',
                marginLeft: '8px',
                marginRight: '8px'
              }}>
                {selectedEmails.size} selected
              </div>
            )}
          </>
        )}
        <Tab
          icon={MdInbox}
          label="Primary"
          active={activeTab === 'primary'}
          onClick={() => handleTabChange('primary')}
          count={activeTab === 'primary' ? totalEmails : 0}
        />
        <Tab
          label="Sent"
          active={activeTab === 'sent'}
          onClick={() => handleTabChange('sent')}
        />
        {activeTab !== 'settings' && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <IconButton icon={MdRefresh} onClick={fetchEmails} title="Refresh" />
            {selectedEmails.size > 0 && (
              <>
                <div className="mail-toolbar-divider"></div>
                <IconButton icon={MdArchive} onClick={handleBulkArchive} title="Archive" />
                <IconButton icon={MdDelete} onClick={handleBulkDelete} title="Delete" />
              </>
            )}
            {totalEmails > 0 && (
              <>
                <div className="mail-toolbar-divider"></div>
                <span className="email-count">
                  {((currentPage - 1) * emailsPerPage) + 1}-{Math.min(currentPage * emailsPerPage, totalEmails)} of {totalEmails}
                </span>
                <IconButton icon={MdMoreVert} title="More options" />
                <IconButton
                  icon={MdChevronLeft}
                  onClick={() => setCurrentPage(p => p - 1)}
                  disabled={currentPage === 1}
                  title="Newer"
                />
                <IconButton
                  icon={MdChevronRight}
                  onClick={() => setCurrentPage(p => p + 1)}
                  disabled={currentPage * emailsPerPage >= totalEmails}
                  title="Older"
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Main Content - Gmail Full Width Style */}
      <div className="mail-inbox-content-fullwidth">
        {/* Show Email Detail in Full Width when email is selected */}
        {selectedEmail && activeTab !== 'settings' ? (
          <div className="mail-email-detail-fullwidth">
            <div className="mail-detail-header-gmail">
              <IconButton icon={MdChevronLeft} onClick={handleBackToList} title="Back to list" />
              <h3>{selectedEmail.subject || '(No Subject)'}</h3>
              <div className="mail-detail-actions-gmail">
                <IconButton icon={MdReply} onClick={handleReply} title="Reply" />
                <IconButton icon={MdForward} onClick={handleForward} title="Forward" />
                <IconButton icon={MdArchive} title="Archive" />
                <IconButton icon={MdDelete} title="Delete" />
                <IconButton icon={MdMoreVert} title="More" />
              </div>
            </div>
            <div className="mail-detail-meta-gmail">
              <div className="mail-sender-info-gmail">
                <div className="mail-email-avatar-gmail large">
                  {selectedEmail.from?.avatar ? (
                    <img
                      src={selectedEmail.from.avatar}
                      alt={selectedEmail.from?.name || selectedEmail.from?.address}
                      style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.textContent = getInitials(selectedEmail.from?.name || selectedEmail.from?.address);
                      }}
                    />
                  ) : (
                    getInitials(selectedEmail.from?.name || selectedEmail.from?.address)
                  )}
                </div>
                <div>
                  <div className="mail-sender-name-gmail">
                    {selectedEmail.from?.name || selectedEmail.from?.address?.split('@')[0]}
                    <span className="mail-sender-email-gmail"> - {selectedEmail.from?.address}</span>
                  </div>
                  <div className="mail-recipient-info-gmail">to {selectedEmail.to?.[0]?.address}</div>
                </div>
              </div>
              <div className="mail-email-date-gmail">{new Date(selectedEmail.date).toLocaleString()}</div>
            </div>

            <div className="mail-detail-body-gmail">
              {selectedEmail.html ? (
                <iframe
                  srcDoc={`<head><base target="_blank"><style>html,body{overflow:hidden;scrollbar-width:none;-ms-overflow-style:none;}::-webkit-scrollbar{display:none;}</style></head>${selectedEmail.html}`}
                  title="Email Content"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-popups-to-escape-sandbox"
                  style={{ width: '100%', border: 'none', display: 'block', minHeight: '500px', overflow: 'hidden' }}
                  onLoad={(e) => {
                    try {
                      const iframe = e.target;
                      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                      const contentHeight = Math.max(iframeDoc.documentElement.scrollHeight, 500);
                      iframe.style.height = contentHeight + 'px';
                    } catch (err) {
                      e.target.style.height = '500px';
                    }
                  }}
                />
              ) : (
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'Roboto, Arial, sans-serif', color: '#202124', padding: '0' }}>
                  {selectedEmail.text}
                </pre>
              )}
            </div>

            {/* Attachments Section */}
            {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
              <div className="mail-attachments-section" style={{ padding: '16px 24px', borderTop: '1px solid #e0e0e0' }}>
                <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', color: '#5f6368' }}>
                  {selectedEmail.attachments.length} Attachment{selectedEmail.attachments.length > 1 ? 's' : ''}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                  {selectedEmail.attachments.map((attachment, index) => (
                    <div
                      key={index}
                      className="attachment-card"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '12px',
                        border: '1px solid #dadce0',
                        borderRadius: '8px',
                        backgroundColor: '#f8f9fa',
                        minWidth: '250px',
                        gap: '12px',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e8f0fe';
                        e.currentTarget.style.borderColor = '#1a73e8';
                        e.currentTarget.querySelector('.download-btn').style.opacity = '1';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8f9fa';
                        e.currentTarget.style.borderColor = '#dadce0';
                        e.currentTarget.querySelector('.download-btn').style.opacity = '0';
                      }}
                      onClick={() => handleDownloadAttachment(attachment, index)}
                    >
                      <MdAttachFile style={{ fontSize: '24px', color: '#5f6368' }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#202124',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {attachment.filename}
                        </div>
                        <div style={{ fontSize: '12px', color: '#5f6368' }}>
                          {attachment.contentType} • {(attachment.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                      <div
                        className="download-btn"
                        style={{
                          opacity: '0',
                          transition: 'opacity 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          backgroundColor: '#1a73e8',
                          color: 'white'
                        }}
                      >
                        <MdDownload style={{ fontSize: '20px' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Email List in Full Width */
          <div className="mail-email-list-fullwidth">
            {activeTab === 'settings' ? (
              <MailSettings
                account={selectedAccount}
                accounts={accounts}
                user={currentUser}
                onAvatarUpload={handleAvatarUpload}
                uploading={avatarUploadState.uploading}
                uploadError={avatarUploadState.error}
                uploadSuccess={avatarUploadState.success}
              />
            ) : loading && emails.length === 0 ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Loading emails...</p>
              </div>
            ) : error ? (
              <div className="error-state">
                <p>{error}</p>
                <button onClick={fetchEmails} className="retry-btn">Retry</button>
              </div>
            ) : !selectedAccount ? (
              <div className="empty-state">
                {accountsLoading ? (
                  // Show loading state while fetching accounts - prevents form flash
                  <div className="loading-state">
                    <div className="spinner"></div>
                    <p>Loading accounts...</p>
                  </div>
                ) : accountsError ? (
                  // Show error with retry button when account fetch failed
                  <div className="error-state">
                    <p>{accountsError}</p>
                    <button onClick={fetchHostedAccounts} className="retry-btn">Retry</button>
                  </div>
                ) : accounts.length === 0 ? (
                  // Check if user is a workspace member (not owner) who needs to connect
                  currentUser?.companyId && currentUser?.roleInCompany !== 'Owner' ? (
                    <div className="empty-state-connect">
                      <EmailConnectionForm
                        onSuccess={(account) => {
                          // Refresh accounts list
                          fetchHostedAccounts();
                          // Auto-select the newly connected account
                          setSelectedAccount(account);
                        }}
                        onCancel={null}
                      />
                    </div>
                  ) : (
                    <div className="empty-state-create">
                      <h3>No Email Accounts Found</h3>
                      <p>You don't have any email accounts yet on your verified domain.</p>
                      <p>Create an email account to start sending and receiving emails.</p>
                      <button
                        onClick={() => onNavigateToDomains && onNavigateToDomains()}
                        className="btn-create-email"
                        style={{
                          marginTop: '15px',
                          padding: '10px 20px',
                          backgroundColor: '#1a73e8',
                          color: 'white',
                          border: 'none',
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Go to Domain Management
                      </button>
                    </div>
                  )
                ) : (
                  <p>No email account selected</p>
                )}
              </div>
            ) : emails.length === 0 ? (
              <div className="empty-state">
                <p>No emails found in {activeTab === 'sent' ? 'Sent' : 'Inbox'}</p>
                <small>Try refreshing or selecting a different account</small>
              </div>
            ) : (
              emails.map((email, index) => {
                const preview = getEmailPreview(email);
                return (
                  <div
                    key={email.uid || index}
                    className={`gmail-email-item ${selectedEmail === email ? 'selected' : ''} ${email.seen ? '' : 'unread'} ${selectedEmails.has(email.uid) ? 'checked' : ''}`}
                    onClick={() => handleEmailClick(email)}
                  >
                    <div className="email-checkbox">
                      <Checkbox
                        checked={selectedEmails.has(email.uid)}
                        onChange={() => handleCheckboxClick(email.uid)}
                      />
                    </div>

                    <div className="email-star">
                      <IconButton
                        icon={starredEmails.has(email.uid) ? MdStar : MdStarBorder}
                        onClick={() => handleStarToggle(email.uid)}
                        className={starredEmails.has(email.uid) ? 'starred' : ''}
                      />
                    </div>

                    <div className="mail-email-sender-gmail">
                      {activeTab === 'sent'
                        ? (typeof email.to?.[0] === 'string' ? email.to[0] : (email.to?.[0]?.name || email.to?.[0]?.address || 'Unknown'))
                        : (email.from?.name || email.from?.address?.split('@')[0] || 'Unknown')}
                    </div>

                    <div className="mail-email-content-gmail">
                      <span className="mail-email-subject-gmail">
                        {(email.subject || '(No Subject)').replace(/\s*-\s*\[(html|plain)\s+content\]/gi, '')}
                      </span>
                      <span className="mail-email-preview-gmail">
                        {preview ? ' - ' + preview : ''}
                      </span>
                    </div>

                    <div className="mail-email-timestamp-gmail">
                      {formatDate(email.date)}
                      {email.hasAttachments && <MdAttachFile className="attachment-icon-gmail" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Gmail-style Compose Button - hide when compose/modals/settings open */}
      {!composeOpen && !createEmailModalOpen && !loginMailModalOpen && activeTab !== 'settings' && (
        <button className="mail-compose-btn-gmail" onClick={handleCompose}>
          <MdEdit size={24} />
          Compose
        </button>
      )}

      {/* Compose Popup - Gmail style - hide when modals/settings open */}
      {composeOpen && !createEmailModalOpen && !loginMailModalOpen && activeTab !== 'settings' && (
        <div
          className="fixed z-50 flex flex-col bg-background rounded-t-xl overflow-hidden"
          style={{
            bottom: 0,
            right: composeExpanded ? '10%' : '80px',
            width: composeMinimized ? '280px' : composeExpanded ? '80%' : '580px',
            height: composeMinimized ? '40px' : composeExpanded ? '85vh' : '560px',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.28), 0 0 0 1px rgba(0,0,0,0.08)',
            maxWidth: composeExpanded ? '1100px' : '580px'
          }}
        >
          {/* Dark Header */}
          <div
            className="flex items-center justify-between px-3 shrink-0 select-none"
            style={{ backgroundColor: '#404040', height: '40px', borderRadius: '12px 12px 0 0' }}
            onClick={() => composeMinimized && setComposeMinimized(false)}
          >
            <span className="text-[13px] font-medium text-white truncate cursor-default pl-1">New Message</span>
            <div className="flex items-center">
              <button
                onClick={(e) => { e.stopPropagation(); setComposeMinimized(!composeMinimized); }}
                className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-white/15 transition-colors cursor-pointer text-gray-300 hover:text-white"
              >
                <MdMinimize size={18} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setComposeExpanded(!composeExpanded); }}
                className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-white/15 transition-colors cursor-pointer text-gray-300 hover:text-white"
              >
                <MdOpenInFull size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setComposeOpen(false); setComposeExpanded(false); }}
                className="w-7 h-7 flex items-center justify-center rounded-sm hover:bg-white/15 transition-colors cursor-pointer text-gray-300 hover:text-white"
              >
                <MdClose size={18} />
              </button>
            </div>
          </div>

          {!composeMinimized && (
            <div className="flex flex-col flex-1 overflow-hidden bg-white">
              {/* To Field */}
              <div className="flex items-center border-b border-gray-200 px-3 min-h-[38px]">
                <span className="text-[13px] text-gray-500 w-[52px] shrink-0">To</span>
                <input
                  type="text"
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  className="flex-1 py-2 text-[13px] bg-transparent border-none outline-none text-gray-800"
                />
                <div className="flex items-center gap-0.5 text-[13px] text-gray-500 shrink-0">
                  {!showCc && (
                    <button onClick={() => setShowCc(true)} className="px-1 py-0.5 rounded hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer">Cc</button>
                  )}
                  {!showBcc && (
                    <button onClick={() => setShowBcc(true)} className="px-1 py-0.5 rounded hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer">Bcc</button>
                  )}
                </div>
              </div>

              {/* Cc Field */}
              {showCc && (
                <div className="flex items-center border-b border-gray-200 px-3 min-h-[38px]">
                  <span className="text-[13px] text-gray-500 w-[52px] shrink-0">Cc</span>
                  <input
                    type="text"
                    value={composeCc}
                    onChange={(e) => setComposeCc(e.target.value)}
                    className="flex-1 py-2 text-[13px] bg-transparent border-none outline-none text-gray-800"
                    autoFocus
                  />
                  <button onClick={() => { setShowCc(false); setComposeCc(''); }} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                    <MdClose size={16} />
                  </button>
                </div>
              )}

              {/* Bcc Field */}
              {showBcc && (
                <div className="flex items-center border-b border-gray-200 px-3 min-h-[38px]">
                  <span className="text-[13px] text-gray-500 w-[52px] shrink-0">Bcc</span>
                  <input
                    type="text"
                    value={composeBcc}
                    onChange={(e) => setComposeBcc(e.target.value)}
                    className="flex-1 py-2 text-[13px] bg-transparent border-none outline-none text-gray-800"
                    autoFocus
                  />
                  <button onClick={() => { setShowBcc(false); setComposeBcc(''); }} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                    <MdClose size={16} />
                  </button>
                </div>
              )}

              {/* Subject Field */}
              <div className="flex items-center border-b border-gray-200 px-3 min-h-[38px]">
                <span className="text-[13px] text-gray-500 w-[52px] shrink-0">Subject</span>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  className="flex-1 py-2 text-[13px] bg-transparent border-none outline-none text-gray-800"
                />
              </div>

              {/* Rich Text Body */}
              <div className="flex-1 overflow-y-auto">
                <div
                  ref={(el) => {
                    editorRef.current = el;
                    // Set initial content only once when ref is first attached
                    if (el && !el.dataset.initialized) {
                      el.innerHTML = composeBody || '';
                      el.dataset.initialized = 'true';
                    }
                  }}
                  contentEditable
                  suppressContentEditableWarning
                  className="w-full h-full px-4 py-3 text-[13px] text-gray-800 outline-none leading-relaxed"
                  style={{ minHeight: '200px', fontFamily: 'Arial, sans-serif' }}
                  data-placeholder="Compose your message..."
                />
              </div>

              {/* Attachments */}
              {composeAttachments.length > 0 && (
                <div className="px-3 py-2 border-t border-gray-200 flex flex-wrap gap-2 shrink-0 bg-gray-50">
                  {composeAttachments.map((file, index) => (
                    <div key={index} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-gray-200 text-[12px] shadow-sm">
                      <MdAttachFile className="text-gray-400" size={14} />
                      <span className="truncate max-w-[120px] text-gray-700">{file.name}</span>
                      <span className="text-gray-400">{formatFileSize(file.size)}</span>
                      <button onClick={() => removeAttachment(index)} className="text-gray-400 hover:text-gray-600 cursor-pointer ml-0.5">
                        <MdClose size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Formatting Toolbar (collapsible) */}
              {showFormattingBar && (
                <div className="flex items-center gap-0.5 px-3 py-1.5 border-t border-gray-200 bg-gray-50 shrink-0 flex-wrap">
                  <button onClick={() => execFormat('undo')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Undo"><MdUndo size={18} /></button>
                  <button onClick={() => execFormat('redo')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Redo"><MdRedo size={18} /></button>

                  <div className="w-px h-5 bg-gray-300 mx-1" />

                  <select
                    onChange={(e) => { execFormat('fontName', e.target.value); }}
                    defaultValue="Sans Serif"
                    className="h-7 text-[12px] text-gray-600 bg-transparent border border-gray-300 rounded px-1.5 cursor-pointer outline-none hover:bg-gray-100"
                  >
                    <option value="Arial, sans-serif">Sans Serif</option>
                    <option value="Georgia, serif">Serif</option>
                    <option value="monospace">Fixed Width</option>
                    <option value="Comic Sans MS, cursive">Comic Sans</option>
                    <option value="Trebuchet MS, sans-serif">Trebuchet</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                  </select>

                  <select
                    onChange={(e) => { execFormat('fontSize', e.target.value); }}
                    defaultValue="3"
                    className="h-7 text-[12px] text-gray-600 bg-transparent border border-gray-300 rounded px-1.5 cursor-pointer outline-none hover:bg-gray-100 w-12"
                  >
                    <option value="1">Small</option>
                    <option value="2">Normal</option>
                    <option value="3">Medium</option>
                    <option value="4">Large</option>
                    <option value="5">Huge</option>
                  </select>

                  <div className="w-px h-5 bg-gray-300 mx-1" />

                  <button onClick={() => execFormat('bold')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer font-bold" title="Bold"><MdFormatBold size={18} /></button>
                  <button onClick={() => execFormat('italic')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Italic"><MdFormatItalic size={18} /></button>
                  <button onClick={() => execFormat('underline')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Underline"><MdFormatUnderlined size={18} /></button>
                  <input
                    type="color"
                    defaultValue="#000000"
                    onChange={(e) => execFormat('foreColor', e.target.value)}
                    className="w-7 h-7 rounded cursor-pointer border-none p-0.5"
                    title="Text color"
                  />

                  <div className="w-px h-5 bg-gray-300 mx-1" />

                  <button onClick={() => execFormat('justifyLeft')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Align left"><MdFormatAlignLeft size={18} /></button>
                  <button onClick={() => execFormat('justifyCenter')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Align center"><MdFormatAlignCenter size={18} /></button>
                  <button onClick={() => execFormat('justifyRight')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Align right"><MdFormatAlignRight size={18} /></button>

                  <div className="w-px h-5 bg-gray-300 mx-1" />

                  <button onClick={() => execFormat('insertOrderedList')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Numbered list"><MdFormatListNumbered size={18} /></button>
                  <button onClick={() => execFormat('insertUnorderedList')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Bulleted list"><MdFormatListBulleted size={18} /></button>
                  <button onClick={() => execFormat('indent')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Indent more"><MdFormatIndentIncrease size={18} /></button>
                  <button onClick={() => execFormat('outdent')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Indent less"><MdFormatIndentDecrease size={18} /></button>

                  <div className="w-px h-5 bg-gray-300 mx-1" />

                  <button onClick={() => { const blockquote = document.queryCommandValue('formatBlock'); execFormat('formatBlock', blockquote === 'blockquote' ? 'div' : 'blockquote'); }} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Quote"><MdFormatQuote size={18} /></button>
                  <button onClick={() => execFormat('strikeThrough')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Strikethrough"><MdStrikethroughS size={18} /></button>
                  <button onClick={() => execFormat('removeFormat')} className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-200 text-gray-600 cursor-pointer" title="Clear formatting"><MdFormatClear size={18} /></button>
                </div>
              )}

              {/* Bottom Toolbar */}
              <div className="flex items-center px-3 py-2 shrink-0 border-t border-gray-100 bg-white">
                {/* Send Button */}
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="flex items-center gap-2 h-9 px-6 rounded-full text-white text-[13px] font-medium transition-all cursor-pointer disabled:opacity-60 shadow-sm hover:shadow-md"
                  style={{ backgroundColor: '#0b57d0' }}
                  onMouseEnter={(e) => !sendingEmail && (e.currentTarget.style.backgroundColor = '#0842a0')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0b57d0')}
                >
                  <MdSend size={16} />
                  {sendingEmail ? 'Sending...' : 'Send'}
                </button>

                {/* Action Icons */}
                <div className="flex items-center ml-2 gap-0.5">
                  <button
                    onClick={() => setShowFormattingBar(!showFormattingBar)}
                    className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer ${showFormattingBar ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                    title="Formatting options"
                  >
                    <span className="text-[15px] font-semibold" style={{ fontFamily: 'serif' }}>A</span>
                  </button>
                  <button onClick={handleAttachFiles} className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer" title="Attach files">
                    <MdAttachFile size={20} />
                  </button>
                  {/* Insert Link Popover */}
                  <div className="relative" ref={linkPopoverRef}>
                    <button
                      onClick={() => {
                        saveSelection();
                        setShowLinkPopover(!showLinkPopover);
                        setLinkUrl('');
                      }}
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer ${showLinkPopover ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                      title="Insert link"
                    >
                      <MdInsertLink size={20} />
                    </button>
                    {showLinkPopover && (
                      <div
                        className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50"
                        style={{ width: '360px' }}
                      >
                        <div className="text-[11px] text-gray-400 font-medium mb-2">Insert Link</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center border border-gray-300 rounded-lg px-3 py-2 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all bg-gray-50">
                            <MdInsertLink size={18} className="text-gray-400 shrink-0 mr-2" />
                            <input
                              type="text"
                              value={linkUrl}
                              onChange={(e) => setLinkUrl(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') applyLink(); if (e.key === 'Escape') { setShowLinkPopover(false); setLinkUrl(''); } }}
                              placeholder="Type or paste a link"
                              className="flex-1 text-[13px] text-gray-800 bg-transparent border-none outline-none placeholder:text-gray-400"
                              autoFocus
                            />
                          </div>
                          <button
                            onClick={applyLink}
                            disabled={!linkUrl.trim()}
                            className={`h-9 px-4 rounded-lg text-[13px] font-medium transition-all cursor-pointer ${linkUrl.trim() ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                          >
                            Apply
                          </button>
                        </div>
                        <div className="text-[11px] text-gray-400 mt-2">Select text first, then insert a link to wrap it</div>
                      </div>
                    )}
                  </div>

                  {/* Emoji Picker */}
                  <div className="relative" ref={emojiPickerRef}>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer ${showEmojiPicker ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                      title="Insert emoji"
                    >
                      <MdInsertEmoticon size={20} />
                    </button>
                    {showEmojiPicker && (
                      <div
                        className="absolute bottom-10 left-0 bg-white rounded-xl shadow-2xl border border-gray-200 p-3 z-50"
                        style={{ width: '320px', maxHeight: '280px', overflowY: 'auto' }}
                      >
                        <div className="text-[11px] text-gray-400 font-medium mb-2 px-0.5">Emojis</div>
                        <div className="grid gap-0.5" style={{ gridTemplateColumns: 'repeat(10, 1fr)' }}>
                          {emojiList.map((emoji, i) => (
                            <button
                              key={i}
                              onClick={() => insertEmoji(emoji)}
                              className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 cursor-pointer text-[18px] transition-transform hover:scale-125"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Insert Image */}
                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                    title="Insert photo"
                  >
                    <MdInsertPhoto size={20} />
                  </button>
                  <input type="file" ref={imageInputRef} onChange={handleImageInsert} accept="image/*" style={{ display: 'none' }} />

                  {/* More Options */}
                  <div className="relative" ref={moreOptionsRef}>
                    <button
                      onClick={() => setShowMoreOptions(!showMoreOptions)}
                      className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors cursor-pointer ${showMoreOptions ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'}`}
                      title="More options"
                    >
                      <MdMoreHoriz size={20} />
                    </button>
                    {showMoreOptions && (
                      <div className="absolute bottom-10 right-0 bg-white rounded-lg shadow-2xl border border-gray-200 py-1 z-50 min-w-[200px]">
                        <button
                          onClick={() => { setComposeExpanded(!composeExpanded); setShowMoreOptions(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 cursor-pointer text-left"
                        >
                          <MdOpenInFull size={16} className="text-gray-500" />
                          {composeExpanded ? 'Default size' : 'Full screen'}
                        </button>
                        <button
                          onClick={() => {
                            if (editorRef.current) {
                              const sel = window.getSelection();
                              sel.selectAllChildren(editorRef.current);
                            }
                            setShowMoreOptions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 cursor-pointer text-left"
                        >
                          <MdEdit size={16} className="text-gray-500" />
                          Select all
                        </button>
                        <button
                          onClick={() => {
                            if (editorRef.current) editorRef.current.innerHTML = '';
                            setShowMoreOptions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 cursor-pointer text-left"
                        >
                          <MdFormatClear size={16} className="text-gray-500" />
                          Clear all formatting
                        </button>
                        <div className="border-t border-gray-200 my-1" />
                        <button
                          onClick={() => {
                            if (editorRef.current) {
                              const text = editorRef.current.innerText;
                              editorRef.current.innerHTML = text;
                            }
                            setShowMoreOptions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 cursor-pointer text-left"
                        >
                          <MdFormatClear size={16} className="text-gray-500" />
                          Plain text mode
                        </button>
                        <button
                          onClick={() => {
                            window.print();
                            setShowMoreOptions(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-[13px] text-gray-700 hover:bg-gray-100 cursor-pointer text-left"
                        >
                          <MdDownload size={16} className="text-gray-500" />
                          Print
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple style={{ display: 'none' }} />

                {/* Discard - right aligned */}
                <button
                  onClick={() => { setComposeOpen(false); setComposeExpanded(false); }}
                  className="ml-auto w-8 h-8 flex items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors cursor-pointer"
                  title="Discard draft"
                >
                  <MdDelete size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Email Account Modal */}
      <CreateEmailModal
        isOpen={createEmailModalOpen}
        onClose={() => setCreateEmailModalOpen(false)}
        onSuccess={handleCreateEmailSuccess}
      />

      {/* Login Mail Modal */}
      {loginMailModalOpen && (
        <div className="mln-modal-overlay" onClick={() => setLoginMailModalOpen(false)}>
          <div className="mln-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="mln-modal-close-btn" onClick={() => setLoginMailModalOpen(false)}>
              <MdClose />
            </button>
            <EmailConnectionForm
              onSuccess={(account) => {
                setLoginMailModalOpen(false);
                // Refresh accounts list
                fetchHostedAccounts();
                // Auto-select the newly connected account
                setSelectedAccount(account);
              }}
              onCancel={() => setLoginMailModalOpen(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}

export default MainstreamInbox;
