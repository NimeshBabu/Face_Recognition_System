const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Base upload directory
const BASE_UPLOAD_DIR = path.join(__dirname, "..", "uploads");

// Ensure upload folders exist
const ensureFolder = (folder) => {
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }
};

// Storage configuration
const storage = multer.diskStorage({

    destination: function (req, file, cb) {

        // Default category
        let folder = "missing_persons";

        // Allow dynamic folder (future use)
        if (req.body.upload_type === "found") {
            folder = "found_persons";
        }

        const uploadPath = path.join(BASE_UPLOAD_DIR, folder);

        ensureFolder(uploadPath);

        cb(null, uploadPath);
    },

    filename: function (req, file, cb) {

        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9);

        const extension = path.extname(file.originalname);

        cb(null, uniqueName + extension);
    }
});


// File filter (only images)
const fileFilter = (req, file, cb) => {

    const allowedTypes = /jpeg|jpg|png/;

    const ext = allowedTypes.test(
        path.extname(file.originalname).toLowerCase()
    );

    const mime = allowedTypes.test(file.mimetype);

    if (ext && mime) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, JPEG, PNG images allowed"));
    }
};


// Multer upload instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB
    },
    fileFilter: fileFilter
});


module.exports = upload;