import express from 'express'

import { getUploadsSummary } from '../controllers/virusScanController.js'

const router = express.Router()

router.get('/', getUploadsSummary)

export default router