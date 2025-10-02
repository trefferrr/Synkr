import multer from "multer";
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from "../config/clodinary.js";
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: "chat-images",
        allowed_formats: ["jpg", "jpeg", "png", "gif", "webp"],
        tranformation: [
            { width: 800, height: 600, crop: "limit" },
            { quality: "auto" },
        ],
    },
});
export const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        }
        else {
            cb(new Error("only image allowed"));
        }
    },
});
//# sourceMappingURL=multer.js.map