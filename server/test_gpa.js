const { extractCoursesFromText, GRADE_MAP } = require("./services/transcriptParser");

const sampleTranscriptText = `
ISLAMIC UNIVERSITY OF TECHNOLOGY (IUT)
DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING
ACADEMIC TRANSCRIPT / GRADE REPORT

Student Name: Prince Fahim
Student ID: 220042149
Semester: 4th Semester

--------------------------------------------------------------------------------
Course Code  Course Title                        Credits   Grade   Grade Point
--------------------------------------------------------------------------------
CSE 4401     Software Design Patterns            3.00      A+      4.00
CSE 4402     Software Design Patterns Lab        1.50      A       4.00
CSE 4403     Web Engineering                     3.00      A-      3.75
CSE 4404     Web Engineering Lab                 0.75      A+      4.00
MATH 2201    Probability and Statistics          3.00      B+      3.50
HUM 4247     Engineering Ethics                  2.00      A       4.00
--------------------------------------------------------------------------------
Total Credits Earned: 13.25
Semester GPA: 3.86
`;

console.log("=== Testing Text Extraction ===");
const courses = extractCoursesFromText(sampleTranscriptText);
console.log("Extracted Courses:", JSON.stringify(courses, null, 2));

const totalCredits = courses.reduce((sum, c) => sum + c.credit, 0);
const totalPoints = courses.reduce((sum, c) => sum + c.credit * c.grade, 0);
const gpa = totalCredits ? (totalPoints / totalCredits).toFixed(2) : "0.00";

console.log("\n=== Calculated Stats ===");
console.log(`Total Courses: ${courses.length}`);
console.log(`Total Credits: ${totalCredits}`);
console.log(`Total Points: ${totalPoints.toFixed(2)}`);
console.log(`GPA: ${gpa}`);

if (courses.length === 6 && totalCredits === 13.25) {
  console.log("\n✅ ALL TESTS PASSED SUCCESSFULLY!");
} else {
  console.error("\n❌ Test failed: unexpected courses length or credits", courses.length, totalCredits);
  process.exit(1);
}
