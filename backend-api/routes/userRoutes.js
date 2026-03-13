const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");

// User registration
router.post("/register", userController.register);

// User login
router.post("/login", userController.login);

//REPORT MISSING PERSON
router.post(
    "/report-missing",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("user"),
    upload.single("photo"),
    userController.reportMissing
);


// GET USER CASES
router.get(
    "/my-cases",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("user"),
    userController.getUserCases
);

//GET SINGLE CASE
router.get(
    "/case/:caseId",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("user"),
    userController.getCaseById
);


module.exports = router;