/**
 * Format timestamp to relative time (e.g., "Just Now", "5 min", "2h", "Yesterday")
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} Formatted relative time string
 */
export const formatTimestamp = (timestamp) => {
  if (!timestamp) return '';

  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now - date) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // Just now (less than 1 minute)
  if (diffInSeconds < 60) {
    return 'Just Now';
  }

  // Minutes (1-59 min)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} min`;
  }

  // Hours (1-23 hours)
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  // Yesterday
  if (diffInDays === 1) {
    return 'Yesterday';
  }

  // Days (2-6 days)
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }

  // Weeks (1-4 weeks)
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return `${weeks}w`;
  }

  // Format as date (for older messages)
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return `${month}/${day}`;
};

/**
 * Truncate text with ellipsis
 * @param {string} text - The text to truncate
 * @param {number} maxLength - Maximum length before truncation
 * @returns {string} Truncated text with ellipsis if needed
 */
export const truncateMessage = (text, maxLength = 30) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

/**
 * Get conversation display name
 * @param {Object} conversation - The conversation object
 * @param {Object} currentUser - The current logged-in user
 * @returns {string} Display name for the conversation
 */
export const getConversationName = (conversation, currentUser) => {
  if (!conversation) return 'Unknown';

  // For group chats
  if (!conversation.isDirectMessage) {
    return conversation.name || 'Group Chat';
  }

  // For direct messages, find the other participant
  const currentUserId = currentUser?.id || currentUser?._id;
  const otherParticipant = conversation.participants?.find(
    p => {
      const participantId = p._id || p.id || p;
      return participantId.toString() !== currentUserId?.toString();
    }
  );

  if (!otherParticipant) return 'Unknown User';

  // Return full name or email
  return otherParticipant.fullName || otherParticipant.username || otherParticipant.email || 'Unknown User';
};

/**
 * Get initials from a name
 * @param {string} name - The name to get initials from
 * @returns {string} Initials (max 2 characters)
 */
export const getInitials = (name) => {
  if (!name) return 'U';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

/**
 * Sort conversations by last message timestamp (newest first)
 * @param {Array} conversations - Array of conversation objects
 * @returns {Array} Sorted conversations
 */
export const sortConversationsByTime = (conversations) => {
  return [...conversations].sort((a, b) => {
    const timeA = a.lastMessage?.timestamp || a.updatedAt || a.createdAt;
    const timeB = b.lastMessage?.timestamp || b.updatedAt || b.createdAt;
    return new Date(timeB) - new Date(timeA);
  });
};
