const { parseTranscriptBuffer } = require("../services/transcriptParser");

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

module.exports = { parseGpaFile };
