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


module.exports = router;