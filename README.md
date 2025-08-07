<h1 align="center">🚀 D_Share</h1>
<p align="center">A blockchain-powered decentralized file sharing system blending IPFS, Smart Contracts, Centralized DB, AI, and Monitoring.</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" />
  <img src="https://img.shields.io/badge/Built%20With-JavaScript%20%7C%20Python%20%7C%20Solidity-ff69b4" />
  <img src="https://img.shields.io/badge/Status-Active-brightgreen" />
</p>

---

## 🚀 Quick Start (Run in this order!)

1. 🧬 **Clone the repository**

```bash
git clone git@github.com:w3rew0lf11/DShare.git
cd DShare
```

2. ⚙️ **Set up your environment variables**

```bash
cp .env.example .env
cp smartcontract/.env.example smartcontract/.env
cp frontend/.env.example frontend/.env
```

Fill in the `.env` files with your keys and URLs as explained below.

3. 🧠 **Deploy Smart Contract**

```bash
cd smartcontract
npm install
npx hardhat run scripts/deploy.js --network sepolia
```

> 🔑 Remember your deployer wallet will be the admin.

4. 🛠️ **Start the Backend Server**

```bash
cd ..
npm install
npm start
```

5. 🌐 **Start the Frontend**

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

6. 📡 **Run IPFS Nodes on 3–4 machines**

On each machine, run:

```bash
cd ipfs
python main.py
```

Check the dashboard:

```
http://<node-ip>:<port>/dashboard
```

7. 🤖 **Start AI Chatbot**

```bash
cd ../DShare_AI_ChatBot_Updated
python app.py
```

8. 📈 **Start Performance Monitoring**

- Server:

```bash
cd ../performance
python web_monitor.py
```

- Remote Agent (on each monitored system):

```bash
python remote_agent.py
```

---

## ⚙️ Environment Variables Setup Guide

<details>
<summary>🔹 Root `.env` (Click to expand)</summary>

```env
BACKEND_PORT=4000
BACKEND_HOST_PORT=0.0.0.0
FRONTEND_URL=http://localhost:3000
WEBPER_URL=http://localhost:5000
CUSTOM_IPFS_API=http://localhost:5005/api/files
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/db?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret
NODE_ENV=development
VIRUSTOTAL_API_KEY=your_virustotal_key
VIRUSTOTAL_URL=https://www.virustotal.com/api/v3/files
```
</details>

<details>
<summary>🔹 `smartcontract/.env`</summary>

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_key
CONTRACT_ADDRESS=0xYourContract
```
</details>

<details>
<summary>🔹 `frontend/.env`</summary>

```env
VITE_API_BASE_URL=http://localhost:4000
VITE_PERFORMANCE_IP=http://localhost:5000
VITE_CUSTOM_IPFS_API=http://localhost:5005/api/files/
VITE_CHAT_URL=http://localhost:5010
```
</details>

---

## 🎉 Features

- 📁 Upload / Download files  
- 🔐 File access control: **Private**, **Public**, **Shared**  
- 👥 Share files with users  
- 💬 Real-time chat system  
- 🦠 Virus scanning (VirusTotal integration)  
- 🛡️ Admin user block/unblock  
- 📊 Live performance monitoring  
- 🤖 AI chatbot assistant  

---

## 🤝 Contributing

We welcome all contributions!

- Report bugs 🐞  
- Star the repo ⭐  
- Submit PRs 🚀  
- Improve docs 📚  

---

## 🛡️ License

MIT License © 2025 — [w3rew0lf11](https://github.com/w3rew0lf11)

---

<p align="center"><i>💀 Built for privacy-conscious users who love decentralization & performance.</i></p>
