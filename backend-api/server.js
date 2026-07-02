const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");

const userRoutes = require("./routes/userRoutes");
const policeRoutes = require("./routes/policeRoutes");
const adminRoutes = require("./routes/adminRoutes");
const matchRoutes = require("./routes/matchRoutes");

const app = express();

const PORT = Number(process.env.PORT) || 5000;

// Basic CORS headers without external dependency.
app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
	res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-setup-key");

	if (req.method === "OPTIONS") {
		return res.sendStatus(204);
	}

	next();
});

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/health", (req, res) => {
	res.json({
		status: "ok",
		service: "backend-api",
		timestamp: new Date().toISOString()
	});
});

// Route mounting (primary)
app.use("/user", userRoutes);
app.use("/police", policeRoutes);
app.use("/admin", adminRoutes);
app.use("/match", matchRoutes);

// Optional /api aliases for compatibility with frontend env prefix.
app.use("/api/user", userRoutes);
app.use("/api/police", policeRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/match", matchRoutes);

app.get("/", (req, res) => {
	res.json({
		message: "Face Recognition backend API is running",
		routes: ["/user", "/police", "/admin", "/match", "/health"]
	});
});

app.use((err, req, res, next) => {
	if (err && err.name === "MulterError") {
		if (err.code === "LIMIT_FILE_SIZE") {
			return res.status(400).json({ error: "File too large. Max size is 5MB" });
		}
		return res.status(400).json({ error: err.message });
	}

	if (err) {
		return res.status(500).json({ error: err.message || "Internal server error" });
	}

	return next();
});

app.use((req, res) => {
	res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
	console.log(`[BACKEND API] running on http://localhost:${PORT}`);
});

module.exports = app;