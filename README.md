# 💬 Whispr – Real-time Chat Application

**Connect. Chat. Share.** 🚀

![Status](https://img.shields.io/badge/Status-Live-success)
![Build](https://img.shields.io/badge/Build-Stable-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Tech Stack](https://img.shields.io/badge/Made%20with-React%20%7C%20Node.js%20%7C%20MongoDB-informational)
![Deployment](https://img.shields.io/badge/Deployment-Vercel%20%7C%20Render-purple)

A modern full-stack real-time chat application with Socket.io, featuring instant messaging, typing indicators, online presence, and media sharing capabilities.

🟢 **All features are live, stable, and deployed in production**

---

## 🌐 Live Application

| Service | URL | Status |
|---------|-----|--------|
| 🎨 **Frontend** | [https://whispr-nine.vercel.app](https://whispr-nine.vercel.app) | ✅ Live |
| ⚙️ **Backend API** | [https://whispr-j7jw.onrender.com](https://whispr-j7jw.onrender.com) | ✅ Live |

👉 **Start Here**: [Whispr App](https://whispr-nine.vercel.app/login)

> ⚠️ **Note**: Backend hosted on Render free tier - first request may take 30-60s to spin up.

---

## 👨‍💻 Developer

| Member | Responsibility | Status |
|--------|----------------|--------|
| **Somesh Pandey** | Full-stack Development & Deployment | ✅ Complete |

📍 **Location**: Lucknow, Uttar Pradesh, India  
🎓 **Education**: Apna College Delta Batch (MERN Stack)

---

## 📦 Project Architecture

### 🎨 Frontend
![React](https://img.shields.io/badge/React-18-blue) ![Vite](https://img.shields.io/badge/Vite-5-purple) ![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-cyan)

**Purpose**: Modern, responsive chat interface with real-time updates.

**Key Features**
- User authentication (Login/Register)
- Real-time messaging
- Online/typing indicators
- Image sharing
- Profile management with avatar upload
- Mobile-first responsive design
- Search & filter users
- Message status (sent/delivered/read)

### ⚙️ Backend API
![Node.js](https://img.shields.io/badge/Node.js-22-green) ![Express](https://img.shields.io/badge/Express-5-black) ![Socket.io](https://img.shields.io/badge/Socket.io-4-white)

**Purpose**: Secure RESTful API with WebSocket support.

**Key Features**
- JWT-based authentication
- Socket.io for real-time events
- Cloudinary media storage
- MongoDB data persistence
- Role-based access control
- CORS protection

---

## 🚀 Quick Start

### Prerequisites
- Node.js 16+
- MongoDB Atlas account
- Cloudinary account

### Installation

```bash
# Clone repository
git clone https://github.com/somesh5368/Whispr.git
cd Whispr
Backend Setup
bash
cd backend
npm install

# Create .env file (see Environment Variables section)
npm start
# Server: http://localhost:5000
Frontend Setup
bash
cd frontend
npm install

# Create .env file (see Environment Variables section)
npm run dev
# App: http://localhost:5173
🔧 Tech Stack
Layer	Technology
Frontend	React 18, Vite, Tailwind CSS, Socket.io Client
Backend	Node.js, Express 5, Socket.io Server
Database	MongoDB Atlas (Mongoose ODM)
Authentication	JWT, bcryptjs
Storage	Cloudinary (images)
Deployment	Vercel (frontend), Render (backend)
📝 Environment Variables
Frontend (frontend/.env)
text
VITE_API_URL=your_backend_url
Backend (backend/.env)
text
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

FRONTEND_URL=your_frontend_url
🔒 Security: Never commit .env files. Use environment variables in deployment platforms.

🔌 API Endpoints
Authentication
text
POST   /api/auth/register      # Create account
POST   /api/auth/login         # User login
User Management
text
GET    /api/users/me           # Get current user
PUT    /api/users/profile      # Update profile
PUT    /api/users/profile/photo # Upload avatar
GET    /api/users/search       # Search users
Messaging
text
GET    /api/messages/recent/contacts        # Get recent chats
GET    /api/messages/:senderId/:receiverId  # Chat history
POST   /api/messages/upload-image           # Upload image
POST   /api/messages/mark-read/:contactId   # Mark as read
Real-time Events (Socket.io)
text
join              # Join user room
sendMessage       # Send message
typing            # Typing indicator
messageDelivered  # Delivery status
messageRead       # Read status
userOnline        # Online presence
✨ Features Delivered
✅ JWT-based secure authentication
✅ Real-time one-to-one messaging
✅ Socket.io WebSocket integration
✅ Image sharing (Cloudinary)
✅ Message status indicators
✅ Online/typing indicators
✅ User search functionality
✅ Profile management with avatar
✅ Unread message badges
✅ Fully responsive UI
✅ Production deployment

🎯 Future Enhancements
 Group chat

 Voice/video calls (WebRTC)

 Message reactions

 Dark mode

 End-to-end encryption

 Push notifications

 Stories feature

📁 Project Structure
text
Whispr/
├── backend/
│   ├── config/          # Database & Cloudinary
│   ├── controllers/     # Business logic
│   ├── middleware/      # Auth & file upload
│   ├── models/          # Mongoose schemas
│   ├── routes/          # API routes
│   ├── sockets/         # Socket.io handlers
│   └── server.js        # Entry point
│
└── frontend/
    ├── src/
    │   ├── pages/       # React pages
    │   ├── component/   # Reusable components
    │   ├── utils/       # Socket client
    │   └── App.jsx      # Root component
    └── index.css        # Tailwind config
🌳 Git Workflow
main → Production (protected 🔒)

feature/* → Feature development

Commit Convention:

feat: New feature

fix: Bug fix

docs: Documentation

style: UI/formatting

🔒 Security Features
✅ JWT authentication
✅ Password hashing (bcrypt)
✅ CORS whitelist
✅ Input validation
✅ File upload limits (5MB, images only)
✅ Authorization checks
✅ HTTPS in production

📞 Contact & Support
Somesh Pandey

📧 Email: sp5368@gmail.com

💼 GitHub: @somesh5368

📍 Location: Lucknow, UP, India

Project Repository: https://github.com/somesh5368/Whispr

🙏 Acknowledgments
Apna College – Delta Batch MERN Training

Shradha Khapra – Course Instructor

Socket.io – Real-time engine

MongoDB Atlas – Database hosting

Cloudinary – Media storage

Vercel & Render – Deployment platforms

📝 License
This project is for educational and portfolio purposes.

Academic Project | 2026

<div align="center">
Built with ❤️ by Somesh Pandey

⭐ Star this repo if you find it helpful!

Last Updated: January 2026
Default Branch: main

</div> ```
