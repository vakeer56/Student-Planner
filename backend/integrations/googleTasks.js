const { google } = require("googleapis");
const { getAuthenticatedClient, ensureValidToken } = require("../config/googleAuth");

// Create a study task list
async function getOrCreateTaskList(user) {
  try {
    user = await ensureValidToken(user);
    const auth = getAuthenticatedClient(user);
    const tasks = google.tasks({ version: "v1", auth });

    // Get all task lists
    const listsResponse = await tasks.tasklists.list();
    const lists = listsResponse.data.items || [];

    // Check if "AI Study Planner" list exists
    let taskList = lists.find((list) => list.title === "AI Study Planner");

    if (!taskList) {
      // Create new task list
      const createResponse = await tasks.tasklists.insert({
        resource: {
          title: "AI Study Planner",
        },
      });
      taskList = createResponse.data;
    }

    return taskList.id;
  } catch (error) {
    throw new Error(`Failed to get/create task list: ${error.message}`);
  }
}

// Create a single tasks
async function createTask(user, taskListId, taskData, category) {
  try {
    user = await ensureValidToken(user);
    const auth = getAuthenticatedClient(user);
    const tasks = google.tasks({ version: "v1", auth });

    const task = {
      title: ` ${category.name}: ${taskData.title}`,
      notes: `${taskData.description || ""}\n\nScheduled: ${new Date(
        taskData.startTime
      ).toLocaleString("en-US", { timeZone: user.timezone })}`,
      due: taskData.startTime.toISOString(),
    };

    const response = await tasks.tasks.insert({
      tasklist: taskListId,
      resource: task,
    });

    return {
      success: true,
      taskId: response.data.id,
      title: response.data.title,
    };
  } catch (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }
}

// Create multiple tasks from schedule
async function createTasksFromSchedule(user, taskListId, scheduleItems) {
  user = await ensureValidToken(user);
  const auth = getAuthenticatedClient(user);
  const tasks = google.tasks({ version: "v1", auth });
  const Category = require("../models/Category");

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

      const task = {
        title: `${category.name}: ${item.title}`,
        notes: `${item.description || ""}\n\nScheduled: ${new Date(
          item.startTime
        ).toLocaleString("en-US", { timeZone: user.timezone })}`,
        due: item.startTime.toISOString(),
      };

      const response = await tasks.tasks.insert({
        tasklist: taskListId,
        resource: task,
      });

      results.push({
        success: true,
        taskId: response.data.id,
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

//Mark as completed 
async function completeTask(user, taskListId, taskId) {
  try {
    user = await ensureValidToken(user);
    const auth = getAuthenticatedClient(user);
    const tasks = google.tasks({ version: "v1", auth });

    const response = await tasks.tasks.patch({
      tasklist: taskListId,
      task: taskId,
      resource: {
        status: "completed",
      },
    });

    return {
      success: true,
      taskId: response.data.id,
    };
  } catch (error) {
    throw new Error(`Failed to complete task: ${error.message}`);
  }
}

// Delete a task
async function deleteTask(user, taskListId, taskId) {
  try {
    user = await ensureValidToken(user);
    const auth = getAuthenticatedClient(user);
    const tasks = google.tasks({ version: "v1", auth });

    await tasks.tasks.delete({
      tasklist: taskListId,
      task: taskId,
    });

    return { success: true };
  } catch (error) {
    throw new Error(`Failed to delete task: ${error.message}`);
  }
}

//get tasks from the study task list
async function getTasks(user, taskListId) {
  try {
    user = await ensureValidToken(user);
    const auth = getAuthenticatedClient(user);
    const tasks = google.tasks({ version: "v1", auth });

    const response = await tasks.tasks.list({
      tasklist: taskListId,
      showCompleted: true,
    });

    return response.data.items || [];
  } catch (error) {
    throw new Error(`Failed to fetch tasks: ${error.message}`);
  }
}

module.exports = {
  getOrCreateTaskList,
  createTask,
  createTasksFromSchedule,
  completeTask,
  deleteTask,
  getTasks,
};