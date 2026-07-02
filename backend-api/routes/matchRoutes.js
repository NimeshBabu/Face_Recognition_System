const express = require("express");
const router = express.Router();

const matchController = require("../controllers/matchController");
const authMiddleware = require("../middleware/authMiddleware");
const { uploadFound } = require("../middleware/uploadMiddleware");


// Run AI matching when police uploads a found person
router.post(
    "/match-found",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("police"),
    uploadFound.single("photo"),
    matchController.matchFound
);


// Confirm match
router.post(
    "/confirm-match",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("police"),
    matchController.confirmMatch
);


// Reject match
router.post(
    "/reject-match",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("police"),
    matchController.rejectMatch
);


// Notify owner station of cross-station match suggestion
router.post(
    "/notify-owner",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("police"),
    matchController.notifyOwner
);


router.post(
    "/notify-owners-bulk",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("police"),
    matchController.notifyAllOwners
);


// Fetch a single match log by ID (used for notification deep-linking)
router.get(
    "/log/:logId",
    authMiddleware.verifyToken,
    authMiddleware.requireRole("police"),
    matchController.getMatchLogById
);

module.exports = router;