# Lost & Found Portal
**AI-Powered Item Recovery System for Campus**

A complete, working full-stack website based on the Software Requirements Specification (SRS) for the Lost & Found Portal project.

Prepared by: Abhinand K, Azeem Firas P, Muhammad Ameen P, Suryadev I U, Viswanathan K  
Department of Computer Engineering, Government Polytechnic College, Chelakkara  
Academic Year 2025–26

---

## Features Implemented

### Functional Requirements (from SRS)
| ID  | Feature                                      | Status |
|-----|--------------------------------------------------|--------|
| FR1 | User registration with name, email, password     | ✅     |
| FR2 | Email verification before login                  | ✅     |
| FR3 | Secure login                                     | ✅     |
| FR4 | Password reset via emailed code                  | ✅     |
| FR5 | Submit lost/found report + optional photo        | ✅     |
| FR6 | AI text-matching on title, description, location | ✅     |
| FR7 | Display ranked suggested matches                 | ✅     |
| FR8 | View own reports + status                        | ✅     |
| FR9 | Browse & filter open reports                     | ✅     |
| FR10| Update status (Open / Matched / Returned)        | ✅     |
| FR11| Admin can view & manage all reports              | ✅     |

### Non-Functional
- Passwords hashed with **bcrypt**
- Sessions via **JWT**
- Rate limiting on auth endpoints
- Lightweight offline AI (Jaccard similarity on tokens — no paid APIs or GPU)
- Responsive modern UI (works on mobile browsers too)
- Photo uploads (max 5 MB)
- SQLite database (single file, easy to deploy)

---

## Tech Stack

| Layer     | Technology                  |
|-----------|-----------------------------|
| Backend   | Node.js + Express           |
| Database  | SQLite (better-sqlite3)     |
| Auth      | JWT + bcryptjs              |
| Frontend  | Vanilla JS + Tailwind CSS    |
| File Upload | Multer                    |
| AI Engine | Custom token Jaccard (utils/matching.js) |

---

## How to Run (Local)

### 1. Prerequisites
- Node.js 18+ installed ([https://nodejs.org](https://nodejs.org))

### 2. Install dependencies
```bash
cd lost-found-portal
npm install
```

### 3. Initialize the database
```bash
npm run init-db
```
This creates `db/lostfound.db` and a default admin account.

### 4. Start the server
```bash
npm start
```
Open **http://localhost:3000** in your browser.

### Default Admin Login
```
Email:    admin@college.edu
Password: Admin@123
```
(You can change these in the `.env` file)

---

## Demo Mode Notes (Important)

Because this is an academic/demo project with no paid email service:

- **Verification codes** and **password reset codes** are printed to the **server console** (the terminal where you ran `npm start`).
- The registration and forgot-password responses also return the code in a `demoVerificationCode` / `demoResetCode` field so you can see it in the browser toast as well.
- In a real production system you would replace the `console.log` with actual email sending (Nodemailer + Gmail/SMTP or a service like Resend).

---

## Project Structure

```
lost-found-portal/
├── package.json
├── server.js              ← Main entry point
├── .env                   ← Config (JWT secret, admin credentials)
├── db/
│   ├── init.js            ← Creates tables + admin user
│   └── lostfound.db       ← SQLite database (created on init)
├── routes/
│   ├── auth.js            ← Register, login, verify, reset
│   ├── reports.js         ← CRUD + matching + photo upload
│   └── admin.js           ← Admin dashboard endpoints
├── middleware/
│   └── auth.js            ← JWT authentication + admin check
├── utils/
│   └── matching.js        ← Lightweight AI text-similarity engine
└── public/                ← Frontend (served statically)
    ├── index.html
    ├── css/style.css
    ├── js/app.js
    └── uploads/           ← Photo storage
```

---

## How the AI Matching Works

When a new report is submitted:

1. The system loads all **Open** reports of the **opposite type** (lost ↔ found).
2. For each candidate it computes a similarity score using **token Jaccard similarity**:
   - Title weight: 40%
   - Description weight: 40%
   - Location weight: 20%
   - Exact category match bonus: +0.15
3. Scores ≥ 0.22 are kept and ranked.
4. Top matches are shown immediately after submission and also stored for later viewing.

This keeps the system fast, explainable, dependency-free, and runnable on free-tier hosting with no GPU.

---

## Deployment (Free Tier)

Works well on **Render**, **Railway**, or any Node host:

1. Push the folder to a GitHub repo.
2. Create a new Web Service on Render.
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables from `.env`.

**Note:** Free tiers often use ephemeral storage. The SQLite file will reset on redeploy. For permanent storage use a volume or switch to PostgreSQL later.

---

## Quick Test Flow

1. Register a new user → copy the verification code from the terminal (or toast).
2. Verify email → you are logged in.
3. Report a **Lost** item (e.g. “Black Samsung phone”, Library, Electronics).
4. Log out, register another user, report a similar **Found** item.
5. You should see AI-suggested matches with a similarity percentage.
6. Update status to “Matched” or “Returned”.
7. Login as admin to see the full dashboard.

---

## License

MIT — Academic / educational use.
