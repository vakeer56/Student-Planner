const mongoose = require("mongoose");

const ScheduleSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    scheduleItems: [
      {
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Category",
          required: true,
        },
        title: {
          type: String,
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
        duration: {
          type: Number, // minutes
          rewuired: true,
        },
        mode: {
          type: String,
          enum: ["pomodoro", "stopwatch"],
          default: "pomordoro",
        },
        priority: {
          type: String,
          enum: ["low", "medium", "high"],
          default: "medium",
        },
        //Google Calendar integration
        googleCalendarEventId: {
          type: String,
          default: null,
        },
        // Google Tasks Integration
        googleTaskId: {
          type: String,
          default: null,
        },
        status: {
          type: String,
          enum: [
            "scheduled",
            "completed",
            "in_progress",
            "missed",
            "cancelled",
          ],
        },
        // Link to study session
        studySessionId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "StudySession",
          default: null,
        },
      },
    ],
    // Schedule metadata
    generatedAt: {
      type: Date,
      default: Date.now,
    },

    validFrom: {
      type: Date,
      required: true,
    },

    validUntil: {
      type: Date,
      required: true,
    },

    // For adaptive replanning
    replannedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Schedule",
      default: null,
    },

    replannedReason: {
      type: String,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    // Analytics
    totalPlannedMinutes: {
      type: Number,
      default: 0,
    },

    completionRate: {
      type: Number, // percentage
      default: 0,
    },
  },
  { timestamps: true },
);

// Index for querying active schedules
ScheduleSchema.index({ userId: 1, isActive: 1, validFrom: 1 });

module.exports = mongoose.model("Schedule", ScheduleSchema);
