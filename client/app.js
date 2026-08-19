const api = "/api";
let tasks = [], notes = [], filter = "all", authMode = "login", activeView = "tasks";
let user = JSON.parse(localStorage.getItem("edutrack_user") || "null");
let secondsLeft = 25 * 60, timerId = null;
let courses = JSON.parse(localStorage.getItem("edutrack_courses") || "[]");
const $ = (selector) => document.querySelector(selector);
const today = new Date();
const dateKey = (date) => new Date(date).toISOString().slice(0, 10);
const escapeHtml = (value) => { const node = document.createElement("div"); node.textContent = value; return node.innerHTML; };

function request(path, options = {}) {
  return fetch(`${api}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token || ""}`, ...options.headers } }).then(async (response) => {
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || "Something went wrong. Please try again.");
    return body;
  });
}
function showToast(message) { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); setTimeout(() => toast.classList.remove("show"), 2700); }
function setToday() { $("#dateDay").textContent = String(today.getDate()).padStart(2, "0"); $("#dateMonth").textContent = today.toLocaleDateString("en", { month: "long" }).toUpperCase(); $("#dateWeekday").textContent = today.toLocaleDateString("en", { weekday: "long" }).toUpperCase(); }
function formatDate(date) { return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date)); }

function renderSummary() {
  const open = tasks.filter((task) => !task.completed), done = tasks.length - open.length;
  const soon = open.filter((task) => { const days = (new Date(task.dueDate) - today) / 86400000; return days >= -1 && days < 7; });
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  $("#todoCount").textContent = open.length; $("#soonCount").textContent = soon.length; $("#doneCount").textContent = done;
  $("#progressValue").textContent = `${percent}%`; $(".ring").style.setProperty("--progress", `${percent}%`);
  $("#progressText").textContent = percent === 100 && tasks.length ? "Everything is complete!" : percent ? `${done} of ${tasks.length} tasks complete.` : "Start with one task today.";
}
function visibleTasks() {
  const startTomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (filter === "today") return tasks.filter((task) => dateKey(task.dueDate) === dateKey(today));
  if (filter === "upcoming") return tasks.filter((task) => new Date(task.dueDate) >= startTomorrow && !task.completed);
  if (filter === "completed") return tasks.filter((task) => task.completed);
  return tasks;
}
function renderTasks() {
  const list = $("#taskList"), shown = visibleTasks(); list.innerHTML = ""; $("#emptyState").classList.toggle("hidden", shown.length > 0);
  shown.forEach((task) => {
    const due = new Date(task.dueDate), overdue = !task.completed && due < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const card = document.createElement("article"); card.className = `task ${task.completed ? "done" : ""}`;
    card.innerHTML = `<button class="check" data-complete="${task._id}" aria-label="Toggle completion">${task.completed ? "✓" : ""}</button><div><div class="task-title">${escapeHtml(task.title)}</div><div class="task-meta">${escapeHtml(task.subject)}${task.notes ? ` · ${escapeHtml(task.notes)}` : ""}</div></div><span class="tag ${task.priority}">${task.priority}</span><div class="task-date ${overdue ? "overdue" : ""}">${overdue ? "Overdue · " : ""}${formatDate(due)}</div><button class="more" data-edit="${task._id}" aria-label="Edit task">⋯</button><button class="delete-button" data-delete-task="${task._id}" aria-label="Delete task">×</button>`;
    list.appendChild(card);
  });
  renderSummary();
}
async function loadTasks() { if (!user) return; try { tasks = await request("/tasks"); renderTasks(); } catch (error) { showToast(error.message); if (error.message.includes("Not authorized")) logout(); } }
function openTask(task) {
  $("#taskForm").reset(); $("#taskMessage").textContent = ""; $("#taskId").value = task?._id || "";
  $("#modalEyebrow").textContent = task ? "EDIT TASK" : "NEW TASK"; $("#modalTitle").textContent = task ? "A few small changes." : "What needs your attention?"; $("#saveTaskBtn").textContent = task ? "Save changes" : "Save task";
  if (task) { $("#taskTitle").value = task.title; $("#taskSubject").value = task.subject; $("#taskDate").value = dateKey(task.dueDate); $("#taskPriority").value = task.priority; $("#taskNotes").value = task.notes || ""; } else $("#taskDate").value = dateKey(today);
  $("#taskModal").classList.remove("hidden"); $("#taskTitle").focus();
}
function closeTask() { $("#taskModal").classList.add("hidden"); }

