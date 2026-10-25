# AgriProfit 🌾📊

> **Farm Financial Tracker & Annual Profitability Analytics for Farmers**

AgriProfit is a modern, high-contrast, responsive farm financial dashboard designed for agricultural producers, farm managers, and agronomists. It helps farmers track cash flow, monitor enterprise margins, record crop inputs & harvests, and analyze annual profitability.

---

## ✨ Features

- **📊 Comprehensive Financial Analytics**: Total revenue, operating expenses, net farm profit, and operating margins.
- **🌱 Enterprise Performance Breakdown**: Profitability tracking across crops (Corn, Soybeans, Wheat, etc.) with input costs vs. yield sales.
- **☀️ High-Contrast Daylight Mode**: Specially calibrated high-contrast outdoor mode for field visibility under direct sunlight.
- **🌍 Trilingual Interface**: Built-in support for English (**EN**), Afaan Oromoo (**AF**), and Amharic (**AM**).
- **💾 Offline-First Architecture**: Works directly in the browser with `localStorage` persistence, with optional PostgreSQL + Express backend for multi-user authentication.
- **📥 CSV Ledger Export**: Export all farm transactions and financial data directly to CSV.

---

## 🚀 Quick Start (Browser / Offline Mode)

You can run AgriProfit directly without installing any backend or database:

1. Simply open `index.html` in your web browser (or use VS Code Live Server).
2. Create an account or sign in with your email and password.
3. Your data is automatically saved locally in your browser!

---

## 🛠️ Full-Stack Setup (Node.js & PostgreSQL)

If you wish to run the full-stack version with centralized PostgreSQL authentication and session cookies:

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [PostgreSQL](https://www.postgresql.org/) (v14+)

### 1. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update `.env` with your database credentials:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/agriprofit
SESSION_SECRET=your_32_character_long_session_secret_key_here
PORT=3000
NODE_ENV=development
```

### 2. Initialize Database
Run the schema in PostgreSQL:
```bash
psql -U postgres -d agriprofit -f schema.sql
```

### 3. Install Dependencies & Start Server
```bash
npm install
npm start
```

Visit `http://localhost:3000` in your browser.

---

## 📁 Project Structure

```text
├── index.html        # Main application UI and dashboard
├── app.js            # Core analytics engine, UI controllers, and offline/online auth
├── server.js         # Express.js backend with PostgreSQL session management
├── schema.sql        # Database schema for users, sessions, and transactions
├── calculations.py   # Python reference analytics engine
├── package.json      # Node.js dependencies and scripts
└── README.md         # Project documentation
```

---

## 📄 License

ISC License.
