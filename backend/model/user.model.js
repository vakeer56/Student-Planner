const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
    {
    googleId: {
        type: String,
        required: true,
        unique: true,
        index: true,
    },

    name: {
        type: String,
        required: true,
        trim: true,
    },

    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        index: true,
    },

    avatar: {
      type: String, // Google profile picture
    },

    timezone: {
        type: String,
        default: "Asia/Kolkata",
    },

    preferences: {
        pomodoroWork: {
        type: Number,
        default: 25,
        },
        pomodoroBreak: {
        type: Number,
        default: 5,
        },
        dailyGoalMinutes: {
        type: Number,
        default: 120,
        },
    },

    integrations: {
        googleCalendar: {
        connected: {
            type: Boolean,
            default: false,
        },

        accessToken: {
            type: String,
            select: false,
        },

        refreshToken: {
            type: String,
            select: false,
        },

        tokenExpiry: {
            type: Date,
        },
        },
    },

    lastLoginAt: {
        type: Date,
        default: Date.now,
    },
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
