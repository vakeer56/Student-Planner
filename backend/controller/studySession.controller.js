const StudySession = require("../models/studysession.model.js");
const Category = require("../models/category.model.js");

/* ----------------------------------------------------
    CREATE STUDY SESSION (called when timer ENDS)
---------------------------------------------------- */
exports.createStudySession = async (req, res) => {
  try {


    const userId = req.user.id;
    const {
      categoryId,
      mode,
      plannedDuration,
      actualDuration,
      startTime,
      endTime,
      date,
      stopReason,
      source,
      completed,
      pomodoroCycle
    } = req.body || {};


    /* --------------------
        Basic presence checks
    -------------------- */
    if (
      !categoryId ||
      !mode ||
      plannedDuration == null ||
      actualDuration == null ||
      !startTime ||
      !endTime ||
      !date ||
      completed == null ||
      !stopReason ||
      !source
    ) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    /* --------------------
        Category ownership
    -------------------- */
    const category = await Category.findOne({
      _id: categoryId,
      userId,
      isArchived: false,
    });

    if (!category) {
      return res
        .status(403)
        .json({ message: "Category does not belong to user" });
    }

    /* --------------------
        Validation
    -------------------- */
    if (actualDuration < 0 || plannedDuration < 0) {
      return res
        .status(400)
        .json({ message: "Durations must be non-negative" });
    }

    if (actualDuration > plannedDuration) {
      return res.status(400).json({
        message: "actualDuration cannot exceed plannedDuration",
      });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (start >= end) {
      return res
        .status(400)
        .json({ message: "startTime must be before endTime" });
    }

    const startDateISO = start.toISOString().split("T")[0];
    if (startDateISO !== date) {
      return res.status(400).json({
        message: "date must match startTime (YYYY-MM-DD)",
      });
    }

    /* --------------------
        Create session
    -------------------- */
    const session = await StudySession.create({
      userId,
      categoryId,
      mode,
      plannedDuration,
      actualDuration,
      startTime,
      endTime,
      date,
      completed,
      stopReason,
      pomodoroCycle,
      source,
    });

    return res.status(201).json(session);
  } catch (error) {
    console.error("Create Study Session Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
