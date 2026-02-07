const Schedule = require("../models/Schedule");
const StudySession = require("../models/StudySession");
const Category = require("../models/Category");
const { createMultipleEvents, deleteMultipleEvents } = require("./googleCalendar");
const { createTasksFromSchedule, getOrCreateTaskList } = require("./googleTasks");


// Generate AI-powered study schedule

async function generateSchedule(userId, preferences = {}) {
  try {
    // Get user's study history
    const sessions = await StudySession.find({ userId })
      .populate("categoryId")
      .sort({ startTime: -1 })
      .limit(100);

    // Get all user categories
    const categories = await Category.find({ userId, isArchived: false });

    if (categories.length === 0) {
      throw new Error("No categories found. Please create some subjects first.");
    }

    // Analyze patterns
    const analysis = analyzeStudyPatterns(sessions);

    // Generate optimized schedule
    const scheduleItems = generateOptimizedSchedule({
      userId,
      categories,
      preferences,
      analysis,
    });

    // Calculate total planned minutes
    const totalPlannedMinutes = scheduleItems.reduce(
      (sum, item) => sum + item.duration,
      0
    );

    // Save schedule to database
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (preferences.daysToSchedule || 7));

    const schedule = await Schedule.create({
      userId,
      scheduleItems,
      validFrom,
      validUntil,
      totalPlannedMinutes,
      isActive: true,
    });

    return schedule;
  } catch (error) {
    throw new Error(`Schedule generation failed: ${error.message}`);
  }
}


//Sync schedule to Google Calendar and Tasks

async function syncScheduleToGoogle(userId, scheduleId) {
  try {
    const User = require("../models/User");
    const user = await User.findById(userId);

    if (!user) throw new Error("User not found");

    // Check if Google Calendar is connected
    if (!user.integrations.googleCalendar.connected) {
      throw new Error("Google Calendar not connected");
    }

    const schedule = await Schedule.findById(scheduleId);
    if (!schedule) throw new Error("Schedule not found");

    // Get or create task list
    const taskListId = await getOrCreateTaskList(user);

    // Sync to Google Calendar
    const calendarResults = await createMultipleEvents(user, schedule.scheduleItems);

    // Sync to Google Tasks
    const taskResults = await createTasksFromSchedule(
      user,
      taskListId,
      schedule.scheduleItems
    );

    // Update schedule with Google IDs
    for (let i = 0; i < schedule.scheduleItems.length; i++) {
      if (calendarResults[i]?.success) {
        schedule.scheduleItems[i].googleEventId = calendarResults[i].eventId;
      }
      if (taskResults[i]?.success) {
        schedule.scheduleItems[i].googleTaskId = taskResults[i].taskId;
      }
    }

    await schedule.save();

    return {
      success: true,
      calendarEventsSynced: calendarResults.filter((r) => r.success).length,
      tasksSynced: taskResults.filter((r) => r.success).length,
      totalItems: schedule.scheduleItems.length,
    };
  } catch (error) {
    throw new Error(`Google sync failed: ${error.message}`);
  }
}


 // Adaptive replanning - triggered when user misses sessions or changes priorities
 
async function replanSchedule(userId, reason = "User requested") {
  try {
    const User = require("../models/User");
    const user = await User.findById(userId);

    // Get current active schedule
    const currentSchedule = await Schedule.findOne({
      userId,
      isActive: true,
    });

    if (!currentSchedule) {
      // No active schedule, just generate new one
      return await generateSchedule(userId, user.preferences);
    }

    // Mark current schedule as inactive
    currentSchedule.isActive = false;
    await currentSchedule.save();

    // Generate new schedule
    const newSchedule = await generateSchedule(userId, user.preferences);

    // Mark it as replanned
    newSchedule.replannedFrom = currentSchedule._id;
    newSchedule.replannedReason = reason;
    await newSchedule.save();

    // If Google Calendar is connected, update it
    if (user.integrations.googleCalendar.connected) {
      // Delete old events from Google Calendar
      const oldEventIds = currentSchedule.scheduleItems
        .map((item) => item.googleEventId)
        .filter(Boolean);

      if (oldEventIds.length > 0) {
        await deleteMultipleEvents(user, oldEventIds);
      }

      // Sync new schedule
      await syncScheduleToGoogle(userId, newSchedule._id);
    }

    return newSchedule;
  } catch (error) {
    throw new Error(`Replanning failed: ${error.message}`);
  }
}


