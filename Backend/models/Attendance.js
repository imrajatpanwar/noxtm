const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    date: { type: String, required: true }, // YYYY-MM-DD format for easy querying
    sessions: [{
        loginAt: { type: Date, required: true },
        logoutAt: { type: Date },
        durationMinutes: { type: Number, default: 0 }
    }],
    totalMinutes: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ['present', 'absent', 'half-day', 'holiday', 'leave', 'late'],
        default: 'present'
    },
    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Compound index: one record per user per day
attendanceSchema.index({ userId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ companyId: 1, date: 1 });
attendanceSchema.index({ companyId: 1, userId: 1 });

// Recalculate total minutes before saving
attendanceSchema.pre('save', function (next) {
    this.updatedAt = Date.now();

    // Calculate total minutes from all sessions
    let total = 0;
    for (const session of this.sessions) {
        if (session.loginAt && session.logoutAt) {
            session.durationMinutes = Math.round((session.logoutAt - session.loginAt) / 60000);
            total += session.durationMinutes;
        } else if (session.loginAt && !session.logoutAt) {
            // Active session - calculate up to now
            const now = new Date();
            session.durationMinutes = Math.round((now - session.loginAt) / 60000);
            total += session.durationMinutes;
        }
    }
    this.totalMinutes = total;

    next();
});

module.exports = mongoose.model('Attendance', attendanceSchema);
