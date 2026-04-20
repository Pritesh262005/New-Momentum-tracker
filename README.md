# 🎓 ALMTS — Academic Learning Momentum Tracker System

A complete full-stack MERN application for academic management with role-based access, gamification, news system, MCQ tests, PDF assignments, and automated email account creation.

## 🚀 Quick Start (3 Commands)

```bash
npm run install:all
cp backend/.env.example backend/.env  # then fill in your MongoDB URI and SMTP details
npm run seed && npm run dev
```

Access the application at **http://localhost:5173**

## 🔑 Default Login Accounts

| Role    | Email                        | Password     |
|---------|------------------------------|--------------|
| Admin   | admin@almts.com              | Admin@123    |
| HOD     | hod.cse@almts.com            | HOD@123      |
| Teacher | teacher1@almts.com           | Teacher@123  |
| Student | arjun.mehta@student.almts.com| Student@123  |

## 📧 Gmail App Password Setup (Required for Email)

1. Enable 2-Step Verification on your Google Account
2. Go to Google Account → Security → App Passwords
3. Create password for "Mail" → ALMTS
4. Paste the 16-char password as `SMTP_PASS` in `.env`

## 🎯 Features by Role

### ADMIN
- ✅ Create HOD/Teacher/Student accounts (auto-emails credentials)
- ✅ Auto-generate secure 12-char temporary passwords
- ✅ Manage departments and view audit logs
- ✅ Post news to: ALL_USERS, ALL_HOD, SPECIFIC_HOD, ALL_DEPARTMENTS, SPECIFIC_DEPARTMENT, ALL_TEACHERS, ALL_STUDENTS
- ✅ Reset passwords and deactivate/reactivate accounts
- ✅ Bulk user creation (up to 50 users)

### HOD (Head of Department)
- ✅ Department analytics and teacher performance comparison
- ✅ Post news to: DEPT_ALL, DEPT_TEACHERS, DEPT_STUDENTS, SPECIFIC_DEPT_HOD
- ✅ View at-risk students in department
- ✅ Monitor department-wide momentum scores

### TEACHER
- ✅ Create MCQ tests with auto-grading (A+/A/B/C/D/F)
- ✅ Create PDF assignments (max 20MB)
- ✅ Grade student submissions with feedback and rubric
- ✅ Post news to: CLASS_STUDENTS only (own class)
- ✅ View class analytics and at-risk students
- ✅ Late submission detection with penalty

### STUDENT
- ✅ Take MCQ tests (auto-graded with instant results)
- ✅ Submit PDF assignments (max 10MB)
- ✅ Log study sessions with duration and accuracy
- ✅ Daily mood tracking
- ✅ View personalized recommendations
- ✅ Earn badges and XP points
- ✅ View leaderboards (class/department/institution)
- ✅ Track momentum score and streak 🔥

## 📰 News & Comment System

Each news post has **two independent toggle switches** (author + admin only):

1. **Comments ON/OFF** - Master switch
   - When OFF: no comments shown, no input, completely hidden
   
2. **Comments Lock** - Freeze new comments
   - When locked: existing comments visible but NO new ones allowed
   - Shows "locked" banner, hides input box
   - Cannot lock when comments are disabled

## 📊 Momentum Score Algorithm

```
MS = (0.4 × Consistency) + (0.3 × Improvement) + (0.2 × Focus) + (0.1 × Mood)

Where:
- Consistency = (study days / 7) × 100
- Improvement = week-over-week accuracy change
- Focus = average accuracy across sessions
- Mood = average mood level × 20
```

## Momentum Score 2.0 (Free ML)

The student dashboard (`GET /api/student/dashboard`) includes a `momentumScore2` payload computed locally (no paid APIs):

- Prediction: TensorFlow.js linear regression on the last ~12 weekly momentum scores → predicts next week’s momentum.
- Anomaly detection: flags unusual week-to-week changes using residual z-score (useful for spotting sudden drops/spikes).

## AI Tutor (Free NLP Models)

ALMTS includes an **AI Tutor** that can generate:
- Explanations for **wrong MCQ answers**
- Short **feedback text** for a completed MCQ attempt

Backend endpoints (requires auth):
- `POST /api/ai-tutor/mcq/explain` (body: `{ attemptId, questionIndex }`)
- `POST /api/ai-tutor/mcq/feedback` (body: `{ attemptId }`)

By default it calls Hugging Face's free Inference API (limited). If it fails or no token is configured, it falls back to a local rule-based response.

## News Moderation (Free NLP)

Comments on news posts are moderated on the backend using a lightweight free NLP approach:
- Keyword filter (bad words + harmful phrases)
- Simple lexicon sentiment score (negative sentiment + negative keywords) to block toxic comments

