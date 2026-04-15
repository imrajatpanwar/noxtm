/**
 * Shared socket store — holds the io instance and user→socket mapping
 * so any route can emit to specific users.
 */
let _io = null;
const onlineUsers = new Map(); // userId (string) → socketId

module.exports = {
  setIo(io) { _io = io; },
  getIo() { return _io; },

  setUserOnline(userId, socketId) {
    onlineUsers.set(userId.toString(), socketId);
  },
  setUserOffline(userId) {
    onlineUsers.delete(userId.toString());
  },

  /** Emit to a single user if they're connected */
  emitToUser(userId, event, data) {
    if (!_io || !userId) return;
    const socketId = onlineUsers.get(userId.toString());
    if (socketId) _io.to(socketId).emit(event, data);
  },

  /** Emit to multiple users (skips duplicates) */
  emitToUsers(userIds, event, data) {
    if (!_io || !Array.isArray(userIds)) return;
    const seen = new Set();
    for (const uid of userIds) {
      const key = uid.toString();
      if (seen.has(key)) continue;
      seen.add(key);
      const socketId = onlineUsers.get(key);
      if (socketId) _io.to(socketId).emit(event, data);
    }
  }
};
