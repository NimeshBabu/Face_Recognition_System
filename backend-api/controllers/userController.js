const bcrypt = require("bcryptjs");

const db = require("../config/firebaseConfig");
const aiService = require("../services/aiService");
const { generateToken } = require("../services/authService");



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
            name: user.name
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

        const userId = req.user.user_id;
        const data = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "Image required" });
        }

        const imagePath = file.path;

        // Generate embedding from AI service
        const embedding = await aiService.generateEmbedding(imagePath);

        const caseData = {

            basic_info: {
                name: data.name,
                age: data.age ? parseInt(data.age) : null,
                gender: data.gender,
                category: data.category,
                missing_date: data.missing_date,
                missing_time: data.missing_time,
                lost_address: data.lost_address,
                permanent_address: data.permanent_address
            },

            physical_details: {
                height: data.height,
                weight: data.weight,
                complexion: data.complexion,
                hair_color: data.hair_color,
                eye_color: data.eye_color,
                identifying_marks: data.identifying_marks
            },

            clothing_details: {
                clothes: data.clothes,
                footwear: data.footwear,
                accessories: data.accessories
            },

            family_details: {
                mother_name: data.mother_name,
                father_name: data.father_name,
                guardian_name: data.guardian_name,
                relation_with_complainant: data.relation_with_complainant
            },

            complainant_details: {
                name: data.complainant_name,
                phone: data.complainant_phone,
                email: data.complainant_email,
                address: data.complainant_address
            },

            case_details: {
                last_seen_location: data.last_seen_location,
                suspected_kidnap: data.suspected_kidnap === "true",
                emergency_level: data.emergency_level,
                police_station_id: data.police_station_id
            },

            ai_data: {
                image_url: imagePath,
                embedding_vector: embedding,
                similarity_score: null,
                matched_case_id: null
            },

            system_data: {
                reported_by_user_id: userId,
                status: "missing",
                created_at: new Date()
            }
        };

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

        const userId = req.user.user_id;

        const snapshot = await db
            .collection("missing_cases")
            .where("system_data.reported_by_user_id", "==", userId)
            .get();

        const cases = [];

        snapshot.forEach(doc => {

            const data = doc.data();

            cases.push({
                case_id: doc.id,
                name: data.basic_info?.name,
                status: data.system_data?.status,
                missing_date: data.basic_info?.missing_date
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

        const { caseId } = req.params;

        const doc = await db.collection("missing_cases").doc(caseId).get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Case not found" });
        }

        res.json(doc.data());

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};