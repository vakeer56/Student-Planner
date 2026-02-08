const { google } = require("googleapis");

// Create Oauth client
function getOAuth2Client() {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
}

// Create auth url for user to grant permission
function getAuthUrl() {
  const oauth2Client = getOAuth2Client();

  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/tasks",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent", // Force consent to get refresh token
  });
}

async function getTokensFromCode(code) {
  const oauth2Client = getOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
}

function getAuthenticatedClient(user) {
  const oauth2Client = getOAuth2Client();
  
  oauth2Client.setCredentials({
    access_token: user.integrations.googleCalendar.accessToken,
    refresh_token: user.integrations.googleCalendar.refreshToken,
    expiry_date: user.integrations.googleCalendar.tokenExpiry?.getTime(),
  });

  return oauth2Client;
}

async function refreshAccessToken(user) {
  const oauth2Client = getOAuth2Client();
  
  oauth2Client.setCredentials({
    refresh_token: user.integrations.googleCalendar.refreshToken,
  });

  const { credentials } = await oauth2Client.refreshAccessToken();
  
  // Update user's tokens
  user.integrations.googleCalendar.accessToken = credentials.access_token;
  user.integrations.googleCalendar.tokenExpiry = new Date(credentials.expiry_date);
  await user.save();

  return credentials;
}

async function ensureValidToken(user) {
  const now = new Date();
  const expiry = user.integrations.googleCalendar.tokenExpiry;

  // Refresh if expired or expiring in next 5 minutes
  if (!expiry || now >= new Date(expiry.getTime() - 5 * 60 * 1000)) {
    await refreshAccessToken(user);
  }

  return user;
}

module.exports = {
  getOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  getAuthenticatedClient,
  refreshAccessToken,
  ensureValidToken,
};