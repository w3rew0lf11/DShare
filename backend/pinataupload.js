import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Load API Keys from .env
const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

// Function to upload file to Pinata
async function uploadFile(filePath) {
  try {
    const data = new FormData();
    data.append('file', fs.createReadStream(filePath));

    const pinataMetadata = JSON.stringify({
      name: 'DShare_File', // Change this as needed
    });

    data.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 1,
    });

    data.append('pinataOptions', pinataOptions);

    const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', data, {
      maxContentLength: Infinity,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
        pinata_api_key: PINATA_API_KEY,
        pinata_secret_api_key: PINATA_SECRET_KEY,
      },
    });

    console.log('✅ File uploaded successfully!');
    console.log('🔗 CID:', response.data.IpfsHash);
    console.log('🌍 View at: https://gateway.pinata.cloud/ipfs/' + response.data.IpfsHash);
  } catch (error) {
    console.error('❌ Upload failed:', error.response ? error.response.data : error.message);
  }
}

// Example usage
const filePath = '/mnt/media/DShare/backend/index.js'; // Replace with your file path
uploadFile(filePath);
