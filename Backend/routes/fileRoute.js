

import express from "express";
import {
  displayFile,
  allFiles,
  uploadFile,
  getPublicFiles,
  getAdminFile,
  getRecentFiles,
  updateFile,
  getSharedFiles,
  getTotalFilesCount,
  getPrivateFiles,
} from "../controllers/fileController.js";

const router = express.Router();

router.get("/files", uploadFile);
router.get("/allfiles", allFiles);
router.get("/file/:id", displayFile);
router.get("/public-files", getPublicFiles);
router.get("/shared-files", getSharedFiles);
router.get("/admin/files", getAdminFile);
router.get("/recent-files", getRecentFiles);
router.put('/update-file/:id',updateFile);
router.get("/private-files", getPrivateFiles);


// ✅ Add this new route for total file count
router.get("/total-files", getTotalFilesCount);

export default router;