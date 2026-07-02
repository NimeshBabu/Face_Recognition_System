const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const db = require("../config/firebaseConfig");
const aiService = require("../services/aiService");
const { generateToken } = require("../services/authService");

const sanitizeForFirestore = (value) => {
    if (value === undefined) {
        return null;
    }

    if (Array.isArray(value)) {
        return value.map(sanitizeForFirestore);
    }

    if (value && typeof value === "object" && !(value instanceof Date)) {
        return Object.fromEntries(
            Object.entries(value).map(([key, nestedValue]) => [
                key,
                sanitizeForFirestore(nestedValue)
            ])
        );
    }

    return value;
};

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
// USER REGISTRATION
// ------------------------------------------------
exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Name, email and password required" });
        }

        const userRef = db.collection("users");

        const existingUser = await userRef.where("email", "==", email).get();

        if (!existingUser.empty) {
            return res.status(400).json({ error: "User already exists" });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = {
            name,
            email,
            password_hash: passwordHash,
            role: "user",
            created_at: new Date()
        };

        const doc = await userRef.add(newUser);

        res.json({
            message: "User registered successfully",
            user_id: doc.id
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ------------------------------------------------
// USER LOGIN
// ------------------------------------------------
exports.login = async (req, res) => {
    try {

        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password required" });
        }

        const snapshot = await db
            .collection("users")
            .where("email", "==", email)
            .where("role", "==", "user")
            .get();

        if (snapshot.empty) {
            return res.status(404).json({ error: "User not found" });
        }

        const doc = snapshot.docs[0];
        const user = doc.data();

        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const token = generateToken(doc.id, "user");

        res.json({
            message: "Login successful",
            token,
            user_id: doc.id,
            name: user.name,
            email: user.email
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ------------------------------------------------
// REPORT MISSING PERSON
// ------------------------------------------------
exports.reportMissing = async (req, res) => {
    try {

        const authenticatedUserId = req.user.user_id;
        const data = req.body;
        const file = req.file;

        // 1️⃣ Validate required fields
        if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 3) {
            return res.status(400).json({ error: "Name must be at least 3 characters long." });
        }

        if (!data.age || isNaN(data.age) || parseInt(data.age) < 0 || parseInt(data.age) > 120) {
            return res.status(400).json({ error: "Age must be a valid number between 0 and 120." });
        }

        if (!data.gender || !["Male", "Female", "Other"].includes(data.gender)) {
            return res.status(400).json({ error: "Please select a valid gender (Male, Female, or Other)." });
        }

        if (!data.missing_date || isNaN(Date.parse(data.missing_date))) {
            return res.status(400).json({ error: "Please provide a valid missing date." });
        }

        const missingDateObj = new Date(data.missing_date);
        const today = new Date();
        missingDateObj.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        if (missingDateObj > today) {
            return res.status(400).json({ error: "Missing date cannot be in the future." });
        }

        if (!data.complainant_name || typeof data.complainant_name !== 'string' || data.complainant_name.trim().length === 0) {
            return res.status(400).json({ error: "Complainant name is required." });
        }

        const phoneRegex = /^\+?[0-9]{7,15}$/;
        if (!data.complainant_phone || !phoneRegex.test(data.complainant_phone.trim())) {
            return res.status(400).json({ error: "Complainant phone number must contain only digits and be between 7 and 15 digits long." });
        }

        if (data.complainant_email && data.complainant_email.trim() !== "") {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.complainant_email.trim())) {
                return res.status(400).json({ error: "Please enter a valid complainant email address." });
            }
        }

        if (!data.police_station_id) {
            return res.status(400).json({ error: "Please select a police station responsible for the case." });
        }

        if (!file) {
            return res.status(400).json({ error: "Please upload a recent photo." });
        }

        const imagePath = file.path;
        const imageUrl = `/uploads/missing_persons/${file.filename}`;

        // 2️⃣ Generate embedding from AI service (with face detection error catch)
        let embedding;
        try {
            embedding = await aiService.generateEmbedding(imagePath);
        } catch (aiErr) {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
            if (aiErr.message.includes("No face detected")) {
                return res.status(400).json({ error: "No face detected in the image. Please upload a clear photo of the face." });
            }
            throw aiErr;
        }

        const caseData = sanitizeForFirestore({

            basic_info: {
                name: data.name.trim(),
                age: parseInt(data.age),
                gender: data.gender,
                category: data.category || "adult",
                missing_date: data.missing_date,
                missing_time: data.missing_time || null,
                lost_address: data.lost_address || null,
                permanent_address: data.permanent_address || null
            },

            physical_details: {
                height: data.height || null,
                weight: data.weight || null,
                complexion: data.complexion || null,
                hair_color: data.hair_color || null,
                eye_color: data.eye_color || null,
                identifying_marks: data.identifying_marks || null
            },

            clothing_details: {
                clothes: data.clothes || null,
                footwear: data.footwear || null,
                accessories: data.accessories || null
            },

            family_details: {
                mother_name: data.mother_name || null,
                father_name: data.father_name || null,
                guardian_name: data.guardian_name || null,
                relation_with_complainant: data.relation_with_complainant || null
            },

            complainant_details: {
                name: data.complainant_name.trim(),
                phone: data.complainant_phone.trim(),
                email: data.complainant_email ? data.complainant_email.trim() : null,
                address: data.complainant_address || null
            },

            case_details: {
                last_seen_location: data.last_seen_location || null,
                suspected_kidnap: data.suspected_kidnap === "true",
                police_station_id: data.police_station_id
            },

            ai_data: {
                image_url: imageUrl,
                embedding_vector: embedding,
                similarity_score: null,
                matched_case_id: null
            },

            system_data: {
                reported_by_user_id: authenticatedUserId,
                status: "missing",
                created_at: new Date()
            }
        });

        const docRef = await db.collection("missing_cases").add(caseData);

        res.json({
            message: "Missing case reported successfully",
            case_id: docRef.id
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ------------------------------------------------
// GET USER CASES
// ------------------------------------------------
exports.getUserCases = async (req, res) => {
    try {

        const authenticatedUserId = req.user.user_id;

        const snapshot = await db
            .collection("missing_cases")
            .where("system_data.reported_by_user_id", "==", authenticatedUserId)
            .get();

        const stationsSnapshot = await db.collection("police_stations").get();
        const stationLookup = {};
        stationsSnapshot.forEach(doc => {
            stationLookup[doc.id] = doc.data().station_name;
        });
        const cases = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            const stationId = data.case_details?.police_station_id;
            cases.push({
                case_id: doc.id,
                name: data.basic_info?.name,
                status: data.system_data?.status,
                missing_date: data.basic_info?.missing_date,
                photo_url: toPublicPhotoUrl(req, data.ai_data?.image_url),
                age: data.basic_info?.age,
                gender: data.basic_info?.gender,
                owner_station_name: stationLookup[stationId] || null
            });
        });

        res.json({ cases });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ------------------------------------------------
// GET SINGLE CASE
// ------------------------------------------------
exports.getCaseById = async (req, res) => {
    try {

        const authenticatedUserId = req.user.user_id;
        const { caseId } = req.params;
        const doc = await db.collection("missing_cases").doc(caseId).get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Case not found" });
        }

        const caseData = doc.data();

        if (caseData.system_data?.reported_by_user_id !== authenticatedUserId) {
            return res.status(403).json({ error: "Forbidden: access denied" });
        }

        res.json(caseData);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ------------------------------------------------
// GET POLICE STATIONS FOR REPORT FORM
// ------------------------------------------------
exports.getPoliceStations = async (req, res) => {
    try {
        const snapshot = await db.collection("police_stations").get();

        const stations = snapshot.docs.map((doc) => {
            const data = doc.data();

            return {
                station_id: doc.id,
                station_name: data.station_name,
                location: data.location || ""
            };
        });

        res.json({ stations });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ------------------------------------------------
// UPDATE USER PROFILE & PROPAGATE
// ------------------------------------------------
exports.updateProfile = async (req, res) => {
    try {
        const authenticatedUserId = req.user.user_id;
        const { name, email, password } = req.body;

        const normalizedEmail = String(email || "").trim().toLowerCase();
        const normalizedName = String(name || "").trim();

        if (!normalizedName || !normalizedEmail) {
            return res.status(400).json({ error: "Name and email are required" });
        }

        const userRef = db.collection("users").doc(authenticatedUserId);
        const userDoc = await userRef.get();

        if (!userDoc.exists) {
            return res.status(404).json({ error: "User not found" });
        }

        // Check if email already in use
        const existingEmailSnapshot = await db
            .collection("users")
            .where("email", "==", normalizedEmail)
            .get();

        if (!existingEmailSnapshot.empty && existingEmailSnapshot.docs.find(d => d.id !== authenticatedUserId)) {
            return res.status(400).json({ error: "Email is already in use by another user" });
        }

        const updateData = {
            name: normalizedName,
            email: normalizedEmail,
            updated_at: new Date()
        };

        if (password) {
            if (password.length < 6) {
                return res.status(400).json({ error: "Password must be at least 6 characters" });
            }
            updateData.password_hash = await bcrypt.hash(password, 10);
        }

        await userRef.update(updateData);

        // PROPAGATE: Update user details in their reported cases
        const casesSnapshot = await db
            .collection("missing_cases")
            .where("system_data.reported_by_user_id", "==", authenticatedUserId)
            .get();

        const batch = db.batch();
        casesSnapshot.forEach(doc => {
            batch.update(doc.ref, {
                "complainant_details.name": normalizedName,
                "complainant_details.email": normalizedEmail
            });
        });
        await batch.commit();

        res.json({
            message: "Profile updated successfully",
            name: normalizedName,
            email: normalizedEmail
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ------------------------------------------------
// DELETE CASE (CITIZEN WITHDRAWAL)
// ------------------------------------------------
exports.deleteCase = async (req, res) => {
    try {
        const authenticatedUserId = req.user.user_id;
        const { caseId } = req.params;

        const caseRef = db.collection("missing_cases").doc(caseId);
        const doc = await caseRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Case not found" });
        }

        const caseData = doc.data();

        if (caseData.system_data?.reported_by_user_id !== authenticatedUserId) {
            return res.status(403).json({ error: "Forbidden: you can only delete your own cases" });
        }

        // Delete photo if local
        const imagePath = caseData.ai_data?.image_url;
        if (imagePath) {
            const absolutePath = path.join(__dirname, "..", imagePath);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
            }
        }

        await caseRef.delete();

        // Also clean up any match logs for this case
        const matchLogsSnapshot = await db
            .collection("match_logs")
            .where("missing_case_id", "==", caseId)
            .get();

        const batch = db.batch();
        matchLogsSnapshot.forEach(logDoc => {
            batch.delete(logDoc.ref);
        });
        await batch.commit();

        res.json({ message: "Case and associated logs deleted successfully", case_id: caseId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ------------------------------------------------
// GET CITIZEN NOTIFICATIONS
// ------------------------------------------------
exports.getNotifications = async (req, res) => {
    try {
        const authenticatedUserId = req.user.user_id;
        const snapshot = await db
            .collection("notifications")
            .where("recipient_id", "==", authenticatedUserId)
            .where("recipient_role", "==", "user")
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
// MARK NOTIFICATION AS READ
// ------------------------------------------------
exports.markNotificationAsRead = async (req, res) => {
    try {
        const authenticatedUserId = req.user.user_id;
        const { notificationId } = req.params;

        const notifRef = db.collection("notifications").doc(notificationId);
        const doc = await notifRef.get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Notification not found" });
        }

        const data = doc.data();
        if (data.recipient_id !== authenticatedUserId || data.recipient_role !== "user") {
            return res.status(403).json({ error: "Forbidden: access denied" });
        }

        await notifRef.update({ read: true });
        res.json({ message: "Notification marked as read" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
