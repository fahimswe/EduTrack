const api = "/api";
let tasks = [];
let filter = "all";
let authMode = "login";
let user = JSON.parse(localStorage.getItem("edutrack_user") || "null");

const $ = (selector) => document.querySelector(selector);
const today = new Date();
const dateKey = (date) => new Date(date).toISOString().slice(0, 10);
const sameDay = (date, compare = today) => dateKey(date) === dateKey(compare);
const formatDate = (date) => new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(date));

function setToday() {
  $("#dateDay").textContent = String(today.getDate()).padStart(2, "0");
  $("#dateMonth").textContent = today.toLocaleDateString("en", { month: "long" }).toUpperCase();
  $("#dateWeekday").textContent = today.toLocaleDateString("en", { weekday: "long" }).toUpperCase();
}

function request(path, options = {}) {
  return fetch(`${api}${path}`, { ...options, headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token || ""}`, ...options.headers } })
    .then(async (response) => {
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || "Something went wrong. Please try again.");
      return body;
    });
}

function showToast(message) {
  const toast = $("#toast"); toast.textContent = message; toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2700);
}

function renderSummary() {
  const open = tasks.filter((task) => !task.completed);
  const soon = open.filter((task) => { const days = (new Date(task.dueDate) - today) / 86400000; return days >= -1 && days < 7; });
  const done = tasks.filter((task) => task.completed).length;
  const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  $("#todoCount").textContent = open.length; $("#soonCount").textContent = soon.length; $("#doneCount").textContent = done;
  $("#progressValue").textContent = `${percent}%`; $(".ring").style.setProperty("--progress", `${percent}%`);
  $("#progressText").textContent = percent === 100 && tasks.length ? "Everything is complete!" : percent ? `${done} of ${tasks.length} tasks complete.` : "Start with one task today.";
}

function visibleTasks() {
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (filter === "today") return tasks.filter((task) => sameDay(task.dueDate));
  if (filter === "upcoming") return tasks.filter((task) => new Date(task.dueDate) > tomorrow && !task.completed);
  if (filter === "completed") return tasks.filter((task) => task.completed);
  return tasks;
}

function renderTasks() {
  const list = $("#taskList"); const shown = visibleTasks(); list.innerHTML = "";
  $("#emptyState").classList.toggle("hidden", shown.length > 0);
  shown.forEach((task) => {
    const due = new Date(task.dueDate); const overdue = !task.completed && due < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const card = document.createElement("article"); card.className = `task ${task.completed ? "done" : ""}`;
    card.innerHTML = `<button class="check" data-complete="${task._id}" aria-label="Mark ${task.title} complete">${task.completed ? "✓" : ""}</button><div><div class="task-title">${escapeHtml(task.title)}</div><div class="task-meta">${escapeHtml(task.subject)}${task.notes ? ` · ${escapeHtml(task.notes)}` : ""}</div></div><span class="tag ${task.priority}">${task.priority}</span><div class="task-date ${overdue ? "overdue" : ""}">${overdue ? "Overdue · " : ""}${formatDate(due)}</div><button class="more" data-edit="${task._id}" aria-label="Edit ${task.title}">⋯</button>`;
    list.appendChild(card);
  });
  renderSummary();
}

function escapeHtml(value) { const element = document.createElement("div"); element.textContent = value; return element.innerHTML; }

async function loadTasks() {
  if (!user) return;
  try { tasks = await request("/tasks"); renderTasks(); }
  catch (error) { showToast(error.message); if (error.message.includes("Not authorized")) logout(); }
}

function openTask(task) {
  $("#taskForm").reset(); $("#taskMessage").textContent = "";
  $("#taskId").value = task?._id || ""; $("#modalEyebrow").textContent = task ? "EDIT TASK" : "NEW TASK";
  $("#modalTitle").textContent = task ? "A few small changes." : "What needs your attention?";
  $("#saveTaskBtn").textContent = task ? "Save changes" : "Save task";
  if (task) { $("#taskTitle").value = task.title; $("#taskSubject").value = task.subject; $("#taskDate").value = dateKey(task.dueDate); $("#taskPriority").value = task.priority; $("#taskNotes").value = task.notes || ""; }
  else $("#taskDate").value = dateKey(today);
  $("#taskModal").classList.remove("hidden"); $("#taskModal").setAttribute("aria-hidden", "false"); $("#taskTitle").focus();
}
function closeTask() { $("#taskModal").classList.add("hidden"); $("#taskModal").setAttribute("aria-hidden", "true"); }

function setAuthState() {
  $("#authOverlay").classList.toggle("hidden", Boolean(user)); $("#logoutBtn").classList.toggle("hidden", !user);
  $("#welcome").textContent = user ? `Hi, ${user.name.split(" ")[0]}` : "";
}
function logout() { localStorage.removeItem("edutrack_user"); user = null; tasks = []; renderTasks(); setAuthState(); }

$("#authForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const button = $("#authSubmit"); const message = $("#authMessage"); message.textContent = ""; button.disabled = true; button.textContent = "Just a moment…";
  const payload = { email: $("#emailInput").value.trim(), password: $("#passwordInput").value };
  if (authMode === "register") payload.name = $("#nameInput").value.trim();
  try { user = await request(`/auth/${authMode === "login" ? "login" : "register"}`, { method: "POST", body: JSON.stringify(payload) }); localStorage.setItem("edutrack_user", JSON.stringify(user)); setAuthState(); loadTasks(); showToast(`Welcome${authMode === "register" ? " to EduTrack" : " back"}, ${user.name.split(" ")[0]}!`); }
  catch (error) { message.textContent = error.message; }
  finally { button.disabled = false; button.textContent = authMode === "login" ? "Sign in to EduTrack" : "Create my account"; }
});

$("#taskForm").addEventListener("submit", async (event) => {
  event.preventDefault(); const id = $("#taskId").value; const button = $("#saveTaskBtn"); button.disabled = true;
  const payload = { title: $("#taskTitle").value.trim(), subject: $("#taskSubject").value.trim(), dueDate: $("#taskDate").value, priority: $("#taskPriority").value, notes: $("#taskNotes").value.trim() };
  try { const saved = await request(`/tasks${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(payload) }); tasks = id ? tasks.map((task) => task._id === id ? saved : task) : [...tasks, saved]; tasks.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)); renderTasks(); closeTask(); showToast(id ? "Task updated." : "Task added to your plan."); }
  catch (error) { $("#taskMessage").textContent = error.message; } finally { button.disabled = false; }
});

