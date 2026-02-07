const express = require("express");
const router = express.Router();
const User = require("../model/user.model");
const { getAuthUrl, getTokensFromCode } = require("../config/googleAuth");
const  { google } = require("googleapis");


//Start OAuth flow - redirect user to Google
router.get("/google", (req, res)=>{
    const authUrl = getAuthUrl();
    res.json({ authUrl });
});

//Handle OAuth callback from Google
router.get("/google/callback", async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login?error=no_code`);
    }

    // Exchange code for tokens
    const tokens = await getTokensFromCode(code);

    // Get user info from Google
    const oauth2Client = require("../config/googleAuth").getOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    // Find or create user
    let user = await User.findOne({ email: data.email });

    if (!user) {
      user = await User.create({
        googleId: data.id,
        email: data.email,
        name: data.name,
        avatar: data.picture,
        integrations: {
          googleCalendar: {
            connected: true,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            tokenExpiry: new Date(tokens.expiry_date),
          },
        },
      });
    } else {
      // Update existing user's tokens
      user.integrations.googleCalendar.connected = true;
      user.integrations.googleCalendar.accessToken = tokens.access_token;
      user.integrations.googleCalendar.refreshToken = tokens.refresh_token;
      user.integrations.googleCalendar.tokenExpiry = new Date(tokens.expiry_date);
      user.lastLoginAt = new Date();
      await user.save();
    }

    // Redirect to frontend with user ID (or JWT token)
    res.redirect(`${process.env.FRONTEND_URL}/auth/success?userId=${user._id}`);

  } catch (error) {
    console.error("OAuth callback error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

// Disconnect google calendar
router.post("/disconnect-google", async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.integrations.googleCalendar.connected = false;
    user.integrations.googleCalendar.accessToken = null;
    user.integrations.googleCalendar.refreshToken = null;
    user.integrations.googleCalendar.tokenExpiry = null;
    await user.save();

    res.json({ success: true, message: "Google Calendar disconnected" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;