const express = require("express");
const router = express.Router();

const {
  createStudySession,
} = require("../controller/studySession.controller");

//should be replaced with real middleware
const protect = require("../middleware/auth.middleware");

router.post("/", protect, createStudySession);

module.exports = router;