function renderNotes() {
  const list = $("#noteList"); list.innerHTML = ""; $("#notesEmpty").classList.toggle("hidden", notes.length > 0);
  notes.forEach((note) => { const card = document.createElement("article"); card.className = "note-card"; card.innerHTML = `<div class="note-card-header"><h3>${escapeHtml(note.title)}</h3><div><button class="more" data-edit-note="${note._id}" aria-label="Edit note">⋯</button><button class="delete-button" data-delete-note="${note._id}" aria-label="Delete note">×</button></div></div><p>${escapeHtml(note.content)}</p><small>Updated ${formatDate(note.updatedAt)}</small>`; list.appendChild(card); });
}
async function loadNotes() { if (!user) return; try { notes = await request("/notes"); renderNotes(); } catch (error) { showToast(error.message); } }
function openNote(note) { $("#noteForm").reset(); $("#noteMessage").textContent = ""; $("#noteId").value = note?._id || ""; $("#noteEyebrow").textContent = note ? "EDIT NOTE" : "NEW NOTE"; $("#noteModalTitle").textContent = note ? "Refine your thoughts." : "Capture the important bits."; $("#saveNoteBtn").textContent = note ? "Save changes" : "Save note"; if (note) { $("#noteTitle").value = note.title; $("#noteContent").value = note.content; } $("#noteModal").classList.remove("hidden"); $("#noteTitle").focus(); }
function closeNote() { $("#noteModal").classList.add("hidden"); }

function renderTimer() { const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0"), seconds = String(secondsLeft % 60).padStart(2, "0"); $("#timerDisplay").textContent = `${minutes}:${seconds}`; }
function resetTimer() { clearInterval(timerId); timerId = null; secondsLeft = 25 * 60; $("#timerStart").textContent = "Start focus"; $("#timerStatus").textContent = "Ready when you are."; renderTimer(); }
function toggleTimer() {
  if (timerId) { clearInterval(timerId); timerId = null; $("#timerStart").textContent = "Resume focus"; $("#timerStatus").textContent = "Paused. Take the time you need."; return; }
  timerId = setInterval(() => { secondsLeft--; renderTimer(); if (secondsLeft <= 0) { clearInterval(timerId); timerId = null; $("#timerStart").textContent = "Start another session"; $("#timerStatus").textContent = "Session complete — great work!"; showToast("Pomodoro complete. Time for a short break!"); } }, 1000);
  $("#timerStart").textContent = "Pause"; $("#timerStatus").textContent = "Focus mode is on.";
}
const GRADE_OPTIONS = [
  { value: 4, label: "A+ / A (4.00)" },
  { value: 3.75, label: "A- (3.75)" },
  { value: 3.5, label: "B+ (3.50)" },
  { value: 3, label: "B (3.00)" },
  { value: 2.75, label: "B- (2.75)" },
  { value: 2.5, label: "C+ (2.50)" },
  { value: 2, label: "C (2.00)" },
  { value: 1.75, label: "C- (1.75)" },
  { value: 1.5, label: "D+ (1.50)" },
  { value: 1, label: "D (1.00)" },
  { value: 0, label: "F (0.00)" },
];

function renderGpa() {
  const credits = courses.reduce((sum, c) => sum + (Number(c.credit) || 0), 0);
  const points = courses.reduce((sum, c) => sum + (Number(c.credit) || 0) * (Number(c.grade) || 0), 0);
  const gpa = credits > 0 ? (points / credits).toFixed(2) : "0.00";

  $("#gpaValue").textContent = gpa;
  $("#gpaCredits").textContent = Number.isInteger(credits) ? String(credits) : credits.toFixed(1);
  $("#gpaPoints").textContent = points.toFixed(2);
  $("#gpaCourseCount").textContent = String(courses.length);

  const container = $("#courseList");
  const emptyState = $("#gpaEmptyState");

  if (!courses.length) {
    container.innerHTML = "";
    if (emptyState) emptyState.classList.remove("hidden");
    return;
  }

  if (emptyState) emptyState.classList.add("hidden");

  container.innerHTML = courses.map((course, index) => {
    const courseCredit = Number(course.credit) || 0;
    const courseGrade = Number(course.grade) || 0;
    const coursePoints = (courseCredit * courseGrade).toFixed(2);

    const gradeOptionsHtml = GRADE_OPTIONS.map((opt) => {
      const isSelected = Math.abs(opt.value - courseGrade) < 0.05;
      return `<option value="${opt.value}" ${isSelected ? "selected" : ""}>${opt.label}</option>`;
    }).join("");

    return `
      <article class="task gpa-task-item">
        <div class="summary-icon violet" style="width: 32px; height: 32px; font-size: 13px; border-radius: 9px; flex-shrink: 0;">✦</div>
        <div>
          <div class="task-title">${escapeHtml(course.name)}</div>
          <div class="task-meta">${coursePoints} points (${courseCredit} cr × ${courseGrade.toFixed(2)})</div>
        </div>
        <span class="tag low">${courseCredit} cr</span>
        <select class="course-grade-select" data-change-grade="${index}" aria-label="Change grade">
          ${gradeOptionsHtml}
        </select>
        <button class="delete-button" data-delete-course="${index}" aria-label="Remove course">×</button>
      </article>
    `;
  }).join("");
}
function saveCourses() { localStorage.setItem("edutrack_courses", JSON.stringify(courses)); renderGpa(); }

async function handleGpaFileUpload(file) {
  if (!file) return;

  const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
  const isPdfOrImg = validTypes.includes(file.type) || /\.(pdf|png|jpe?g|webp)$/i.test(file.name);

  if (!isPdfOrImg) {
    showToast("Please upload a PDF or image file (PNG, JPG, WEBP).");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    showToast("File size exceeds 10MB limit.");
    return;
  }

  const dropZone = $("#gpaDropZone");
  const loading = $("#gpaLoading");
  const loadingText = $("#gpaLoadingText");

  if (dropZone) dropZone.classList.add("hidden");
  if (loading) loading.classList.remove("hidden");
  if (loadingText) loadingText.textContent = `Analyzing ${file.name}...`;

  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("/api/gpa/parse", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to extract courses from document.");
    }

    if (data.courses && data.courses.length > 0) {
      courses = data.courses;
      saveCourses();
      showToast(`Extracted ${data.courses.length} courses! GPA: ${data.summary.gpa}`);
    } else {
      showToast("No courses detected. Try manual entry or a clearer document.");
    }
  } catch (error) {
    showToast(error.message);
  } finally {
    if (loading) loading.classList.add("hidden");
    if (dropZone) dropZone.classList.remove("hidden");
    const fileInput = $("#gpaFileInput");
    if (fileInput) fileInput.value = "";
  }
}

