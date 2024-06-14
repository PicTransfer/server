const express = require("express");
const {
  createSpace,
  addMember,
  updateRole,
  uploadFile,
  getFiles,
} = require("../controllers/spaceController");
const auth = require("../middlewares/auth");
const multer = require("multer");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/create", auth, createSpace);
router.post("/add-member", auth, addMember);
router.post("/update-role", auth, updateRole);
router.post("/upload-file", auth, upload.single("file"), uploadFile);
router.get("/files/:spaceId", auth, getFiles);

module.exports = router;
