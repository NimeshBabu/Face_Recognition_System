const jwt = require("jsonwebtoken");

// You can also put this in .env
const SECRET_KEY = process.env.JWT_SECRET || "super_secret_key";

// Generate JWT token
exports.generateToken = (user_id, role) => {
    return jwt.sign(
        {
            user_id,
            role,
        },
        SECRET_KEY,
        { expiresIn: "8h" } // same as Python version
    );
};

// Verify JWT token
exports.verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        return decoded; // { user_id, role, iat, exp }
    } catch (err) {
        return null; // expired or invalid
    }
};