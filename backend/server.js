const express = require("express");
require("dotenv").config(); // 👈 THIS LINE FIXES EVERYTHING

const app = express();

const PORT = process.env.PORT;

app.get("/", (req, res) => {
    res.send("Server running");
});

app.listen(PORT, () => {
    console.log(` Server running at http://localhost:${PORT}`);
});
