const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const { uploadMissing, handleUploadError } = require("../middleware/uploadMiddleware");

// User registration
router.post("/register", userController.register);

// User login
router.post("/login", userController.login);

//REPORT MISSING PERSON
router.post(
    "/report-missing",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("user"),
    (req, res, next) => {
        uploadMissing.single("photo")(req, res, (err) => handleUploadError(err, req, res, next));
    },
    userController.reportMissing
);

// GET USER CASES
router.get(
    "/my-cases",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("user"),
    userController.getUserCases
);

// UPDATE PROFILE
router.put(
    "/profile",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("user"),
    userController.updateProfile
);

// DELETE CASE
router.delete(
    "/case/:caseId",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("user"),
    userController.deleteCase
);

// GET NOTIFICATIONS
router.get(
    "/notifications",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("user"),
    userController.getNotifications
);

// MARK NOTIFICATION AS READ
router.post(
    "/notifications/:notificationId/read",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("user"),
    userController.markNotificationAsRead
);

//GET SINGLE CASE
router.get(
    "/case/:caseId",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("user"),
    userController.getCaseById
);

// GET POLICE STATIONS (for missing report dropdown)
router.get(
    "/police-stations",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("user"),
    userController.getPoliceStations
);


module.exports = router;