# Root .env.example

# Backend configuration
BACKEND_PORT=4000
BACKEND_HOST_PORT=0.0.0.0

# Frontend URLs
FRONTEND_URL=http://your-frontend-host:3000
WEBPER_URL=http://your-performance-server:5000
CUSTOM_IPFS_API=http://your-ipfs-host:5000/api/files

# MongoDB connection string (replace with your own credentials)
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority&appName=Cluster0

# JWT secret key
JWT_SECRET=your_jwt_secret_here

# Node environment
NODE_ENV=development

# VirusTotal config
VIRUSTOTAL_API_KEY=your_virustotal_api_key_here
VIRUSTOTAL_URL=https://www.virustotal.com/api/v3/files



# smartcontract/.env.example

# Ethereum / blockchain config
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-alchemy-api-key
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
CONTRACT_ADDRESS=0xYourContractAddressHere

# Reference:
# Replace CONTRACT_ADDRESS with your deployed contract address,
# e.g. 0x4C60D5A5c6e6ff456C3Df77F46dd011039930672


# frontend/.env.example

# Backend API base URL
VITE_API_BASE_URL=http://your-backend-host:4000     # IP address of backend

# Performance server
VITE_PERFORMANCE_IP=http://your-performance-host:5000   # IP of performance server

# Custom IPFS node
VITE_CUSTOM_IPFS_API=http://your-ipfs-node:5005/api/files/ # Custom IPFS node URL

# Chatbot server
VITE_CHAT_URL=http://your-chatbot-host:5010  # AI chatbot service
