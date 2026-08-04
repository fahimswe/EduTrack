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
function renderGpa() { const credits = courses.reduce((sum, c) => sum + c.credit, 0), points = courses.reduce((sum, c) => sum + c.credit * c.grade, 0); $("#gpaValue").textContent = credits ? (points / credits).toFixed(2) : "0.00"; $("#gpaCredits").textContent = `${credits} total credits`; $("#courseList").innerHTML = courses.map((course, index) => `<div class="course-row"><strong>${escapeHtml(course.name)}</strong><span>${course.credit} credits · ${course.label}</span><button class="delete-button" data-delete-course="${index}" aria-label="Remove course">×</button></div>`).join(""); }
function saveCourses() { localStorage.setItem("edutrack_courses", JSON.stringify(courses)); renderGpa(); }

function setAuthState() { $("#authOverlay").classList.toggle("hidden", Boolean(user)); $("#logoutBtn").classList.toggle("hidden", !user); $("#welcome").textContent = user ? `Hi, ${user.name.split(" ")[0]}` : ""; }
function logout() { localStorage.removeItem("edutrack_user"); user = null; tasks = []; notes = []; renderTasks(); renderNotes(); setAuthState(); }
function setView(view) { activeView = view; document.querySelectorAll(".view").forEach((item) => item.classList.toggle("active", item.id === `${view}View`)); document.querySelectorAll(".nav-link").forEach((item) => item.classList.toggle("active", item.dataset.view === view)); if (view === "notes") loadNotes(); }
function setTheme(theme) { document.body.classList.toggle("dark", theme === "dark"); localStorage.setItem("edutrack_theme", theme); $("#themeBtn").textContent = theme === "dark" ? "☀" : "☾"; }

$("#authForm").addEventListener("submit", async (event) => { event.preventDefault(); const button = $("#authSubmit"); button.disabled = true; $("#authMessage").textContent = ""; const payload = { email: $("#emailInput").value.trim(), password: $("#passwordInput").value }; if (authMode === "register") payload.name = $("#nameInput").value.trim(); try { user = await request(`/auth/${authMode}`, { method: "POST", body: JSON.stringify(payload) }); localStorage.setItem("edutrack_user", JSON.stringify(user)); setAuthState(); loadTasks(); showToast(`Welcome, ${user.name.split(" ")[0]}!`); } catch (error) { $("#authMessage").textContent = error.message; } finally { button.disabled = false; button.textContent = authMode === "login" ? "Sign in to EduTrack" : "Create my account"; } });
$("#taskForm").addEventListener("submit", async (event) => { event.preventDefault(); const id = $("#taskId").value, button = $("#saveTaskBtn"); button.disabled = true; const payload = { title: $("#taskTitle").value.trim(), subject: $("#taskSubject").value.trim(), dueDate: $("#taskDate").value, priority: $("#taskPriority").value, notes: $("#taskNotes").value.trim() }; try { const saved = await request(`/tasks${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(payload) }); tasks = id ? tasks.map((task) => task._id === id ? saved : task) : [...tasks, saved]; tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)); renderTasks(); closeTask(); showToast(id ? "Task updated." : "Task added to your plan."); } catch (error) { $("#taskMessage").textContent = error.message; } finally { button.disabled = false; } });
$("#noteForm").addEventListener("submit", async (event) => { event.preventDefault(); const id = $("#noteId").value, button = $("#saveNoteBtn"); button.disabled = true; const payload = { title: $("#noteTitle").value.trim(), content: $("#noteContent").value.trim() }; try { const saved = await request(`/notes${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(payload) }); notes = id ? notes.map((note) => note._id === id ? saved : note) : [saved, ...notes]; renderNotes(); closeNote(); showToast(id ? "Note updated." : "Note saved."); } catch (error) { $("#noteMessage").textContent = error.message; } finally { button.disabled = false; } });
$("#courseForm").addEventListener("submit", (event) => { event.preventDefault(); const select = $("#courseGrade"), option = select.selectedOptions[0]; courses.push({ name: $("#courseName").value.trim(), credit: Number($("#courseCredit").value), grade: Number(select.value), label: option.textContent }); event.target.reset(); saveCourses(); });
document.addEventListener("click", async (event) => { const complete = event.target.closest("[data-complete]"), edit = event.target.closest("[data-edit]"), delTask = event.target.closest("[data-delete-task]"), editNote = event.target.closest("[data-edit-note]"), delNote = event.target.closest("[data-delete-note]"), delCourse = event.target.closest("[data-delete-course]"); if (complete) { const task = tasks.find((item) => item._id === complete.dataset.complete); try { const updated = await request(`/tasks/${task._id}`, { method: "PUT", body: JSON.stringify({ completed: !task.completed }) }); tasks = tasks.map((item) => item._id === updated._id ? updated : item); renderTasks(); } catch (error) { showToast(error.message); } } if (edit) openTask(tasks.find((item) => item._id === edit.dataset.edit)); if (delTask && confirm("Delete this task?")) { try { await request(`/tasks/${delTask.dataset.deleteTask}`, { method: "DELETE" }); tasks = tasks.filter((task) => task._id !== delTask.dataset.deleteTask); renderTasks(); showToast("Task deleted."); } catch (error) { showToast(error.message); } } if (editNote) openNote(notes.find((note) => note._id === editNote.dataset.editNote)); if (delNote && confirm("Delete this note?")) { try { await request(`/notes/${delNote.dataset.deleteNote}`, { method: "DELETE" }); notes = notes.filter((note) => note._id !== delNote.dataset.deleteNote); renderNotes(); showToast("Note deleted."); } catch (error) { showToast(error.message); } } if (delCourse) { courses.splice(Number(delCourse.dataset.deleteCourse), 1); saveCourses(); } if (event.target.matches("[data-open-task]")) openTask(); if (event.target.matches("[data-close-task]") || event.target === $("#taskModal")) closeTask(); if (event.target.matches("[data-close-note]") || event.target === $("#noteModal")) closeNote(); });
$("#newTaskBtn").addEventListener("click", () => user ? openTask() : $("#authOverlay").classList.remove("hidden")); $("#newNoteBtn").addEventListener("click", () => user ? openNote() : $("#authOverlay").classList.remove("hidden")); $("#logoutBtn").addEventListener("click", logout); $("#timerStart").addEventListener("click", toggleTimer); $("#timerReset").addEventListener("click", resetTimer); $("#themeBtn").addEventListener("click", () => setTheme(document.body.classList.contains("dark") ? "light" : "dark")); document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => { filter = button.dataset.filter; document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("active", item === button)); renderTasks(); })); document.querySelectorAll(".auth-tab").forEach((button) => button.addEventListener("click", () => { authMode = button.dataset.auth; document.querySelectorAll(".auth-tab").forEach((item) => item.classList.toggle("active", item === button)); $("#nameField").classList.toggle("hidden", authMode === "login"); $("#authSubmit").textContent = authMode === "login" ? "Sign in to EduTrack" : "Create my account"; })); document.querySelectorAll(".nav-link").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
setToday(); setTheme(localStorage.getItem("edutrack_theme") || "light"); setAuthState(); renderTimer(); renderGpa(); renderNotes(); if (user) loadTasks(); else renderTasks();