function setAuthState() { $("#authOverlay").classList.toggle("hidden", Boolean(user)); $("#logoutBtn").classList.toggle("hidden", !user); $("#welcome").textContent = user ? `Hi, ${user.name.split(" ")[0]}` : ""; }
function logout() { localStorage.removeItem("edutrack_user"); user = null; tasks = []; notes = []; renderTasks(); renderNotes(); setAuthState(); }
function setView(view) { activeView = view; document.querySelectorAll(".view").forEach((item) => item.classList.toggle("active", item.id === `${view}View`)); document.querySelectorAll(".nav-link").forEach((item) => item.classList.toggle("active", item.dataset.view === view)); if (view === "notes") loadNotes(); }
function setTheme(theme) { document.body.classList.toggle("dark", theme === "dark"); localStorage.setItem("edutrack_theme", theme); $("#themeBtn").textContent = theme === "dark" ? "☀" : "☾"; }

$("#authForm").addEventListener("submit", async (event) => { event.preventDefault(); const button = $("#authSubmit"); button.disabled = true; $("#authMessage").textContent = ""; const payload = { email: $("#emailInput").value.trim(), password: $("#passwordInput").value }; if (authMode === "register") payload.name = $("#nameInput").value.trim(); try { user = await request(`/auth/${authMode}`, { method: "POST", body: JSON.stringify(payload) }); localStorage.setItem("edutrack_user", JSON.stringify(user)); setAuthState(); loadTasks(); showToast(`Welcome, ${user.name.split(" ")[0]}!`); } catch (error) { $("#authMessage").textContent = error.message; } finally { button.disabled = false; button.textContent = authMode === "login" ? "Sign in to EduTrack" : "Create my account"; } });
$("#taskForm").addEventListener("submit", async (event) => { event.preventDefault(); const id = $("#taskId").value, button = $("#saveTaskBtn"); button.disabled = true; const payload = { title: $("#taskTitle").value.trim(), subject: $("#taskSubject").value.trim(), dueDate: $("#taskDate").value, priority: $("#taskPriority").value, notes: $("#taskNotes").value.trim() }; try { const saved = await request(`/tasks${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(payload) }); tasks = id ? tasks.map((task) => task._id === id ? saved : task) : [...tasks, saved]; tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)); renderTasks(); closeTask(); showToast(id ? "Task updated." : "Task added to your plan."); } catch (error) { $("#taskMessage").textContent = error.message; } finally { button.disabled = false; } });
$("#noteForm").addEventListener("submit", async (event) => { event.preventDefault(); const id = $("#noteId").value, button = $("#saveNoteBtn"); button.disabled = true; const payload = { title: $("#noteTitle").value.trim(), content: $("#noteContent").value.trim() }; try { const saved = await request(`/notes${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(payload) }); notes = id ? notes.map((note) => note._id === id ? saved : note) : [saved, ...notes]; renderNotes(); closeNote(); showToast(id ? "Note updated." : "Note saved."); } catch (error) { $("#noteMessage").textContent = error.message; } finally { button.disabled = false; } });
$("#courseForm").addEventListener("submit", (event) => { event.preventDefault(); const select = $("#courseGrade"), option = select.selectedOptions[0]; courses.push({ name: $("#courseName").value.trim(), credit: Number($("#courseCredit").value), grade: Number(select.value), label: option.textContent }); event.target.reset(); saveCourses(); showToast("Course added."); });

