import { useEffect, useRef } from 'react';
import { useRole } from '../contexts/RoleContext';
import api from '../config/api';
import { showNotificationToast } from './CustomToast';

const POLL_INTERVAL = 120000; // 2 minutes
const SEEN_KEY = (userId, accountId) => `seen_mail_${userId}_${accountId}`;
const NOTIF_KEY = (userId) => `notifications_${userId}`;
const MAX_NOTIFICATIONS = 50;

function MailPoller() {
  const { currentUser } = useRole();
  const timerRef = useRef(null);
  const isPollingRef = useRef(false);

  const poll = async () => {
    if (!currentUser?.id || isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const { data: accountsRes } = await api.get('/email-accounts/connected');
      const accounts = accountsRes?.accounts || accountsRes?.emailAccounts || [];
      const hostedAccounts = accounts.filter(
        (a) => a.accountType === 'noxtm-hosted' && a.isActive !== false
      );

      for (const account of hostedAccounts) {
        try {
          const { data: inboxRes } = await api.get('/email-accounts/fetch-inbox', {
            params: { accountId: account._id || account.id, folder: 'INBOX', page: 1, limit: 20 },
          });

          const emails = inboxRes?.emails || [];
          if (!emails.length) continue;

          const seenKey = SEEN_KEY(currentUser.id, account._id || account.id);
          const seenSet = new Set(JSON.parse(localStorage.getItem(seenKey) || '[]'));
          const newEmails = emails.filter((e) => {
            const uid = e.uid || e.messageId || e.id;
            return uid && !seenSet.has(String(uid));
          });

          if (newEmails.length === 0) {
            // Still record current UIDs in case first run
            const allUids = emails.map((e) => String(e.uid || e.messageId || e.id)).filter(Boolean);
            localStorage.setItem(seenKey, JSON.stringify(allUids));
            continue;
          }

          // Update seen list
          const allUids = emails.map((e) => String(e.uid || e.messageId || e.id)).filter(Boolean);
          localStorage.setItem(seenKey, JSON.stringify(allUids));

          // Build notifications
          const notifKey = NOTIF_KEY(currentUser.id);
          const existingNotifs = JSON.parse(localStorage.getItem(notifKey) || '[]');

          const newNotifs = newEmails.map((email) => {
            const sender =
              email.from?.text ||
              email.from?.value?.[0]?.address ||
              email.from ||
              'Unknown sender';
            const subject = email.subject || '(no subject)';
            const account_label = account.emailAddress || account.email || 'your inbox';

            return {
              id: `mail_${Date.now()}_${Math.random().toString(36).slice(2)}`,
              type: 'new_email',
              title: `New email from ${sender}`,
              message: `${subject} — to ${account_label}`,
              timestamp: email.date ? new Date(email.date) : new Date(),
              read: false,
              icon: 'mail',
              meta: {
                accountId: account._id || account.id,
                subject,
                sender,
              },
            };
          });

          // Prepend new notifications (newest first), cap at MAX_NOTIFICATIONS
          const merged = [...newNotifs, ...existingNotifs].slice(0, MAX_NOTIFICATIONS);
          localStorage.setItem(notifKey, JSON.stringify(merged));

          // Notify NotificationCenter to reload
          window.dispatchEvent(new CustomEvent('notifications:update'));

          // Show toast for the first (most recent) new email
          if (newNotifs.length > 0) {
            const first = newNotifs[0];
            showNotificationToast({
              title: first.title,
              description: first.meta.subject,
              duration: 5000,
            });
          }
        } catch (accountErr) {
          // Silently ignore per-account errors (e.g. auth issues)
          console.warn('[MailPoller] account fetch error:', accountErr?.message);
        }
      }
    } catch (err) {
      console.warn('[MailPoller] poll error:', err?.message);
    } finally {
      isPollingRef.current = false;
    }
  };

  useEffect(() => {
    if (!currentUser?.id) return;

    // Initial poll after a short delay (let the app settle first)
    const initTimer = setTimeout(poll, 5000);

    // Recurring poll
    timerRef.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      clearTimeout(initTimer);
      clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  return null;
}

export default MailPoller;
