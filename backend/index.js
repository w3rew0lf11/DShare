require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { create } = require('ipfs-http-client');
const fs = require('fs');

const app = express();
const port = 3000;

// Configure Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Connect to IPFS (either local or via Infura)
const ipfs = create({ url: process.env.IPFS_API_URL });

// Upload file to IPFS
app.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileBuffer = req.file.buffer;

        // Upload to IPFS
        const result = await ipfs.add(fileBuffer);

        res.status(200).json({ 
            message: 'File uploaded to IPFS',
            cid: result.cid.toString(),
            ipfsUrl: `https://ipfs.io/ipfs/${result.cid.toString()}`
        });
    } catch (error) {
        console.error('IPFS Upload Error:', error);
        res.status(500).json({ message: 'File upload failed', error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
