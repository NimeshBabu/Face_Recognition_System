const bcrypt = require("bcryptjs");
const db = require("../config/firebaseConfig");
const { generateToken } = require("../services/authService");


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
            name: police.station_name
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

        const stationId = req.user.station_id;

        const snapshot = await db
            .collection("missing_cases")
            .where("case_details.police_station_id", "==", stationId)
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
                missing_date: data.basic_info?.missing_date
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

        const { caseId } = req.params;

        const doc = await db
            .collection("missing_cases")
            .doc(caseId)
            .get();

        if (!doc.exists) {
            return res.status(404).json({ error: "Case not found" });
        }

        res.json({
            case_id: caseId,
            case_data: doc.data()
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