document.addEventListener("change", (event) => {
  const gradeSelect = event.target.closest("[data-change-grade]");
  if (gradeSelect) {
    const index = Number(gradeSelect.dataset.changeGrade);
    if (courses[index]) {
      courses[index].grade = Number(gradeSelect.value);
      const option = gradeSelect.selectedOptions[0];
      if (option) courses[index].label = option.textContent;
      saveCourses();
    }
  }
});

document.addEventListener("click", async (event) => { const complete = event.target.closest("[data-complete]"), edit = event.target.closest("[data-edit]"), delTask = event.target.closest("[data-delete-task]"), editNote = event.target.closest("[data-edit-note]"), delNote = event.target.closest("[data-delete-note]"), delCourse = event.target.closest("[data-delete-course]"); if (complete) { const task = tasks.find((item) => item._id === complete.dataset.complete); try { const updated = await request(`/tasks/${task._id}`, { method: "PUT", body: JSON.stringify({ completed: !task.completed }) }); tasks = tasks.map((item) => item._id === updated._id ? updated : item); renderTasks(); } catch (error) { showToast(error.message); } } if (edit) openTask(tasks.find((item) => item._id === edit.dataset.edit)); if (delTask && confirm("Delete this task?")) { try { await request(`/tasks/${delTask.dataset.deleteTask}`, { method: "DELETE" }); tasks = tasks.filter((task) => task._id !== delTask.dataset.deleteTask); renderTasks(); showToast("Task deleted."); } catch (error) { showToast(error.message); } } if (editNote) openNote(notes.find((note) => note._id === editNote.dataset.editNote)); if (delNote && confirm("Delete this note?")) { try { await request(`/notes/${delNote.dataset.deleteNote}`, { method: "DELETE" }); notes = notes.filter((note) => note._id !== delNote.dataset.deleteNote); renderNotes(); showToast("Note deleted."); } catch (error) { showToast(error.message); } } if (delCourse) { courses.splice(Number(delCourse.dataset.deleteCourse), 1); saveCourses(); showToast("Course removed."); } if (event.target.matches("[data-open-task]")) openTask(); if (event.target.matches("[data-close-task]") || event.target === $("#taskModal")) closeTask(); if (event.target.matches("[data-close-note]") || event.target === $("#noteModal")) closeNote(); });

const dropZone = $("#gpaDropZone");
const fileInput = $("#gpaFileInput");
const browseBtn = $("#browseFileBtn");
if (dropZone && fileInput) {
  dropZone.addEventListener("click", () => fileInput.click());
  if (browseBtn) browseBtn.addEventListener("click", (e) => { e.stopPropagation(); fileInput.click(); });
  dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
  dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("dragover");
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleGpaFileUpload(e.dataTransfer.files[0]);
    }
  });
  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) {
      handleGpaFileUpload(e.target.files[0]);
    }
  });
}

$("#toggleManualFormBtn")?.addEventListener("click", () => {
  const form = $("#courseForm");
  form.classList.toggle("hidden");
  if (!form.classList.contains("hidden")) {
    $("#courseName").focus();
  }
});

$("#clearCoursesBtn")?.addEventListener("click", () => {
  if (!courses.length) return;
  if (confirm("Clear all courses?")) {
    courses = [];
    saveCourses();
    showToast("All courses cleared.");
  }
});

$("#newTaskBtn").addEventListener("click", () => user ? openTask() : $("#authOverlay").classList.remove("hidden")); $("#newNoteBtn").addEventListener("click", () => user ? openNote() : $("#authOverlay").classList.remove("hidden")); $("#logoutBtn").addEventListener("click", logout); $("#timerStart").addEventListener("click", toggleTimer); $("#timerReset").addEventListener("click", resetTimer); $("#themeBtn").addEventListener("click", () => setTheme(document.body.classList.contains("dark") ? "light" : "dark")); document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => { filter = button.dataset.filter; document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("active", item === button)); renderTasks(); })); document.querySelectorAll(".auth-tab").forEach((button) => button.addEventListener("click", () => { authMode = button.dataset.auth; document.querySelectorAll(".auth-tab").forEach((item) => item.classList.toggle("active", item === button)); $("#nameField").classList.toggle("hidden", authMode === "login"); $("#authSubmit").textContent = authMode === "login" ? "Sign in to EduTrack" : "Create my account"; })); document.querySelectorAll(".nav-link").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
setToday(); setTheme(localStorage.getItem("edutrack_theme") || "light"); setAuthState(); renderTimer(); renderGpa(); renderNotes(); if (user) loadTasks(); else renderTasks();
