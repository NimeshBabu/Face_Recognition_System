const db = require("../config/firebaseConfig");
const aiService = require("../services/aiService");


// ------------------------------------------------
// MATCH FOUND PERSON
// ------------------------------------------------
exports.matchFound = async (req, res) => {
    try {

        const stationId = req.user.station_id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "Image required" });
        }

        const imagePath = file.path;

        // 1️⃣ Generate embedding from AI service
        const embedding = await aiService.generateEmbedding(imagePath);

        // 2️⃣ Save found report
        const foundRef = await db.collection("found_reports").add({
            image_path: imagePath,
            embedding,
            police_station_id: stationId,
            timestamp: new Date()
        });

        const foundCaseId = foundRef.id;

        // 3️⃣ Fetch missing embeddings
        const snapshot = await db
            .collection("missing_cases")
            .where("system_data.status", "in", ["missing", "verified"])
            .get();

        const storedEmbeddings = [];

        snapshot.forEach(doc => {

            const data = doc.data();

            if (data.ai_data?.embedding_vector) {
                storedEmbeddings.push({
                    case_id: doc.id,
                    embedding: data.ai_data.embedding_vector
                });
            }

        });

        // 4️⃣ Call AI service for matching
        const matches = await aiService.matchEmbedding(
            embedding,
            storedEmbeddings
        );

        const savedMatches = [];

        for (const match of matches) {

            const logRef = await db.collection("match_logs").add({
                missing_case_id: match.case_id,
                found_case_id: foundCaseId,
                similarity_score: match.similarity,
                matched_by_police_id: stationId,
                status: "pending",
                created_at: new Date()
            });

            savedMatches.push({
                log_id: logRef.id,
                case_id: match.case_id,
                similarity_score: match.similarity
            });

        }

        res.json({
            found_case_id: foundCaseId,
            matches: savedMatches
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



// ------------------------------------------------
// CONFIRM MATCH
// ------------------------------------------------
exports.confirmMatch = async (req, res) => {
    try {

        const { log_id } = req.body;

        if (!log_id) {
            return res.status(400).json({ error: "log_id required" });
        }

        const logRef = db.collection("match_logs").doc(log_id);
        const logDoc = await logRef.get();

        if (!logDoc.exists) {
            return res.status(404).json({ error: "Match log not found" });
        }

        const logData = logDoc.data();
        const caseId = logData.missing_case_id;

        // Update log
        await logRef.update({
            status: "confirmed"
        });

        // Update case
        const caseRef = db.collection("missing_cases").doc(caseId);

        await caseRef.update({
            "system_data.status": "found",
            "ai_data.similarity_score": logData.similarity_score,
            "ai_data.matched_case_id": caseId,
            "system_data.found_by_station": logData.matched_by_police_id,
            "system_data.found_at": new Date()
        });

        res.json({
            message: "Match confirmed"
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



// ------------------------------------------------
// REJECT MATCH
// ------------------------------------------------
exports.rejectMatch = async (req, res) => {
    try {

        const { log_id } = req.body;

        if (!log_id) {
            return res.status(400).json({ error: "log_id required" });
        }

        const logRef = db.collection("match_logs").doc(log_id);

        await logRef.update({
            status: "rejected"
        });

        res.json({
            message: "Match rejected"
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};