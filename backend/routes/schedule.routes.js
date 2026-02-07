const express = require("express");
const router = express.Router();
const {
  generateSchedule,
  syncScheduleToGoogle,
  replanSchedule,
} = require("../integrations/autoSchedule");
const Schedule = require("../models/Schedule");

/**
 * POST /api/schedule/generate
 * Generate new AI schedule
 */
router.post("/generate", async (req, res) => {
  try {
    const { userId, preferences } = req.body;

    const schedule = await generateSchedule(userId, preferences);

    res.json({
      success: true,
      schedule,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/schedule/sync-google
 * Sync schedule to Google Calendar & Tasks
 */
router.post("/sync-google", async (req, res) => {
  try {
    const { userId, scheduleId } = req.body;

    const result = await syncScheduleToGoogle(userId, scheduleId);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/schedule/replan
 * Trigger adaptive replanning
 */
router.post("/replan", async (req, res) => {
  try {
    const { userId, reason } = req.body;

    const newSchedule = await replanSchedule(userId, reason);

    res.json({
      success: true,
      schedule: newSchedule,
      message: "Schedule replanned and synced to Google Calendar",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schedule/current/:userId
 * Get current active schedule
 */
router.get("/current/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const schedule = await Schedule.findOne({
      userId,
      isActive: true,
    })
      .populate("scheduleItems.categoryId")
      .sort({ generatedAt: -1 });

    res.json(schedule);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schedule/history/:userId
 * Get all past schedules
 */
router.get("/history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const schedules = await Schedule.find({ userId })
      .populate("scheduleItems.categoryId")
      .sort({ generatedAt: -1 })
      .limit(10);

    res.json(schedules);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;