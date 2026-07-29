const Task = require("../models/task");

const createTask = async (req, res) => {
  try {
    const { title, subject, dueDate, priority, notes } = req.body;
    if (!title || !subject || !dueDate) {
      return res.status(400).json({ message: "Please fill in a task, subject, and due date." });
    }

    const task = await Task.create({
      title: title.trim(), subject: subject.trim(), dueDate,
      priority: priority || "medium", notes: notes || "", user: req.user._id,
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ user: req.user._id }).sort({ dueDate: 1, createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateTask = async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, user: req.user._id });
    if (!task) return res.status(404).json({ message: "Task not found." });
    ["title", "subject", "dueDate", "priority", "notes", "completed"].forEach((field) => {
      if (req.body[field] !== undefined) task[field] = req.body[field];
    });
    res.json(await task.save());
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteTask = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!task) return res.status(404).json({ message: "Task not found." });
    res.json({ message: "Task deleted." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createTask, getTasks, updateTask, deleteTask };
