const Gpa = require("../models/Gpa");
const { parseTranscriptBuffer } = require("../services/transcriptParser");

// Get the authenticated user's saved GPA and courses from MongoDB
const getGpa = async (req, res) => {
  try {
    const gpaRecord = await Gpa.findOne({ user: req.user._id });
    if (!gpaRecord) {
      return res.json({ courses: [], gpa: 0, totalCredits: 0, totalPoints: 0 });
    }
    res.json(gpaRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Save/update the authenticated user's courses and GPA in MongoDB
const saveGpa = async (req, res) => {
  try {
    const { courses = [] } = req.body;

    const cleanCourses = courses.map((c) => ({
      name: String(c.name || "").trim(),
      credit: Number(c.credit) || 0,
      grade: Number(c.grade) || 0,
      label: String(c.label || "").trim(),
    })).filter((c) => c.name && c.credit > 0);

    const totalCredits = cleanCourses.reduce((sum, c) => sum + c.credit, 0);
    const totalPoints = cleanCourses.reduce((sum, c) => sum + c.credit * c.grade, 0);
    const gpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0.0;

    const gpaRecord = await Gpa.findOneAndUpdate(
      { user: req.user._id },
      {
        courses: cleanCourses,
        gpa,
        totalCredits: parseFloat(totalCredits.toFixed(2)),
        totalPoints: parseFloat(totalPoints.toFixed(2)),
      },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    res.json(gpaRecord);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Parse uploaded PDF/Image transcript
const parseGpaFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please upload an image (PNG, JPG, WEBP) or PDF file." });
    }

    const { buffer, mimetype, originalname } = req.file;

    const result = await parseTranscriptBuffer(buffer, mimetype, originalname);

    if (!result.courses || result.courses.length === 0) {
      return res.status(422).json({
        message: "No courses or grades could be detected in this document. You can enter them manually or try a clearer image/PDF.",
        rawTextPreview: result.rawTextPreview || "",
      });
    }

    res.json({
      success: true,
      filename: originalname,
      courses: result.courses,
      summary: result.summary,
    });
  } catch (error) {
    console.error("GPA parsing error:", error);
    res.status(500).json({ message: error.message || "Failed to process the document." });
  }
};

module.exports = {
  getGpa,
  saveGpa,
  parseGpaFile,
};
