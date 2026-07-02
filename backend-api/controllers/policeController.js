const bcrypt = require("bcryptjs");
const db = require("../config/firebaseConfig");
const { generateToken } = require("../services/authService");

const toPublicPhotoUrl = (req, storedImagePath) => {
    if (!storedImagePath) {
        return null;
    }

    const normalizedPath = String(storedImagePath).replace(/\\/g, "/");
    const marker = "/uploads/";
    const markerIndex = normalizedPath.lastIndexOf(marker);

    if (markerIndex < 0) {
        return null;
    }

    const uploadPath = normalizedPath.slice(markerIndex);
    return `${req.protocol}://${req.get("host")}${uploadPath}`;
};


// ------------------------------------------------
// POLICE LOGIN
// ------------------------------------------------
exports.login = async (req, res) => {
    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password required" });
        }

        const snapshot = await db
            .collection("police_stations")
            .where("email", "==", email)
            .limit(1)
            .get();

        if (snapshot.empty) {
            return res.status(401).json({ error: "Police station not found" });
        }

        const doc = snapshot.docs[0];
        const police = doc.data();

        const validPassword = await bcrypt.compare(
            password,
            police.password_hash
        );

        if (!validPassword) {
            return res.status(401).json({ error: "Incorrect password" });
        }

        const token = generateToken(doc.id, "police");

        res.json({
            message: "Login successful",
            token,
            station_id: doc.id,
            name: police.station_name,
            email: police.email
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ------------------------------------------------
// UPDATE POLICE PROFILE
// ------------------------------------------------
exports.updateProfile = async (req, res) => {
    try {
        const authenticatedStationId = req.user.user_id;
        const { station_name, email, password } = req.body;

        const normalizedEmail = String(email || "").trim().toLowerCase();
        const normalizedStationName = String(station_name || "").trim();

        if (!normalizedStationName || !normalizedEmail) {
            return res.status(400).json({ error: "Station name and email are required" });
        }

        if (password && String(password).length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        const stationRef = db.collection("police_stations").doc(authenticatedStationId);
        const stationDoc = await stationRef.get();

        if (!stationDoc.exists) {
            return res.status(404).json({ error: "Police station not found" });
        }

        const existingEmailSnapshot = await db
            .collection("police_stations")
            .where("email", "==", normalizedEmail)
            .limit(1)
            .get();

        if (!existingEmailSnapshot.empty && existingEmailSnapshot.docs[0].id !== authenticatedStationId) {
            return res.status(400).json({ error: "Email is already in use by another station" });
        }

        const updateData = {
            station_name: normalizedStationName,
            email: normalizedEmail,
            updated_at: new Date(),
        };

        if (password) {
            updateData.password_hash = await bcrypt.hash(password, 10);
        }

        await stationRef.update(updateData);

        res.json({
            message: "Police profile updated successfully",
            name: normalizedStationName,
            email: normalizedEmail,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ------------------------------------------------
// GET ALL CASES FOR POLICE STATION
// ------------------------------------------------
exports.getCases = async (req, res) => {
    try {

        const authenticatedStationId = req.user.user_id;

        const snapshot = await db
            .collection("missing_cases")
            .where("case_details.police_station_id", "==", authenticatedStationId)
            .get();

        const cases = [];

        snapshot.forEach(doc => {

            const data = doc.data();

            cases.push({
                case_id: doc.id,
                name: data.basic_info?.name,
                age: data.basic_info?.age,
                gender: data.basic_info?.gender,
                status: data.system_data?.status,
                missing_date: data.basic_info?.missing_date,
                photo_url: toPublicPhotoUrl(req, data.ai_data?.image_url)
            });

        });

        res.json({ cases });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ------------------------------------------------
// GET SINGLE CASE DETAILS
// ------------------------------------------------
exports.getCaseDetails = async (req, res) => {
    try {

        const authenticatedStationId = req.user.user_id;
        const { caseId } = req.params;

        const doc = await db
            .collection("missing_cases")
            .doc(caseId)
            .get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Case not found" });
        }

        const caseData = doc.data();
        const isOwner = caseData.case_details?.police_station_id === authenticatedStationId;

        if (!isOwner) {
            // Not the owning station — check if this station has a legitimate
            // match_logs entry for this case (i.e. they ran a face match that
            // surfaced this case as a candidate)
            const matchSnapshot = await db
                .collection("match_logs")
                .where("missing_case_id", "==", caseId)
                .where("matched_by_police_id", "==", authenticatedStationId)
                .limit(1)
                .get();

            if (matchSnapshot.empty) {
                return res.status(403).json({ error: "Forbidden: access denied" });
            }
        }

        res.json({
            case_id: caseId,
            case_data: caseData
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ------------------------------------------------
// GET POLICE STATION NOTIFICATIONS
// ------------------------------------------------
exports.getNotifications = async (req, res) => {
    try {
        const authenticatedStationId = req.user.user_id;
        const snapshot = await db
            .collection("notifications")
            .where("recipient_id", "==", authenticatedStationId)
            .where("recipient_role", "==", "police")
            .get();

        const notifications = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at ?? null
            };
        });

        // Sort in memory to avoid needing to configure composite index
        notifications.sort((a, b) => {
            const dateA = a.created_at?.toDate ? a.created_at.toDate() : new Date(a.created_at);
            const dateB = b.created_at?.toDate ? b.created_at.toDate() : new Date(b.created_at);
            return dateB - dateA;
        });

        res.json({ notifications });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ------------------------------------------------
// MARK POLICE NOTIFICATION AS READ
// ------------------------------------------------
exports.markNotificationAsRead = async (req, res) => {
    try {
        const authenticatedStationId = req.user.user_id;
        const { notificationId } = req.params;

        const notifRef = db.collection("notifications").doc(notificationId);
        const doc = await notifRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Notification not found" });
        }

        const data = doc.data();
        if (data.recipient_id !== authenticatedStationId || data.recipient_role !== "police") {
            return res.status(403).json({ error: "Forbidden: access denied" });
        }

        await notifRef.update({ read: true });
        res.json({ message: "Notification marked as read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ------------------------------------------------
// UPDATE CASE STATUS
// ------------------------------------------------
exports.updateCaseStatus = async (req, res) => {
    try {
        const authenticatedStationId = req.user.user_id;
        const { caseId } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: "Status is required" });
        }

        const validStatuses = ["missing", "found"];
        if (!validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({ error: "Invalid status value" });
        }

        const caseRef = db.collection("missing_cases").doc(caseId);
        const doc = await caseRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Case not found" });
        }

        const caseData = doc.data();

        if (caseData.case_details?.police_station_id !== authenticatedStationId) {
            return res.status(403).json({ error: "Forbidden: access denied" });
        }

        await caseRef.update({
            "system_data.status": status.toLowerCase()
        });

        // Notify citizen
        const citizenId = caseData.system_data?.reported_by_user_id;
        if (citizenId) {
            try {
                await db.collection("notifications").add({
                    recipient_id: citizenId,
                    recipient_role: "user",
                    title: "Case Status Updated",
                    message: `The status of your case PH-${caseId.substring(0, 5).toUpperCase()} has been updated to "${status.toUpperCase()}" by the police.`,
                    read: false,
                    created_at: new Date()
                });
            } catch (notifErr) {
                console.error("Failed to notify citizen on status update:", notifErr);
            }
        }

        res.json({ message: `Case status updated to ${status} successfully` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