Config in `backend/.env`:
- `NEWS_MODERATION_ENABLED=true`
- `NEWS_BAD_WORDS=...` (optional)
- `NEWS_BLOCK_PHRASES=...` (optional)
- `NEWS_SENTIMENT_BLOCK_THRESHOLD=-0.6`

## Study Session Analyzer (Free Stats)

The backend can analyze your study logs (no paid APIs) and flag:
- Low consistency: if your longest gap between study days is **> 3 days**
- Accuracy drop: if your recent accuracy average drops by **> 15%**

Endpoint:
- `GET /api/student/study-analysis?days=30`

## Assignment System (Free Tools)

- Plagiarism check (TF-IDF cosine similarity on PDF submissions):
  - Teacher/HOD endpoint: `GET /api/assignments/:id/plagiarism`
  - Config: `PLAGIARISM_THRESHOLD=0.78`
- Code submissions (optional): create an assignment with `submissionType=CODE_JS` and define simple input/output tests.
  - Autograde is disabled by default; enable with `CODE_AUTOGRADE_ENABLED=true` and `CODE_AUTOGRADE_ACK_RISK=true`.

## 🎮 Gamification System

| Badge | Criteria | XP Reward |
|-------|----------|-----------|
| 🔥 STREAK_MASTER | 7 consecutive study days | +100 XP |
| 🎯 ACCURACY_EXPERT | 90%+ average accuracy | +150 XP |
| ⏱️ TIME_CHAMPION | 20+ hours/week | +120 XP |
| 📈 MOMENTUM_KING | Score > 80 | +200 XP |
| 🏆 TOP_PERFORMER | Top 10 institution-wide | +500 XP |

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (7-day expiry)
- **Security**: bcrypt, Helmet, express-rate-limit
- **Email**: Nodemailer (SMTP)
- **File Upload**: Multer (PDF only)
- **Process Manager**: PM2 (production)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Font**: Nunito (Google Fonts)

## 📁 Project Structure

```
almts/
├── backend/
│   ├── config/          # Database connection
│   ├── controllers/     # 11 controllers (auth, admin, hod, teacher, student, news, mcq, assignment, etc.)
│   ├── middleware/      # Auth, RBAC, error handler
│   ├── models/          # 17 Mongoose models
│   ├── routes/          # 11 route files
│   ├── services/        # Email, momentum, rule engine, gamification
│   ├── utils/           # Token, password generator, audit logger
│   ├── uploads/         # Assignment & submission PDFs
│   ├── .env             # Environment variables
│   ├── server.js        # Entry point
│   └── seedDatabase.js  # Demo data seeder
└── frontend/
    └── src/
        ├── api/         # Axios configuration
        ├── components/  # React components
        ├── context/     # Auth & Theme context
        ├── pages/       # Login, Dashboards
        └── App.jsx      # Router setup
```

## 🔐 Security Features

- ✅ JWT authentication with 7-day expiry
- ✅ Role-based access control (RBAC)
- ✅ Password hashing with bcrypt (10 rounds)
- ✅ Rate limiting (100 req/15min)
- ✅ Helmet security headers
- ✅ Input validation
- ✅ Audit logging for admin actions
- ✅ Temporary password expiry (48 hours)
- ✅ File type validation (PDF only)
- ✅ File size limits (20MB assignments, 10MB submissions)

## 📡 API Endpoints

### Auth Routes (`/api/auth`)
- `POST /login` - User login
- `POST /change-password` - Change password
- `GET /me` - Get current user

### Admin Routes (`/api/admin`)
- `POST /create-hod` - Create HOD account
- `POST /create-teacher` - Create teacher account
- `POST /create-student` - Create student account
- `POST /create-bulk` - Bulk user creation (max 50)
- `GET /users` - Get all users (paginated)
- `PATCH /users/:id/deactivate` - Deactivate user
- `POST /users/:id/reset-password` - Reset password
- `GET /dashboard` - Admin dashboard stats

### Teacher Routes (`/api/teacher`)
- `GET /dashboard` - Teacher dashboard
- `GET /students` - Get class students
- `GET /students/:id` - Get student detail

### Student Routes (`/api/student`)
- `POST /study-logs` - Create study log
- `POST /mood` - Log daily mood
- `GET /analytics` - Get student analytics
- `GET /recommendations` - Get recommendations
- `GET /badges` - Get earned badges

### MCQ Routes (`/api/mcq`)
- `POST /` - Create test (TEACHER)
- `PATCH /:id/publish` - Publish test
- `GET /available` - Get available tests (STUDENT)
- `POST /:id/start` - Start attempt
- `POST /attempt/:id/submit` - Submit attempt
- `GET /attempt/:id/result` - Get result

