const db = require("../config/firebaseConfig");
const aiService = require("../services/aiService");
const fs = require("fs");
const path = require("path");

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
// MATCH FOUND PERSON
// ------------------------------------------------
exports.matchFound = async (req, res) => {
    try {

        const authenticatedStationId = req.user.user_id;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ error: "Image required" });
        }

        const imagePath = file.path;

        // 1️⃣ Generate embedding from AI service
        let embedding;
        try {
            embedding = await aiService.generateEmbedding(imagePath);
        } catch (aiErr) {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
            if (aiErr.message.includes("No face detected")) {
                return res.status(400).json({ error: "No face detected in the image. Please upload a clear photo focusing on the face." });
            }
            throw aiErr;
        }

        // 2️⃣ Save found report
        const foundRef = await db.collection("found_reports").add({
            image_path: imagePath,
            embedding,
            police_station_id: authenticatedStationId,
            timestamp: new Date()
        });

        const foundCaseId = foundRef.id;

        // 3️⃣ Fetch missing embeddings
        const snapshot = await db
            .collection("missing_cases")
            .where("system_data.status", "==", "missing")
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
            const caseDoc = await db.collection("missing_cases").doc(match.case_id).get();
            const caseData = caseDoc.data();
            const logRef = await db.collection("match_logs").add({
                missing_case_id: match.case_id,
                found_case_id: foundCaseId,
                similarity_score: match.similarity,
                matched_by_police_id: authenticatedStationId,
                status: "pending",
                created_at: new Date()
            });

            // Get owner station name
            const ownerStationId = caseData?.case_details?.police_station_id;
            let ownerStationName = "Unknown Station";
            if (ownerStationId) {
                const ownerDoc = await db.collection("police_stations").doc(ownerStationId).get();
                if (ownerDoc.exists) {
                    ownerStationName = ownerDoc.data()?.station_name || "Unnamed Station";
                }
            }

            savedMatches.push({
                log_id: logRef.id,
                case_id: match.case_id,
                similarity_score: match.similarity,
                status: "pending",

                name: caseData?.basic_info?.name ?? "Unknown Person",
                age: caseData?.basic_info?.age ?? null,
                gender: caseData?.basic_info?.gender ?? "N/A",
                missing_date: caseData?.basic_info?.missing_date ?? "",
                owner_station_id: ownerStationId || null,
                owner_station_name: ownerStationName,

                photo_url: toPublicPhotoUrl(
                    req,
                    caseData?.ai_data?.image_url ??
                    caseData?.image_url
                )
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

        const authenticatedStationId = req.user.user_id;
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

        const caseRef = db.collection("missing_cases").doc(caseId);
        const caseDoc = await caseRef.get();

        if (!caseDoc.exists) {
            return res.status(404).json({ error: "Missing case not found" });
        }

        const caseData = caseDoc.data();

        if (caseData.case_details?.police_station_id !== authenticatedStationId) {
            return res.status(403).json({
                error: "Forbidden: only the registering station can confirm this match"
            });
        }

        // Update log
        await logRef.update({
            status: "confirmed",
            confirmed_by_station_id: authenticatedStationId,
            confirmed_at: new Date()
        });

        // Update case
        await caseRef.update({
            "system_data.status": "found",
            "ai_data.similarity_score": logData.similarity_score,
            "ai_data.matched_case_id": caseId,
            "system_data.found_by_station": logData.matched_by_police_id,
            "system_data.found_at": new Date(),
            "system_data.confirmed_by_station": authenticatedStationId
        });

        // -----------------------------------------------------------
        // NOTIFY OTHER CANDIDATE STATIONS FROM THE SAME FOUND-PHOTO SEARCH
        // -----------------------------------------------------------
        const personName = caseData.basic_info?.name || "a missing person";
        const foundCaseIdForThisLog = logData.found_case_id;

        // Photo of the confirmed case, reused for the "resolved" notification
        // sent back to the station that originally ran the match.
        const confirmedCasePhotoUrl = toPublicPhotoUrl(
            req,
            caseData?.ai_data?.image_url ?? caseData?.image_url
        );

        const siblingLogsSnapshot = await db
            .collection("match_logs")
            .where("found_case_id", "==", foundCaseIdForThisLog)
            .where("status", "==", "pending")
            .get();

        const notifiedStationIds = new Set();
        const crossBatch = db.batch();

        for (const siblingDoc of siblingLogsSnapshot.docs) {
            if (siblingDoc.id === log_id) continue;

            const siblingData = siblingDoc.data();
            const siblingCaseDoc = await db.collection("missing_cases").doc(siblingData.missing_case_id).get();
            if (!siblingCaseDoc.exists) continue;

            const siblingCaseData = siblingCaseDoc.data();
            const siblingOwnerId = siblingCaseData?.case_details?.police_station_id;
            if (!siblingOwnerId || siblingOwnerId === authenticatedStationId) continue;

            if (!notifiedStationIds.has(siblingOwnerId)) {
                notifiedStationIds.add(siblingOwnerId);
                const notifRef = db.collection("notifications").doc();
                crossBatch.set(notifRef, {
                    recipient_id: siblingOwnerId,
                    recipient_role: "police",
                    case_id: siblingData.missing_case_id,
                    log_id: siblingDoc.id,
                    photo_url: toPublicPhotoUrl(
                        req,
                        siblingCaseData?.ai_data?.image_url ?? siblingCaseData?.image_url
                    ),
                    message: `The found-person photo that was matched to your case has now been confirmed as a different missing person ("${personName}"). This candidate has been ruled out for your case.`,
                    type: "match_ruled_out",
                    read: false,
                    created_at: new Date()
                });
            }

            // Close this sibling log — it's now confirmed wrong
            crossBatch.update(siblingDoc.ref, {
                status: "closed",
                closed_reason: "matched_to_different_case"
            });
        }

        // Also notify the searching station that originally ran the match, if different from confirmer
        const searchingStationId = logData.matched_by_police_id;
        if (searchingStationId && searchingStationId !== authenticatedStationId) {
            const confirmingStationDoc = await db.collection("police_stations").doc(authenticatedStationId).get();
            const confirmingStationName = confirmingStationDoc.data()?.station_name || "A station";

            const notifRef = db.collection("notifications").doc();
            crossBatch.set(notifRef, {
                recipient_id: searchingStationId,
                recipient_role: "police",
                case_id: caseId,
                log_id: log_id,
                photo_url: confirmedCasePhotoUrl,
                message: `Your found-photo search has been resolved: Station "${confirmingStationName}" confirmed the match as "${personName}".`,
                type: "match_confirmed_by_owner",
                read: false,
                created_at: new Date()
            });
        }

        if (notifiedStationIds.size > 0 || (searchingStationId && searchingStationId !== authenticatedStationId)) {
            await crossBatch.commit();
        }

        // Send notification to complainant user (unchanged, keep as-is)
        const reporterId = caseData.system_data?.reported_by_user_id;
        if (reporterId) {
            const stationDoc = await db.collection("police_stations").doc(authenticatedStationId).get();
            const stationName = stationDoc.data()?.station_name || "Police Station";

            await db.collection("notifications").add({
                recipient_id: reporterId,
                recipient_role: "user",
                case_id: caseId,
                photo_url: confirmedCasePhotoUrl,
                message: `Good news! Police Station "${stationName}" has confirmed a match and resolved your case for "${personName}".`,
                type: "case_found",
                read: false,
                created_at: new Date()
            });
        }

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

        const authenticatedStationId = req.user.user_id;
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

        const caseRef = db.collection("missing_cases").doc(logData.missing_case_id);
        const caseDoc = await caseRef.get();

        if (!caseDoc.exists) {
            return res.status(404).json({ error: "Missing case not found" });
        }

        const caseData = caseDoc.data();

        if (caseData.case_details?.police_station_id !== authenticatedStationId) {
            return res.status(403).json({
                error: "Forbidden: only the registering station can reject this match"
            });
        }

        await logRef.update({
            status: "rejected",
            rejected_by_station_id: authenticatedStationId,
            rejected_at: new Date()
        });

        res.json({
            message: "Match rejected"
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ------------------------------------------------
// NOTIFY OWNER STATION OF CROSS-STATION MATCH
// ------------------------------------------------
exports.notifyOwner = async (req, res) => {
    try {
        const matchingStationId = req.user.user_id;
        const { case_id, log_id } = req.body;

        if (!case_id) {
            return res.status(400).json({ error: "case_id is required" });
        }

        const caseDoc = await db.collection("missing_cases").doc(case_id).get();
        if (!caseDoc.exists) {
            return res.status(404).json({ error: "Case not found" });
        }

        const caseData = caseDoc.data();
        const ownerStationId = caseData.case_details?.police_station_id;

        if (!ownerStationId) {
            return res.status(400).json({ error: "This case has no assigned station." });
        }

        if (ownerStationId === matchingStationId) {
            return res.status(400).json({ error: "You are already the owner of this case." });
        }

        // Verify the log_id actually belongs to this case AND was created by the
        // requesting station — prevents a station from forging an arbitrary
        // log_id into another station's notification payload.
        let verifiedLogId = null;
        if (log_id) {
            const logDoc = await db.collection("match_logs").doc(log_id).get();
            if (
                logDoc.exists &&
                logDoc.data().missing_case_id === case_id &&
                logDoc.data().matched_by_police_id === matchingStationId
            ) {
                verifiedLogId = log_id;
            }
        }

        const matchingStationDoc = await db.collection("police_stations").doc(matchingStationId).get();
        const matchingStationName = matchingStationDoc.data()?.station_name || "Another Station";

        const personName = caseData.basic_info?.name || "a missing person";

        await db.collection("notifications").add({
            recipient_id: ownerStationId,
            recipient_role: "police",
            case_id: case_id,
            log_id: verifiedLogId,
            photo_url: toPublicPhotoUrl(
                req,
                caseData?.ai_data?.image_url ?? caseData?.image_url
            ),
            message: `Station "${matchingStationName}" has uploaded a found person photo that is a potential AI match for your case "${personName}". Please review and confirm.`,
            type: "match_suggestion",
            read: false,
            created_at: new Date()
        });

        res.json({ message: "Notification sent to owner station successfully." });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


// ------------------------------------------------
// NOTIFY ALL MATCHED STATIONS (BULK)
// ------------------------------------------------
exports.notifyAllOwners = async (req, res) => {
    try {
        const matchingStationId = req.user.user_id;
        const { found_case_id } = req.body;

        if (!found_case_id) {
            return res.status(400).json({ error: "found_case_id is required" });
        }

        const logsSnapshot = await db
            .collection("match_logs")
            .where("found_case_id", "==", found_case_id)
            .get();

        if (logsSnapshot.empty) {
            return res.status(404).json({ error: "No match results found for this found report." });
        }

        const matchingStationDoc = await db.collection("police_stations").doc(matchingStationId).get();
        const matchingStationName = matchingStationDoc.data()?.station_name || "Another Station";

        // Group by owner station, collecting { name, log_id, photo_url } entries for their cases
        const ownerMap = new Map(); // ownerStationId -> [{ name, log_id, photo_url }, ...]

        for (const logDoc of logsSnapshot.docs) {
            const logData = logDoc.data();
            const caseId = logData.missing_case_id;

            const caseDoc = await db.collection("missing_cases").doc(caseId).get();
            if (!caseDoc.exists) continue;

            const caseData = caseDoc.data();
            const ownerStationId = caseData.case_details?.police_station_id;

            if (!ownerStationId || ownerStationId === matchingStationId) continue;

            if (!ownerMap.has(ownerStationId)) {
                ownerMap.set(ownerStationId, []);
            }
            ownerMap.get(ownerStationId).push({
                name: caseData.basic_info?.name || "a missing person",
                log_id: logDoc.id,
                photo_url: toPublicPhotoUrl(
                    req,
                    caseData?.ai_data?.image_url ?? caseData?.image_url
                )
            });
        }

        if (ownerMap.size === 0) {
            return res.status(400).json({ error: "No other stations to notify for this match result." });
        }

        const batch = db.batch();
        for (const [ownerStationId, entries] of ownerMap.entries()) {
            const personNames = entries.map(e => e.name);
            const logIds = entries.map(e => e.log_id);

            const namesList =
                personNames.slice(0, 3).join(", ") +
                (personNames.length > 3 ? ` and ${personNames.length - 3} more` : "");

            const notifRef = db.collection("notifications").doc();
            batch.set(notifRef, {
                recipient_id: ownerStationId,
                recipient_role: "police",
                found_case_id,
                // Primary log_id used for one-click navigation (first match for this station).
                log_id: logIds[0],
                log_ids: logIds,
                // Thumbnail preview uses the first matched case's photo.
                photo_url: entries[0].photo_url,
                message: `Station "${matchingStationName}" uploaded a found-person photo that potentially matches your case(s): ${namesList}. Please review and confirm.`,
                type: "match_suggestion_bulk",
                read: false,
                created_at: new Date()
            });
        }
        await batch.commit();

        res.json({
            message: `Notification sent to ${ownerMap.size} station(s) successfully.`,
            notified_count: ownerMap.size
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};



// ------------------------------------------------
// GET SINGLE MATCH LOG (for notification deep-link)
// ------------------------------------------------
exports.getMatchLogById = async (req, res) => {
    try {
        const authenticatedStationId = req.user.user_id;
        const { logId } = req.params;

        const logDoc = await db.collection("match_logs").doc(logId).get();
        if (!logDoc.exists) {
            return res.status(404).json({ error: "Match log not found" });
        }

        const logData = logDoc.data();

        const caseDoc = await db.collection("missing_cases").doc(logData.missing_case_id).get();
        if (!caseDoc.exists) {
            return res.status(404).json({ error: "Missing case not found" });
        }
        const caseData = caseDoc.data();

        const ownerStationId = caseData.case_details?.police_station_id;

        // Only the case owner (who confirms/rejects) or the station that ran
        // the original match (who may notify the owner) can open this link.
        const isOwner = ownerStationId === authenticatedStationId;
        const isMatcher = logData.matched_by_police_id === authenticatedStationId;

        if (!isOwner && !isMatcher) {
            return res.status(403).json({ error: "Forbidden: access denied" });
        }

        let ownerStationName = "Unknown Station";
        if (ownerStationId) {
            const ownerDoc = await db.collection("police_stations").doc(ownerStationId).get();
            if (ownerDoc.exists) {
                ownerStationName = ownerDoc.data()?.station_name || "Unnamed Station";
            }
        }

        res.json({
            log_id: logDoc.id,
            case_id: logData.missing_case_id,
            found_case_id: logData.found_case_id,
            similarity_score: logData.similarity_score,
            status: logData.status,

            name: caseData?.basic_info?.name ?? "Unknown Person",
            age: caseData?.basic_info?.age ?? null,
            gender: caseData?.basic_info?.gender ?? "N/A",
            missing_date: caseData?.basic_info?.missing_date ?? "",
            owner_station_id: ownerStationId || null,
            owner_station_name: ownerStationName,

            photo_url: toPublicPhotoUrl(
                req,
                caseData?.ai_data?.image_url ?? caseData?.image_url
            )
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};