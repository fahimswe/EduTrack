const express = require("express");
const multer = require("multer");
const { parseGpaFile } = require("../controllers/gpaController");

const router = express.Router();

// Configure multer for in-memory upload handling
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
      "image/bmp",
      "image/tiff",
    ];

    if (allowedMimeTypes.includes(file.mimetype) || /\.(pdf|png|jpe?g|webp|bmp|tiff)$/i.test(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported file type. Please upload a PDF or image file (PNG, JPG, WEBP)."), false);
    }
  },
});

router.post("/parse", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ message: "File size exceeds 10MB limit." });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }
    next();
  });
}, parseGpaFile);

module.exports = router;
