// backend-api/routes/adminRoutes.js
const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");
const authMiddleware = require("../middleware/authMiddleware");

// -------------------------------------------------
// Setup Admin (initial setup)
// -------------------------------------------------
router.post("/setup-admin", adminController.setupAdmin);

// -------------------------------------------------
// Admin Login
// -------------------------------------------------
router.post("/login", adminController.adminLogin);

// -------------------------------------------------
// Get all cases
// -------------------------------------------------
router.get(
    "/all-cases",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("admin"),
    adminController.getAllCases
);

// -------------------------------------------------
// Get all users
// -------------------------------------------------
router.get(
    "/users",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("admin"),
    adminController.getAllUsers
);

// -------------------------------------------------
// Get all police stations
// -------------------------------------------------
router.get(
    "/police",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("admin"),
    adminController.getAllPolice
);

// -------------------------------------------------
// Create a police station
// -------------------------------------------------
router.post(
    "/create-police",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("admin"),
    adminController.createPolice
);

// -------------------------------------------------
// Delete a missing case
// -------------------------------------------------
router.delete(
    "/case/:caseId",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("admin"),
    adminController.deleteCase
);

module.exports = router;