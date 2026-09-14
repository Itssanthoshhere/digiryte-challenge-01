# 🛡️ Digiryte Challenge 01 — Secure REST API & Security Intelligence Dashboard

<p align="center">
  <a href="https://digiryte-challenge-01.vercel.app/" target="_blank">
    <img src="https://img.shields.io/badge/🌐_LIVE_DEMO-digiryte--challenge--01.vercel.app-DB4435?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
</p>

Welcome to the **Digiryte Technical Assessment Challenge 01** codebase! 🚀

This repository provides a production-ready, enterprise-grade **Node.js, Express, and TypeScript REST API** bundled with a modern **React 19 + Tailwind CSS** interactive dashboard.

It is designed to be **simple to understand**, **easy to run out-of-the-box**, and **thoroughly documented**, while demonstrating advanced web security patterns.

---

## 📚 Table of Contents

1. [⚡ Quick Start Guide (1-Minute Setup)](#-quick-start-guide-1-minute-setup)
2. [🔑 Pre-Configured Test Personas](#-pre-configured-test-personas)
3. [🛡️ Core Security Features Explained Simply](#️-core-security-features-explained-simply)
   - [1. Dual-Token JWT Auth & Redis Revocation](#1-dual-token-jwt-auth--redis-revocation)
   - [2. Role-Based Access Control (RBAC)](#2-role-based-access-control-rbac)
   - [3. One-Time Nonce Anti-Replay Defense](#3-one-time-nonce-anti-replay-defense)
   - [4. Input Validation & HTML Sanitization](#4-input-validation--html-sanitization)
   - [5. API Rate Limiting](#5-api-rate-limiting)
4. [🖥️ Interactive UI Dashboard Features](#️-interactive-ui-dashboard-features)
5. [📡 Complete API Reference](#-complete-api-reference)
6. [❓ FAQ & Troubleshooting](#-faq--troubleshooting)

---

## ⚡ Quick Start Guide (1-Minute Setup)

You don't need any complex external setup or Redis installation to test this project locally. The backend includes an automatic **in-memory Redis fallback** so it works out-of-the-box on any system!

### Step 1: Install Dependencies

From the repository root directory, run:

```bash
npm install
cd backend && npm install
cd ../client && npm install
cd ..
```

### Step 2: Build the Project

Build the TypeScript backend and Vite React client:

```bash
npm run build
```

### Step 3: Start the Application

Start the unified production server:

```bash
npm start
```

Now open your browser and go to:
👉 **[http://localhost:4000/](http://localhost:4000/)**

---

## 🔑 Pre-Configured Test Personas

The system comes pre-seeded with two default user accounts for instant testing:

| Persona          | Email                | Password       | Access Level & Permissions                                                                   |
| :--------------- | :------------------- | :------------- | :------------------------------------------------------------------------------------------- |
| **Regular User** | `user@digiryte.com`  | `Password123!` | Can view and manage **only assets they own**. Cannot delete other users' assets.             |
| **System Admin** | `admin@digiryte.com` | `Password123!` | Full global access. Can view, create, assign, and delete **all assets across the platform**. |

---

## 🛡️ Core Security Features Explained Simply

### 1. Dual-Token JWT Auth & Redis Revocation

- **Access Token (Short-lived, 15 minutes):** Sent in the `Authorization: Bearer <token>` header for authenticating API requests.
- **Refresh Token (Long-lived, 7 days):** Used to obtain new access tokens without requiring re-login.
- **Instant Revocation:** Unlike standard stateless JWTs, when a user clicks **Logout**, the server extracts the token's unique ID (`jti`) and stores it in a Redis blocklist (`token:revoked:<jti>`). Any subsequent API call using that token is immediately rejected with `401 TOKEN_REVOKED`.

### 2. Role-Based Access Control (RBAC)

Endpoints enforce user roles (`USER` vs `ADMIN`):

- `GET /api/v1/assets`
  - **`USER`**: Returns only assets where `ownerId === user.id`.
  - **`ADMIN`**: Returns all assets across all system users.
- `DELETE /api/v1/assets/:id`
  - **`USER`**: Attempting to delete someone else's asset throws `403 FORBIDDEN`.
  - **`ADMIN`**: Can delete any asset in the system.

### 3. One-Time Nonce Anti-Replay Defense

To protect sensitive financial transfers (`POST /api/v1/transactions/transfer`), the server requires two custom HTTP headers:

- `X-Nonce`: A unique Cryptographic UUID for the request.
- `X-Timestamp`: The client's UNIX timestamp.

**How the Server Prevents Replay Attacks:**

1. **Timestamp Check:** The server verifies that $|T_{\text{server}} - T_{\text{client}}| \le 300\text{ seconds}$ (5 minutes).
2. **Atomic Redis Check:** The server executes `SETNX replay:nonce:<X-Nonce> used EX 300`.
   - **First attempt:** Returns `true` $\rightarrow$ Transfer succeeds.
   - **Second attempt (Replay Attack):** Returns `false` $\rightarrow$ Server blocks request with `409 REPLAY_ATTACK_DETECTED`.

### 4. Input Validation & HTML Sanitization

- All request payloads pass through **Zod schemas** checking email formats, minimum password strength, and numeric ranges.
- String inputs are automatically sanitized using `xss` to strip HTML scripts, preventing Cross-Site Scripting (XSS).

### 5. API Rate Limiting

- **Global Rate Limiter:** Limits requests to `100 requests per 15 minutes` per IP address.
- **Sensitive Rate Limiter:** Protects auth & financial endpoints with a stricter limit of `10 requests per minute`.

---

## 🖥️ Interactive UI Dashboard Features

When you load the app at `http://localhost:4000/`, you get a modern 3-panel security dashboard:

1. **Auth & Identity Panel (Left):**
   - **1-Click Persona Switching:** Instantly log in as Regular User or Admin User.
   - **Token Inspector:** View live JWT Access Token payload (`sub`, `email`, `role`, `jti`, `exp`).
   - **Redis Revocation Controls:** Test active token blocklisting by clicking **Revoke Token / Logout**.

2. **RBAC Assets Panel (Center):**
   - View projects and server compute items.
   - Live badge indicating current permission scope (`USER_OWNED_ONLY` vs `GLOBAL_SYSTEM_ALL`).
   - Try deleting an item owned by another user as `USER` (fails with `403 FORBIDDEN`), then switch to `ADMIN` (succeeds!).

3. **Anti-Replay Transfer Playground (Right):**
   - Perform secure monetary transfers with auto-generated nonces and timestamps.
   - **Simulate Replay Attack:** Click the red **"⚡ Replay Last Nonce (Attacker Simulation)"** button to watch the backend immediately catch and reject the duplicated nonce with `409 REPLAY_ATTACK_DETECTED`.

4. **Real-Time Audit Console (Bottom):**
   - Streams every backend API HTTP request, method, status code, response time, and payload inspection in real time.

---

## 📡 Complete API Reference

Base URL: `/api/v1`

### Authentication Endpoints

| Method | Endpoint         | Auth Required   | Description                                       |
| :----- | :--------------- | :-------------- | :------------------------------------------------ |
| `POST` | `/auth/register` | ❌ No           | Register new user account                         |
| `POST` | `/auth/login`    | ❌ No           | Authenticate user & get access + refresh tokens   |
| `POST` | `/auth/refresh`  | ❌ No           | Obtain new access token using valid refresh token |
| `POST` | `/auth/logout`   | 🔑 Bearer Token | Revoke current access token in Redis blocklist    |
| `GET`  | `/auth/profile`  | 🔑 Bearer Token | Fetch authenticated user profile                  |

### Asset Management Endpoints (RBAC)

| Method   | Endpoint      | Auth Required   | Description                                   |
| :------- | :------------ | :-------------- | :-------------------------------------------- |
| `GET`    | `/assets`     | 🔑 Bearer Token | List assets (USER sees owned, ADMIN sees all) |
| `POST`   | `/assets`     | 🔑 Bearer Token | Create new asset                              |
| `DELETE` | `/assets/:id` | 🔑 Bearer Token | Delete asset (RBAC permission enforced)       |

### Transaction Endpoints (Anti-Replay Protection)

| Method | Endpoint                 | Required Headers                                                            | Description                                   |
| :----- | :----------------------- | :-------------------------------------------------------------------------- | :-------------------------------------------- |
| `POST` | `/transactions/transfer` | `Authorization: Bearer <token>`<br>`X-Nonce: <UUID>`<br>`X-Timestamp: <ms>` | Execute transfer with Anti-Replay nonce check |
| `GET`  | `/transactions`          | `Authorization: Bearer <token>`                                             | List user transaction history                 |

---

## 📁 Codebase File Architecture

```text
digiryte-challenge-01/
├── backend/
│   ├── src/
│   │   ├── app.ts                  # Main Express Server App & Middlewares
│   │   ├── server.ts               # Server Listen Entry Point (Port 4000)
│   │   ├── config/
│   │   │   ├── env.ts              # Zod Environment Variables Loader
│   │   │   └── redis.ts            # Redis Client + In-Memory Fallback Store
│   │   ├── controllers/
│   │   │   ├── authController.ts   # User Auth & Token Revocation Handlers
│   │   │   ├── assetController.ts  # RBAC Asset CRUD Handlers
│   │   │   └── transactionController.ts # Anti-Replay Transfer Handlers
│   │   ├── middleware/
│   │   │   ├── authenticate.ts     # JWT Verification & Revocation Check
│   │   │   ├── authorize.ts        # Role-Based Authorization Guard
│   │   │   ├── preventReplay.ts    # Nonce & Timestamp Verification
│   │   │   ├── rateLimiter.ts      # Express Rate Limiters
│   │   │   ├── validate.ts         # Zod Schema Payload Validation
│   │   │   └── errorHandler.ts     # Centralized Error Format & Handler
│   │   ├── routes/v1/              # Express API Routes
│   │   ├── schemas/                # Zod Validation Schemas
│   │   ├── services/
│   │   │   ├── dbStore.ts          # In-Memory DB & Pre-seeded Accounts
│   │   │   └── tokenService.ts     # Redis Token Revocation Store
│   │   ├── types/                  # TypeScript Interfaces
│   │   └── utils/                  # Cryptography & JWT Helpers
│   └── tests/
│       └── api.test.ts             # Jest Integration Test Suite
│
├── client/
│   ├── src/
│   │   ├── App.jsx                 # Dashboard Layout Container
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Top Header with Health Badge
│   │   │   ├── AuthPanel.jsx       # Persona Switcher & Token Revocation
│   │   │   ├── AssetPanel.jsx      # RBAC Asset Workspace
│   │   │   ├── ReplayPanel.jsx     # Nonce Anti-Replay Simulator
│   │   │   └── TerminalLog.jsx     # Audit Terminal Stream
│   │   ├── context/
│   │   │   ├── AuthContext.jsx     # Auth State Manager
│   │   │   └── LogContext.jsx      # Console Stream Manager
│   │   └── index.css               # Tailwind CSS Base & Theme
│   ├── index.html                  # Main Web Document
│   └── vite.config.js              # Vite Build Configuration
│
└── package.json                    # Root Monorepo Scripts
```
---

## 🚀 100% Free Deployment Guide

This project can be deployed **completely free** without needing paid Redis add-ons or credit cards! The server automatically falls back to an internal TTL memory cache when Redis is absent.

### Option 1: Free Render Web Service (100% Free Tier)
1. Push this repo to GitHub.
2. Go to **Render.com** $\rightarrow$ Click **New +** $\rightarrow$ **Web Service**.
3. Select your GitHub repository.
4. Set:
   - **Build Command:** `npm install --include=optional && cd client && npm install --include=optional && cd .. && npm run build`

   - **Start Command:** `npm start`
   - **Environment Variables:**
     - `NODE_ENV`: `production`
     - `JWT_SECRET`: `your_secure_32_character_secret_key_here`
     - `JWT_REFRESH_SECRET`: `your_secure_32_character_refresh_key_here`

### Option 2: Free Vercel / Railway / Koyeb Deployment
- **Build Command:** `npm run build`
- **Start Command:** `npm start`



---

## ❓ FAQ & Troubleshooting

#### Q: Do I need to install or run Redis locally?

**No.** The backend includes an automated `InMemoryCacheStore` fallback inside [`redis.ts`](file:///Users/sandy/Santhosh/Internship_Trainee/Digiryte%20UK/digiryte-challenge-01/backend/src/config/redis.ts). If Redis is absent, it seamlessly handles token revocations and nonces in memory with full TTL expiry support.

#### Q: Port 4000 is already in use. How do I fix it?

If port `4000` is occupied by another process, kill the existing process or run:

```bash
lsof -ti:4000 | xargs kill -9
```

Then run `npm start` again.

---

### 👨‍💻 Author & Assessment Context

- **Candidate:** Santhosh VS
- **Role:** Technical Trainee / Developer Candidate
- **Prepared For:** Karthik Kumar, CTO, Digiryte