//Analyze study patterns from history
 
function analyzeStudyPatterns(sessions) {
  const categoryPerformance = {};
  const timePreferences = {};
  const modePreference = { pomodoro: 0, stopwatch: 0 };

  sessions.forEach((session) => {
    // Category performance
    const categoryName = session.categoryId?.name || "Unknown";
    if (!categoryPerformance[categoryName]) {
      categoryPerformance[categoryName] = {
        totalMinutes: 0,
        sessions: 0,
        completionRate: 0,
        completedSessions: 0,
      };
    }

    categoryPerformance[categoryName].totalMinutes += session.actualDuration;
    categoryPerformance[categoryName].sessions += 1;
    if (session.completed) {
      categoryPerformance[categoryName].completedSessions += 1;
    }

    // Calculate completion rate
    categoryPerformance[categoryName].completionRate =
      (categoryPerformance[categoryName].completedSessions /
        categoryPerformance[categoryName].sessions) *
      100;

    // Time preferences (what hour of day user studies most)
    const hour = new Date(session.startTime).getHours();
    timePreferences[hour] = (timePreferences[hour] || 0) + 1;

    // Mode preference
    modePreference[session.mode] += 1;
  });

  return {
    categoryPerformance,
    timePreferences,
    modePreference,
    totalSessions: sessions.length,
  };
}

// Generate optimized schedule items

function generateOptimizedSchedule({ userId, categories, preferences, analysis }) {
  const scheduleItems = [];
  const daysToSchedule = preferences.daysToSchedule || 7;
  const dailyGoalMinutes = preferences.dailyGoalMinutes || 120;

  // Determine preferred mode
  const preferredMode =
    analysis.modePreference.pomodoro > analysis.modePreference.stopwatch
      ? "pomodoro"
      : "stopwatch";

  for (let day = 0; day < daysToSchedule; day++) {
    const date = new Date();
    date.setDate(date.getDate() + day);

    // Skip if weekend (optional - can be configured)
    const dayOfWeek = date.getDay();
    if (preferences.skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) {
      continue;
    }

    // Distribute time across categories
    const minutesPerCategory = Math.floor(dailyGoalMinutes / categories.length);

    categories.forEach((category, index) => {
      // Find best time based on user's past behavior
      const bestHour = findBestStudyHour(analysis.timePreferences, 9 + index * 2);

      const startTime = new Date(date);
      startTime.setHours(bestHour, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes() + minutesPerCategory);

      scheduleItems.push({
        categoryId: category._id,
        title: "Study Session",
        description: `Focused study time for ${category.name}`,
        startTime,
        endTime,
        duration: minutesPerCategory,
        mode: preferredMode,
        priority: determinePriority(category, analysis),
        status: "scheduled",
      });
    });
  }

  return scheduleItems;
}

// Find the best hour to study based on past behavior

function findBestStudyHour(timePreferences, defaultHour = 9) {
  if (Object.keys(timePreferences).length === 0) {
    return defaultHour;
  }

  // Find hour with most sessions
  let maxSessions = 0;
  let bestHour = defaultHour;

  Object.entries(timePreferences).forEach(([hour, count]) => {
    if (count > maxSessions) {
      maxSessions = count;
      bestHour = parseInt(hour);
    }
  });

  return bestHour;
}


// Determine priority based on category performance

function determinePriority(category, analysis) {
  const performance = analysis.categoryPerformance[category.name];

  if (!performance) return "medium";

  // Low completion rate = high priority
  if (performance.completionRate < 50) return "high";
  if (performance.completionRate > 80) return "low";
  return "medium";
}

module.exports = {
  generateSchedule,
  syncScheduleToGoogle,
  replanSchedule,
  analyzeStudyPatterns,
};