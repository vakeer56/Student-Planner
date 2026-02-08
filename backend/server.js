const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const mongoose = require("mongoose");


const studySessionRoutes = require("./routes/studySession.routes");
const googleRoutes = require("./routes/google.routes");

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get("/", (req, res) => {
    res.send("Server running");
});

app.use("/api/study-sessions", studySessionRoutes);
app.use("/auth", googleRoutes);

app.use((err, req, res, next) => {
    console.error("Global Error Handler:", err);
    res.status(500).json({ message: "Internal server error from global handler", error: err.message });
});



mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("MongoDB connection error:", err));

app.listen(PORT, () => {
    console.log(` Server running at http://localhost:${PORT}`);
});
