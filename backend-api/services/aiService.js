// backend-api/services/aiService.js
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:5001";

module.exports = {
    // Send image to AI service and get embedding
    async generateEmbedding(imagePath) {
        try {
            if (!fs.existsSync(imagePath)) {
                throw new Error("Image file not found: " + imagePath);
            }

            const formData = new FormData();
            formData.append("image", fs.createReadStream(imagePath));

            const response = await axios.post(
                `${AI_SERVICE_URL}/generate-embedding`,
                formData,
                {
                    headers: formData.getHeaders(),
                }
            );

            return response.data.embedding;
        } catch (err) {
            console.error("AI Service Error:", err.message);
            throw err;
        }
    },

    // Match embedding using AI service (optional)
    async matchEmbedding(queryEmbedding, storedEmbeddings) {
        try {
            const response = await axios.post(`${AI_SERVICE_URL}/match-face`, {
                query_embedding: queryEmbedding,
                stored_embeddings: storedEmbeddings,
            });

            return response.data.matches;
        } catch (err) {
            console.error("AI Service Match Error:", err.message);
            throw err;
        }
    },
};