document.addEventListener("click", async (event) => {
  const complete = event.target.closest("[data-complete]"); const edit = event.target.closest("[data-edit]");
  if (complete) { const task = tasks.find((item) => item._id === complete.dataset.complete); try { const updated = await request(`/tasks/${task._id}`, { method: "PUT", body: JSON.stringify({ completed: !task.completed }) }); tasks = tasks.map((item) => item._id === updated._id ? updated : item); renderTasks(); showToast(updated.completed ? "Task completed — lovely work!" : "Task moved back to your list."); } catch (error) { showToast(error.message); } }
  if (edit) openTask(tasks.find((item) => item._id === edit.dataset.edit));
  if (event.target.matches("[data-open-task]")) openTask(); if (event.target.matches("[data-close-task]") || event.target === $("#taskModal")) closeTask();
});

$("#newTaskBtn").addEventListener("click", () => user ? openTask() : $("#authOverlay").classList.remove("hidden"));
$("#logoutBtn").addEventListener("click", logout);
document.querySelectorAll(".filter").forEach((button) => button.addEventListener("click", () => { filter = button.dataset.filter; document.querySelectorAll(".filter").forEach((item) => item.classList.toggle("active", item === button)); renderTasks(); }));
document.querySelectorAll(".auth-tab").forEach((button) => button.addEventListener("click", () => { authMode = button.dataset.auth; document.querySelectorAll(".auth-tab").forEach((item) => item.classList.toggle("active", item === button)); $("#nameField").classList.toggle("hidden", authMode === "login"); $("#authSubmit").textContent = authMode === "login" ? "Sign in to EduTrack" : "Create my account"; $("#authMessage").textContent = ""; }));

setToday(); setAuthState(); if (user) loadTasks(); else renderTasks();
