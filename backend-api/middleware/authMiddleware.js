const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;


// Verify JWT token
exports.verifyToken = (req, res, next) => {

    const authHeader = req.headers["authorization"];

    if (!authHeader) {
        return res.status(401).json({ error: "Token required" });
    }

    const token = authHeader.split(" ")[1];

    try {

        const decoded = jwt.verify(token, JWT_SECRET);

        req.user = decoded;

        next();

    } catch (err) {
        return res.status(401).json({ error: "Invalid token" });
    }
};


// Role based access control
exports.requireRole = (role) => {

    return (req, res, next) => {

        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (req.user.role !== role) {
            return res.status(403).json({ error: "Access denied" });
        }

        next();
    };
};