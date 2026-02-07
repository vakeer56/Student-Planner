const { google } = require("googleapis");
const { getAuthenticatedClient, ensureValidToken } = require("../config/googleAuth");
const category = require("../model/category.model");

//Function to create calendar event
async function createCalendarEvent(user, eventData, category){
    try{
        user = await ensureValidToken(user);

        const auth = getAuthenticatedClient(user);
        const calendar = google.calendar({ version: "v3", auth});

            const event = {
                summary: `${category.name}: ${eventData.title}`,
                description: eventData.description || `Study session for ${category.name}`,
                start: {
                    dateTime: eventData.startTime.toISOString(),
                    timeZone: user.timezone,
                },
                end: {
                    dateTime: eventData.endTime.toISOString(),
                    timeZone: user.timezone,
                },
                colorId: getCategoryColorId(category.color),
                reminders: {
                    useDefault: false,
                    overrides: [
                    { method: "popup", minutes: 15 },
                    { method: "popup", minutes: 5 },
                ],
            },
        };

        const response = await calendar.events.insert({
            calendarId: "primary",
            resource: event,
        });

        return {
            success: true,
            eventId: response.data.id,
            htmlLink: response.data.htmlLink,
        };
    } catch (error) {
        console.error("Calendar event creation failed", error);
        throw new Error(`Failed to create calendar event: ${error.message}` )
    }
}

// Create multiple events
async function createMultipleEvents(user, scheduleItems) {
  user = await ensureValidToken(user);
  const auth = getAuthenticatedClient(user);
  const calendar = google.calendar({ version: "v3", auth });

  const results = [];

  for (const item of scheduleItems) {
    try {
      // Get category details
      const category = await Category.findById(item.categoryId);
      if (!category) {
        results.push({
          success: false,
          error: "Category not found",
          originalItem: item,
        });
        continue;
      }

      const event = {
        summary: ` ${category.name}: ${item.title}`,
        description: item.description || `Study session for ${category.name}`,
        start: {
          dateTime: item.startTime.toISOString(),
          timeZone: user.timezone,
        },
        end: {
          dateTime: item.endTime.toISOString(),
          timeZone: user.timezone,
        },
        colorId: getCategoryColorId(category.color),
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 15 }],
        },
      };

      const response = await calendar.events.insert({
        calendarId: "primary",
        resource: event,
      });

      results.push({
        success: true,
        eventId: response.data.id,
        originalItem: item,
      });
    } catch (error) {
      results.push({
        success: false,
        error: error.message,
        originalItem: item,
      });
    }
  }

  return results;
}

//Update Calendar events
async function updateCalendarEvent(user, eventId, updates) {
  try {
    user = await ensureValidToken(user);
    const auth = getAuthenticatedClient(user);
    const calendar = google.calendar({ version: "v3", auth });

    const updateData = {};
    
    if (updates.title) updateData.summary = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.startTime) {
      updateData.start = {
        dateTime: updates.startTime.toISOString(),
        timeZone: user.timezone,
      };
    }
    if (updates.endTime) {
      updateData.end = {
        dateTime: updates.endTime.toISOString(),
        timeZone: user.timezone,
      };
    }

    const response = await calendar.events.patch({
      calendarId: "primary",
      eventId: eventId,
      resource: updateData,
    });

    return {
      success: true,
      eventId: response.data.id,
    };
  } catch (error) {
    throw new Error(`Failed to update calendar event: ${error.message}`);
  }
}

//Deletion of calendar event
async function deleteCalendarEvent(user, eventId) {
  try {
    user = await ensureValidToken(user);
    const auth = getAuthenticatedClient(user);
    const calendar = google.calendar({ version: "v3", auth });

    await calendar.events.delete({
      calendarId: "primary",
      eventId: eventId,
    });

    return { success: true };
  } catch (error) {
    throw new Error(`Failed to delete calendar event: ${error.message}`);
  }
}

//Delete Multiple events
async function deleteMultipleEvents(user, eventIds) {
  user = await ensureValidToken(user);
  const auth = getAuthenticatedClient(user);
  const calendar = google.calendar({ version: "v3", auth });

  const results = await Promise.allSettled(
    eventIds.map((eventId) =>
      calendar.events.delete({
        calendarId: "primary",
        eventId: eventId,
      })
    )
  );

  return {
    deleted: results.filter((r) => r.status === "fulfilled").length,
    failed: results.filter((r) => r.status === "rejected").length,
  };
}

//get user calendar event
async function getCalendarEvents(user, timeMin, timeMax) {
  try {
    user = await ensureValidToken(user);
    const auth = getAuthenticatedClient(user);
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin || new Date().toISOString(),
      timeMax: timeMax,
      singleEvents: true,
      orderBy: "startTime",
    });

    return response.data.items || [];
  } catch (error) {
    throw new Error(`Failed to fetch calendar events: ${error.message}`);
  }
}

// Category color to google calendar color id
function getCategoryColorId(hexColor) {
  // Google Calendar color IDs mapping
  const colorMap = {
    "#4f46e5": "9", 
    "#ef4444": "11", 
    "#10b981": "10", 
    "#f59e0b": "6",  
    "#8b5cf6": "1", 
    "#06b6d4": "7",  
    "#ec4899": "4",  
    "#6b7280": "8",  
  };

  return colorMap[hexColor.toLowerCase()] || "9"; // Default to blue
}

module.exports = {
  createCalendarEvent,
  createMultipleEvents,
  updateCalendarEvent,
  deleteCalendarEvent,
  deleteMultipleEvents,
  getCalendarEvents,
};