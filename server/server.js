require("dotenv").config();

const taskRoutes = require("./routes/taskRoutes");
const express = require("express");
const cors = require("cors");
const path = require("path");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "client")));

app.get("/", (req, res) => {
    res.send("EduTrack API Running");
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);

app.get("*splat", (req, res) => {
    res.sendFile(path.join(__dirname, "..", "client", "index.html"));
});

const startServer = async () => {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`Server Running on Port ${PORT}`);
        });
    } catch (error) {
        console.error("Server startup failed:", error.message);
        process.exit(1);
    }
};

startServer();
