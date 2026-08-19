const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");

// Standard grade-to-point mappings
const GRADE_MAP = {
  "A+": 4.0,
  "A": 4.0,
  "A-": 3.75,
  "B+": 3.5,
  "B": 3.0,
  "B-": 2.75,
  "C+": 2.5,
  "C": 2.0,
  "C-": 1.75,
  "D+": 1.5,
  "D": 1.0,
  "F": 0.0,
  "S": 4.0, // Satisfactory / Pass if graded
};

// Map numeric grade point back to label
function getGradeLabel(gradeValue) {
  const rounded = Number(gradeValue).toFixed(2);
  const match = Object.entries(GRADE_MAP).find(([, val]) => Math.abs(val - gradeValue) < 0.05);
  return match ? `${match[0]} (${rounded})` : `Grade (${rounded})`;
}

// Check if a line is a header, total, or metadata rather than a course
function isIgnoredLine(line) {
  const lower = line.toLowerCase();
  const ignorePatterns = [
    "total", "gpa", "cgpa", "sgpa", "grade point average", "cumulative", "semester",
    "issued on", "transcript", "controller of examinations", "registration", "student id",
    "academic transcript", "grade sheet", "date of issue", "page ", "credit earned",
    "credits earned", "credits registered", "standing", "remarks", "course title",
    "course code", "credit hours", "grade points", "letter grade", "dean's list", "university"
  ];
  return ignorePatterns.some((p) => lower.includes(p) && !lower.includes("lab") && !lower.includes("project"));
}

// Parse raw text extracted from PDF or OCR into structured courses
function extractCoursesFromText(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 3);

  const courses = [];
  const seenNames = new Set();

  // Regex patterns to capture courses
  // Pattern A: [Course Code] [Course Name] [Credit] [Grade/Point] [Optional Point]
  // Example: "CSE 4401 Web Engineering 3.00 A+ 4.00" or "MATH 2101 Linear Algebra 3.0 B+"
  const patternA = /^([A-Za-z]{2,5}\s*[-]?\s*\d{3,5}[A-Za-z]?)\s+([A-Za-z0-9\s,&/()\-'.]+?)\s+(\d(?:\.\d{1,2})?)\s+(A\+|A-|B\+|B-|C\+|C-|D\+|[A-DFSOa-dfso]|(?:[0-4]\.\d{1,2}))(?:\s+([A-Z\+\-]+|\d\.\d{1,2}))?$/i;

  // Pattern B: Pipe or tab delimited table row
  // Example: CSE4401 | Web Engineering | 3.0 | A+
  const tableSplitter = /[|\t;]/;

  for (let line of lines) {
    // Skip obvious metadata/summary lines
    if (isIgnoredLine(line)) continue;

    // Clean multiple consecutive spaces
    const cleanLine = line.replace(/\s+/g, " ").trim();

    // 1. Try Pattern A
    const matchA = cleanLine.match(patternA);
    if (matchA) {
      const code = matchA[1].trim();
      const title = matchA[2].trim();
      const creditNum = parseFloat(matchA[3]);
      const token1 = matchA[4].trim().toUpperCase();
      const token2 = matchA[5] ? matchA[5].trim().toUpperCase() : null;

      let gradePoint = 0;
      let label = token1;

      if (GRADE_MAP[token1] !== undefined) {
        gradePoint = GRADE_MAP[token1];
        label = token1;
      } else if (token2 && GRADE_MAP[token2] !== undefined) {
        gradePoint = GRADE_MAP[token2];
        label = token2;
      } else if (!isNaN(parseFloat(token1)) && parseFloat(token1) <= 4.0) {
        gradePoint = parseFloat(token1);
        label = getGradeLabel(gradePoint);
      }

      const fullName = `${code} ${title}`.trim();
      if (!seenNames.has(fullName.toLowerCase()) && creditNum > 0 && creditNum <= 15) {
        seenNames.add(fullName.toLowerCase());
        courses.push({
          name: fullName,
          credit: creditNum,
          grade: gradePoint,
          label: label,
        });
        continue;
      }
    }

    // 2. Try Table Delimited rows (pipe, tab, etc.)
    if (tableSplitter.test(line)) {
      const cols = line.split(tableSplitter).map((c) => c.trim()).filter(Boolean);
      if (cols.length >= 3) {
        // Find credit and grade columns
        let creditVal = null;
        let gradeVal = null;
        let gradeStr = "";
        let nameParts = [];

        for (const col of cols) {
          const num = parseFloat(col);
          const upper = col.toUpperCase();

          if (GRADE_MAP[upper] !== undefined && !gradeStr) {
            gradeVal = GRADE_MAP[upper];
            gradeStr = upper;
          } else if (!isNaN(num) && num > 0 && num <= 10 && creditVal === null && !isNaN(col)) {
            creditVal = num;
          } else if (!isNaN(num) && num >= 0 && num <= 4.0 && gradeVal === null && col.includes(".")) {
            gradeVal = num;
            gradeStr = getGradeLabel(num);
          } else if (col.length > 1 && isNaN(num)) {
            nameParts.push(col);
          }
        }

        if (nameParts.length && creditVal !== null && gradeVal !== null) {
          const fullName = nameParts.join(" - ");
          if (!seenNames.has(fullName.toLowerCase())) {
            seenNames.add(fullName.toLowerCase());
            courses.push({
              name: fullName,
              credit: creditVal,
              grade: gradeVal,
              label: gradeStr || getGradeLabel(gradeVal),
            });
            continue;
          }
        }
      }
    }

    // 3. Heuristic line search: Look for tokens with credits and grades
    const tokens = cleanLine.split(" ");
    if (tokens.length >= 3) {
      let foundCredit = null;
      let foundGrade = null;
      let foundLabel = "";
      let nameTokens = [];

      for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i].toUpperCase().replace(/[,:]/g, "");
        const num = parseFloat(token);

        if (GRADE_MAP[token] !== undefined && !foundLabel) {
          foundGrade = GRADE_MAP[token];
          foundLabel = token;
        } else if (!isNaN(num) && num >= 0.5 && num <= 10.0 && foundCredit === null) {
          foundCredit = num;
        } else if (!isNaN(num) && num >= 0 && num <= 4.0 && foundGrade === null) {
          foundGrade = num;
          foundLabel = getGradeLabel(num);
        } else {
          nameTokens.unshift(tokens[i]);
        }
      }

      const potentialName = nameTokens.join(" ").trim();
      if (
        foundCredit !== null &&
        foundGrade !== null &&
        potentialName.length >= 3 &&
        !isIgnoredLine(potentialName)
      ) {
        if (!seenNames.has(potentialName.toLowerCase())) {
          seenNames.add(potentialName.toLowerCase());
          courses.push({
            name: potentialName,
            credit: foundCredit,
            grade: foundGrade,
            label: foundLabel || getGradeLabel(foundGrade),
          });
        }
      }
    }
  }

  return courses;
}

