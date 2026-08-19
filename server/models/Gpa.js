const mongoose = require("mongoose");

const courseItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  credit: { type: Number, required: true, min: 0.25, max: 20 },
  grade: { type: Number, required: true, min: 0, max: 4.0 },
  label: { type: String, default: "", trim: true },
});

const gpaSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    courses: [courseItemSchema],
    gpa: {
      type: Number,
      default: 0.0,
    },
    totalCredits: {
      type: Number,
      default: 0.0,
    },
    totalPoints: {
      type: Number,
      default: 0.0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Gpa", gpaSchema);