### Assignment Routes (`/api/assignments`)
- `POST /` - Create assignment (TEACHER)
- `POST /:id/submit` - Submit assignment (STUDENT)
- `PUT /submissions/:id/grade` - Grade submission (TEACHER)
- `GET /:id/file` - View assignment PDF
- `GET /submissions/:id/file` - View submission PDF

### News Routes (`/api/news`)
- `POST /` - Create news (ADMIN/HOD/TEACHER)
- `GET /` - Get all news (filtered by role)
- `PATCH /:id/toggle-comments` - Toggle comments on/off
- `PATCH /:id/toggle-lock` - Lock/unlock comments
- `POST /:id/comment` - Add comment
- `POST /:id/like` - Toggle like

## 🚀 Production Deployment (Ubuntu + Nginx + PM2)

### Prerequisites
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
sudo apt install -y mongodb

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### Deployment Steps

1. **Clone and Install**
```bash
git clone <your-repo-url> /var/www/almts
cd /var/www/almts
npm run install:all
```

2. **Configure Environment**
```bash
cp backend/.env.example backend/.env
nano backend/.env  # Fill in production values
```

3. **Build Frontend**
```bash
npm run build
```

4. **Start Backend with PM2**
```bash
cd backend
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup  # Follow instructions
```

5. **Configure Nginx**
```bash
sudo cp almts.nginx.conf /etc/nginx/sites-available/almts
sudo ln -s /etc/nginx/sites-available/almts /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

6. **Future Deployments**
```bash
chmod +x deploy.sh
./deploy.sh
```

## ☁️ Deploy (Vercel Frontend + Render Backend)

### 1) Deploy Backend to Render
- Create a **Web Service**
- **Root Directory**: `backend`
- **Build Command**: `npm ci`
- **Start Command**: `npm start`
- Add environment variables in Render (copy keys from `backend/.env.example`)
  - Set `NODE_ENV=production`
  - Set `FRONTEND_URL` to your Vercel site (no trailing slash)
  - (Optional) If you use Vercel preview URLs: set `ALLOW_VERCEL_APP_ORIGINS=true`
- After deploy, verify: `GET https://<render-service>.onrender.com/api/health`
- Seed initial data once (safe): `cd backend && npm run seed:if-empty`

### 2) Deploy Frontend to Vercel
- Import the repo in Vercel
- **Root Directory**: `frontend`
- Add env var: `VITE_API_URL=https://<render-service>.onrender.com`
- Redeploy after changing env vars (Vite env vars are build-time).

## 🧪 Development Mode

```bash
# Terminal 1 - Backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2 - Frontend (http://localhost:5173)
cd frontend
npm run dev

# OR use concurrently (from root)
npm run dev
```

## 📝 Environment Variables

### Backend `.env`
```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
# MongoDB Atlas (example)
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster-host>/almts?retryWrites=true&w=majority
# Local MongoDB (example)
# MONGODB_URI=mongodb://localhost:27017/almts
JWT_SECRET=your_super_secret_key_minimum_32_characters
JWT_EXPIRE=7d
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-gmail@gmail.com
SMTP_PASS=your-16-char-gmail-app-password
EMAIL_FROM=ALMTS <noreply@almts.com>
TEMP_PASSWORD_EXPIRY_HOURS=48
MAX_ASSIGNMENT_MB=20
MAX_SUBMISSION_MB=10
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:5000
VITE_APP_NAME=ALMTS
```

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
sudo systemctl status mongodb
sudo systemctl start mongodb
```

- If you're using MongoDB Atlas: ensure your current IP is added to Atlas Network Access (IP Access List), and the database user/password in `MONGODB_URI` is correct.
- If you see `querySrv ECONNREFUSED _mongodb._tcp...` (DNS/SRV lookup failing): set `DNS_SERVERS=8.8.8.8,1.1.1.1` in `backend/.env` (or fix your system DNS to allow SRV lookups).

### Email Not Sending
- Verify Gmail App Password (not regular password)
- Check 2-Step Verification is enabled
- Email sending is wrapped in try-catch (won't crash app)

### Port Already in Use
```bash
# Kill process on port 5000
npx kill-port 5000
```

### PM2 Not Starting
```bash
# Check logs
pm2 logs almts-backend
pm2 restart almts-backend
```

## 📚 Additional Documentation

- **QUICKSTART.md** - Step-by-step setup guide
- **PROJECT_SUMMARY.md** - Feature overview
- **PROJECT_COMPLETE.md** - Implementation checklist

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🎓 Built With

- **Passion** for education technology
- **MERN Stack** expertise
- **Gamification** principles
- **Best Practices** in security and architecture

---

**Status**: ✅ PRODUCTION READY  
**Version**: 1.0.0  
**Last Updated**: 2024

🎓 **ALMTS — Level Up Your Learning!**
