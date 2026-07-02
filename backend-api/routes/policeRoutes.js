const express = require('express');
const router = express.Router();

const policeController = require('../controllers/policeController');
const authMiddleware = require('../middleware/authMiddleware');


// POLICE LOGIN
router.post("/login", policeController.login);


// GET CASES FOR POLICE STATION
router.get(
    "/cases",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("police"),
    policeController.getCases
);


// GET SINGLE CASE
router.get(
    "/case/:caseId",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("police"),
    policeController.getCaseDetails
);




// UPDATE POLICE PROFILE
router.put(
    "/profile",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("police"),
    policeController.updateProfile
);

// GET NOTIFICATIONS
router.get(
    "/notifications",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("police"),
    policeController.getNotifications
);

// MARK NOTIFICATION AS READ
router.post(
    "/notifications/:notificationId/read",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("police"),
    policeController.markNotificationAsRead
);

// UPDATE CASE STATUS
router.put(
    "/case/:caseId/status",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("police"),
    policeController.updateCaseStatus
);

module.exports = router;