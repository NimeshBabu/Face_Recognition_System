const db = require("../config/firebaseConfig");
const { generateToken } = require("../services/authService");
const bcrypt = require("bcryptjs");

// -------------------------------------------------
// Setup Admin (initial setup)
// -------------------------------------------------
exports.setupAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password required" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const adminRef = await db.collection("users").add({
            email,
            password_hash: hashedPassword,
            role: "admin",
            created_at: new Date()
        });

        res.json({ message: "Admin created", admin_id: adminRef.id });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------------------------------------
// Admin Login
// -------------------------------------------------
exports.adminLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: "Email and password required" });

        const snapshot = await db
            .collection("users")
            .where("email", "==", email)
            .where("role", "==", "admin")
            .limit(1)
            .get();

        if (snapshot.empty)
            return res.status(404).json({ error: "Admin not found" });

        const adminDoc = snapshot.docs[0];
        const adminData = adminDoc.data();

        const validPassword = await bcrypt.compare(password, adminData.password_hash);
        if (!validPassword) return res.status(401).json({ error: "Incorrect password" });

        const token = generateToken(adminDoc.id, "admin");

        res.json({
            message: "Login successful",
            token,
            role: "admin",
            admin_id: adminDoc.id
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------------------------------------
// Get all cases
// -------------------------------------------------
exports.getAllCases = async (req, res) => {
    try {
        const snapshot = await db.collection("missing_cases").get();
        const cases = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                case_id: doc.id,
                name: data.basic_info?.name,
                age: data.basic_info?.age,
                status: data.system_data?.status,
                police_station_id: data.case_details?.police_station_id
            };
        });
        res.json({ cases });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------------------------------------
// Get all users
// -------------------------------------------------
exports.getAllUsers = async (req, res) => {
    try {
        const snapshot = await db.collection("users").get();
        const users = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                user_id: doc.id,
                name: data.name,
                email: data.email,
                created_at: data.created_at
            };
        });
        res.json({ users });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------------------------------------
// Get all police stations
// -------------------------------------------------
exports.getAllPolice = async (req, res) => {
    try {
        const snapshot = await db.collection("police_stations").get();
        const police_stations = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                station_id: doc.id,
                station_name: data.station_name,
                email: data.email,
                location: data.location,
                created_at: data.created_at
            };
        });
        res.json({ police_stations });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------------------------------------
// Create Police Station
// -------------------------------------------------
exports.createPolice = async (req, res) => {
    try {
        const { station_name, email, password, location } = req.body;
        if (!station_name || !email || !password)
            return res.status(400).json({ error: "Station name, email and password required" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const policeRef = await db.collection("police_stations").add({
            station_name,
            email,
            password_hash: hashedPassword,
            location,
            role: "police",
            created_at: new Date()
        });

        res.json({ message: "Police station created successfully", station_id: policeRef.id });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// -------------------------------------------------
// Delete Case
// -------------------------------------------------
exports.deleteCase = async (req, res) => {
    try {
        const { caseId } = req.params;
        const caseRef = db.collection("missing_cases").doc(caseId);
        const doc = await caseRef.get();
        if (!doc.exists) return res.status(404).json({ error: "Case not found" });

        await caseRef.delete();
        res.json({ message: "Case deleted successfully", case_id: caseId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};