const express = require('express');
const router = express.Router();

const policeController = require('../controllers/policeController');
const authMiddleware = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');


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




module.exports = router;