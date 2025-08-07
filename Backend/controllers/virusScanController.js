import VirusScanLog from '../models/virusScanLogModel.js'

export const getUploadsSummary = async (req, res) => {
  try {
    const uploadsSummary = await VirusScanLog.aggregate([
      {
        $group: {
          _id: '$username',
          maliciousUploadCount: {
            $sum: {
              $cond: [{ $eq: ['$virusScan.fileStatus', 'MALICIOUS'] }, 1, 0],
            },
          },
          cleanUploadCount: {
            $sum: {
              $cond: [{ $eq: ['$virusScan.fileStatus', 'CLEAN'] }, 1, 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          username: '$_id',
          maliciousUploadCount: 1,
          cleanUploadCount: 1,
        },
      },
      {
        $sort: { maliciousUploadCount: -1 },
      },
    ])
    console.log('Uploads Summary:', uploadsSummary)

    res.json(uploadsSummary)
  } catch (err) {
    console.error('Error fetching uploads summary:', err)
    res.status(500).json({ error: 'Failed to fetch uploads summary' })
  }
}