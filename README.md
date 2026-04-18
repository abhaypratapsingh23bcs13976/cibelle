# Cibelle - Luxury Food Delivery Platform

"Indulge in Excellence"

A premium, scalable, multi-user food delivery application built for high-end dining experiences.

## 🎨 Design Theme
- **Primary**: Luxury Black (#0F0F0F)
- **Secondary**: Gold (#D4AF37 / #F1C40F)
- **Aesthetic**: Glassmorphism, abstract background elements (The "Big Yellow Circle"), and smooth animations.

## 🚀 Tech Stack
- **Frontend**: Vanilla HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Node.js + Express.js
- **Database**: PostgreSQL (SQL Script provided)
- **Security**: JWT Authentication, Bcrypt Hashing, Helmet, CORS
- **Real-time**: Socket.io

## 📁 Project Structure
```
Cibelle/
├── frontend/           # Luxury UI & Client Logic
│   ├── css/            # Premium Styles
│   ├── js/             # API & UI State (inc. Hindi Toggle)
│   └── *.html          # Panels (User, Admin, Ambassador)
├── backend/            # Express.js API
│   ├── routes/         # Modular API Endpoints
│   ├── package.json    # Dependencies
│   └── index.js        # Server Entry Point
└── database/           # SQL Schema & ER Diagram
    └── schema.sql      # Database initialization script
```

## 🛠️ Setup Instructions

### 1. Prerequisites
- Node.js installed on Windows.
- PostgreSQL installed on Windows.

### 2. Database Setup
1. Open your PostgreSQL client (e.g., pgAdmin or psql).
2. Create a new database named `cibelle`.
3. Run the script found in `database/schema.sql`.

### 3. Backend Setup
1. Open a terminal in the `backend/` folder.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the `backend/` folder:
   ```env
   PORT=5000
   DATABASE_URL=postgres://your_user:your_password@localhost:5432/cibelle
   JWT_SECRET=luxury_secret
   ```
4. Start the server:
   ```bash
   npm start
   ```

### 4. Frontend Setup
1. Simply open `frontend/index.html` in your browser.
2. Note: To allow API communication, ensure the backend is running.

## 🌐 API Routes Documentation

### Auth
- `POST /api/auth/signup`: Membership registration.
- `POST /api/auth/login`: Access the club.

### Restaurants
- `GET /api/restaurants`: View all luxury establishments.
- `GET /api/restaurants/:id`: Details for a specific venue.

## 🇮🇳 Multi-Language Support
Toggle between **English** and **Hindi** using the gold button at the bottom left of the screen.

---
*Created for college project & placement showcase.*
