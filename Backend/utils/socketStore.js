/**
 * Shared socket store — holds the io instance and user→socket mapping
 * so any route can emit to specific users.
 *
 * Each user can have multiple active socket connections (multiple tabs/devices).
 * We store a Set of socketIds per user and only remove the user when all
 * connections are gone.
 */
let _io = null;
const onlineUsers = new Map(); // userId (string) → Set<socketId>

module.exports = {
  setIo(io) { _io = io; },
  getIo() { return _io; },

  setUserOnline(userId, socketId) {
    const key = userId.toString();
    if (!onlineUsers.has(key)) {
      onlineUsers.set(key, new Set());
    }
    onlineUsers.get(key).add(socketId);
  },

  setUserOffline(userId, socketId) {
    const key = userId.toString();
    if (!onlineUsers.has(key)) return;

    if (socketId) {
      // Remove only this specific socket
      onlineUsers.get(key).delete(socketId);
      if (onlineUsers.get(key).size === 0) {
        onlineUsers.delete(key);
      }
    } else {
      // No socketId given — remove all connections for this user
      onlineUsers.delete(key);
    }
  },

  /** Emit to a single user across all their active connections */
  emitToUser(userId, event, data) {
    if (!_io || !userId) return;
    const sockets = onlineUsers.get(userId.toString());
    if (sockets) {
      for (const socketId of sockets) {
        _io.to(socketId).emit(event, data);
      }
    }
  },

  /** Emit to multiple users (skips duplicates) */
  emitToUsers(userIds, event, data) {
    if (!_io || !Array.isArray(userIds)) return;
    const seen = new Set();
    for (const uid of userIds) {
      const key = uid.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      const sockets = onlineUsers.get(key);
      if (sockets) {
        for (const socketId of sockets) {
          _io.to(socketId).emit(event, data);
        }
      }
    }
  }
};
