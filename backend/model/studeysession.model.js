const mongoose = require("mongoose");

const StudySessionSchema = new mongoose.Schema(
    {
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
    },

    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
        index: true,
    },

    mode: {
        type: String,
        required: true,
        enum: ["pomodoro", "stopwatch"],
    },

    plannedDuration: {
      type: Number, // minutes
        required: true,
    },

    actualDuration: {
      type: Number, // minutes
        required: true,
    },

    startTime: {
        type: Date,
        required: true,
    },

    endTime: {
        type: Date,
        required: true,
    },

    date: {
      type: String, // YYYY-MM-DD
        required: true,
        index: true,
    },

    completed: {
        type: Boolean,
        required: true,
    },

    stopReason: {
        type: String,
        enum: ["time_up", "manual_stop", "app_closed"],
        default: "time_up",
    },

    pomodoroCycle: {
        type: Number,
        default: null,
    },

    source: {
        type: String,
        enum: ["manual", "auto_scheduled"],
        default: "manual",
        index: true,
    },
    },
    { timestamps: true }
);

module.exports = mongoose.model("StudySession", StudySessionSchema);
