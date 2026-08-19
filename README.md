# EduTrack

EduTrack is a personal study-management web application built with the MERN stack. It helps students plan academic tasks, keep study notes, focus with a Pomodoro timer, and calculate their GPA from course credits and grades.

## Features

- Secure account registration and sign-in using JWT authentication
- Personal task planner: add, edit, complete, filter, and delete tasks
- Task priorities, subjects, due dates, reminders, overdue indicators, and progress summaries
- Notes management: create, edit, and delete personal study notes
- 25-minute Pomodoro timer with start, pause, and reset controls
- GPA calculator with course, credit, and grade inputs
- Light and dark themes; the selected theme and GPA entries are saved in browser storage
- Responsive layout for desktop and mobile screens

## Technology Stack

| Area | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Authentication | JSON Web Tokens (JWT), bcryptjs |

## Project Structure

```text
EduTrack/
├── client/                  # Browser interface
│   ├── index.html
│   ├── app.js
│   └── styles.css
└── server/                  # Express API
    ├── config/              # MongoDB connection
    ├── controllers/         # Authentication, task, and note logic
    ├── middleware/          # JWT protection middleware
    ├── models/              # User, Task, and Note schemas
    ├── routes/              # API route definitions
    ├── .env.example
    └── server.js
```

## Installation and Setup

### Prerequisites

- Node.js 18 or newer
- A MongoDB database (MongoDB Atlas or local MongoDB)

### 1. Clone the repository

```bash
git clone https://github.com/fahimswe/EduTrack.git
cd EduTrack
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure environment variables

Create a `server/.env` file based on `server/.env.example`:

```env
MONGO_URI=mongodb+srv://your-connection-string
JWT_SECRET=replace-with-a-long-random-secret
PORT=5000
```

Never commit the real `.env` file or database credentials.

### 4. Run the app

From the `server` folder:

```bash
npm start
```

For development with automatic restarts:

```bash
npm run dev
```

Open [http://localhost:5000](http://localhost:5000) in your browser. Express serves the client automatically.

## Demonstration Flow

1. Create an account, then sign in.
2. Add tasks with a subject, due date, priority, and optional reminder.
3. Edit a task, mark it complete, apply a filter, and delete a task.
4. Open **Notes** and create, edit, and delete a study note.
5. Open **Focus** and start, pause, and reset the 25-minute Pomodoro timer.
6. Open **GPA**, add courses and grades, and show the automatic calculation.
7. Use the moon/sun control in the top bar to demonstrate dark mode.

## API Reference

All task and note endpoints require an authorization header:

```http
Authorization: Bearer <JWT_TOKEN>
```

| Method | Endpoint | Description | Authentication |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Register a new user | No |
| POST | `/api/auth/login` | Sign in and receive a token | No |
| GET | `/api/auth/me` | Get the current user | Yes |
| GET | `/api/tasks` | Get the signed-in user's tasks | Yes |
| POST | `/api/tasks` | Create a task | Yes |
| PUT | `/api/tasks/:id` | Update a task or completion status | Yes |
| DELETE | `/api/tasks/:id` | Delete a task | Yes |
| GET | `/api/notes` | Get the signed-in user's notes | Yes |
| POST | `/api/notes` | Create a note | Yes |
| PUT | `/api/notes/:id` | Update a note | Yes |
| DELETE | `/api/notes/:id` | Delete a note | Yes |
| GET | `/api/gpa` | Get the signed-in user's saved GPA & courses | Yes |
| PUT | `/api/gpa` | Save/update user's courses and GPA | Yes |
| POST | `/api/gpa/parse` | Parse grade sheet / transcript (PDF or Image) | No |

## Data Models

**User:** name, email, password (hashed)

**Task:** title, subject, due date, priority, notes, completion status, owner

**Note:** title, content, owner

**Gpa:** user (owner), courses (name, credit, grade, label), gpa, totalCredits, totalPoints

## Contributors

- Fahim Ahmed — 220042109
- Prince Fahim Al Araf — 220042149
- Nafis Reza — 220042168

## License

This project is created for academic purposes.