// Main parsing function accepting a buffer and mimetype
async function parseTranscriptBuffer(buffer, mimetype, filename = "") {
  let extractedText = "";
  let extractionMethod = "local";

  if (mimetype === "application/pdf" || filename.toLowerCase().endsWith(".pdf")) {
    try {
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text || "";
      extractionMethod = "pdf-text";
    } catch (err) {
      console.warn("PDF text parse error, fallback to OCR:", err.message);
    }
  }

  // If text is still empty (e.g. image file or scanned PDF with no raw text)
  if (!extractedText.trim()) {
    try {
      const { data: { text } } = await Tesseract.recognize(buffer, "eng");
      extractedText = text || "";
      extractionMethod = "ocr";
    } catch (ocrErr) {
      console.error("Tesseract OCR error:", ocrErr.message);
      throw new Error("Unable to read image or scanned document. Please ensure the image is clear.");
    }
  }

  const courses = extractCoursesFromText(extractedText);

  // Compute GPA and statistics
  const totalCredits = courses.reduce((sum, c) => sum + c.credit, 0);
  const totalPoints = courses.reduce((sum, c) => sum + c.credit * c.grade, 0);
  const gpa = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0.0;

  return {
    courses,
    summary: {
      gpa: gpa.toFixed(2),
      totalCredits,
      totalPoints: totalPoints.toFixed(2),
      courseCount: courses.length,
      method: extractionMethod,
    },
    rawTextPreview: extractedText.slice(0, 500),
  };
}

module.exports = {
  parseTranscriptBuffer,
  extractCoursesFromText,
  GRADE_MAP,
};
