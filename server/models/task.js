const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true },
  dueDate: { type: Date, required: true },
  priority: { type: String, enum: ["high", "medium", "low"], default: "medium" },
  notes: { type: String, default: "", trim: true },
  completed: { type: Boolean, default: false },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

module.exports = mongoose.model("Task", taskSchema);
