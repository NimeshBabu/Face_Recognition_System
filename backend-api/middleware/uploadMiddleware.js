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

const createStorage = (folder) => {
    return multer.diskStorage({
        destination: function (req, file, cb) {
            const uploadPath = path.join(BASE_UPLOAD_DIR, folder);

            ensureFolder(uploadPath);

            cb(null, uploadPath);
        },

        filename: function (req, file, cb) {
            const uniqueName =
                Date.now() + "-" + Math.round(Math.random() * 1e9);

            const extension = path.extname(file.originalname).toLowerCase();
            const allowedExt = [".jpg", ".jpeg", ".png", ".webp"];
            const safeExt = allowedExt.includes(extension) ? extension : "";

            cb(null, uniqueName + safeExt);
        }
    });
};


// File filter (only images)
const fileFilter = (req, file, cb) => {

    const allowedExt = /\.(jpe?g|png|webp)$/i;
    const allowedMime = /^image\/(jpeg|png|webp)$/i;

    const ext = allowedExt.test(file.originalname);
    const mime = allowedMime.test(file.mimetype);

    if (ext && mime) {
        cb(null, true);
    } else {
        cb(new Error("Only JPG, JPEG, PNG, or WEBP images allowed"));
    }
};


const createUpload = (folder) => {
    return multer({
        storage: createStorage(folder),
        limits: {
            fileSize: 5 * 1024 * 1024 // 5MB
        },
        fileFilter: fileFilter
    });
};

const uploadMissing = createUpload("missing_persons");
const uploadFound = createUpload("found_persons");


// Multer-aware error handler
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "Photo must be under 5MB" });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    // Errors thrown from fileFilter land here too
    return res.status(400).json({ error: err.message });
  }
  next();
}


module.exports = {
    uploadMissing,
    uploadFound,
    handleUploadError
};