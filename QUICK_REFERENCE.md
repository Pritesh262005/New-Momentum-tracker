# 🎯 ALMTS Database Seeding - Quick Reference

## 📊 Data Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    ALMTS DATABASE STRUCTURE                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ADMIN (1)                                                   │
│  └─ admin@almts.com / Admin@123                             │
│                                                              │
│  CSE DEPARTMENT                                              │
│  ├─ HOD: Dr. Rajesh Kumar                                   │
│  │  └─ hod.cse@almts.com / HOD@123                          │
│  │                                                           │
│  ├─ TEACHERS (7)                                            │
│  │  ├─ 5 Years Experience (3)                               │
│  │  │  ├─ teacher1@almts.com (Prof. Rajesh Kumar)           │
│  │  │  ├─ teacher2@almts.com (Prof. Priya Sharma)           │
│  │  │  └─ teacher3@almts.com (Prof. Amit Patel)            │
│  │  │                                                        │
│  │  └─ 2 Years Experience (4)                               │
│  │     ├─ teacher4@almts.com (Prof. Neha Verma)            │
│  │     ├─ teacher5@almts.com (Prof. Sanjay Singh)          │
│  │     ├─ teacher6@almts.com (Prof. Anjali Gupta)          │
│  │     └─ teacher7@almts.com (Prof. Vikram Reddy)          │
│  │                                                           │
│  └─ STUDENTS (40)                                           │
│     ├─ Year 1 (10) - Semester 1                             │
│     ├─ Year 2 (10) - Semester 3                             │
│     ├─ Year 3 (10) - Semester 5                             │
│     └─ Year 4 (10) - Semester 7                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start Commands

```bash
# 1. Navigate to backend
cd backend

# 2. Run seed script
npm run seed:new

# 3. Start backend (in terminal 1)
npm run dev

# 4. Start frontend (in terminal 2)
cd ../frontend
npm run dev

# 5. Open browser
http://localhost:5173
```

## 🔐 Login Credentials

### Teachers (All: Teacher@123)
```
teacher1@almts.com  ⭐⭐⭐⭐⭐ (5 years)
teacher2@almts.com  ⭐⭐⭐⭐⭐ (5 years)
teacher3@almts.com  ⭐⭐⭐⭐⭐ (5 years)
teacher4@almts.com  ⭐⭐ (2 years)
teacher5@almts.com  ⭐⭐ (2 years)
teacher6@almts.com  ⭐⭐ (2 years)
teacher7@almts.com  ⭐⭐ (2 years)
```

### Students (All: Student@123)
```
Year 1: aarav.shah@student.almts.com
Year 2: siddharth.bose@student.almts.com
Year 3: abhishek.reddy@student.almts.com
Year 4: akshay.desai@student.almts.com
```

### Admin & HOD
```
admin@almts.com / Admin@123
hod.cse@almts.com / HOD@123
```

## 📈 Teacher Experience Details

### 5 Years Experience Teachers
```
✓ Qualifications: B.Tech, M.Tech, PhD
✓ Certifications: AWS Certified, Google Cloud Certified
✓ Publications: 5-15
✓ Joined: 2019
✓ Specializations: Multiple areas
```

### 2 Years Experience Teachers
```
✓ Qualifications: B.Tech, M.Tech
✓ Certifications: AWS Certified
✓ Publications: 0-3
✓ Joined: 2022
✓ Specializations: 1-2 areas
```

## 📚 Student Data Generated

Each student gets:
```
✓ 10 days of study logs
✓ 10 days of mood tracking
✓ Momentum score calculations
✓ Badge awards
✓ XP points
✓ Leaderboard ranking
```

## 🔄 Seed Script Options

```bash
# Option 1: Fresh seed (removes students/teachers only)
npm run seed:new

# Option 2: Complete fresh seed (removes everything)
npm run seed

# Option 3: Seed if empty (safe for production)
npm run seed:if-empty
```

## 📊 Database Verification

```javascript
// Check counts
db.users.countDocuments({ role: "TEACHER" })      // 7
db.users.countDocuments({ role: "STUDENT" })      // 40
db.users.countDocuments({ role: "STUDENT", year: 1 })  // 10
db.users.countDocuments({ role: "STUDENT", year: 2 })  // 10
db.users.countDocuments({ role: "STUDENT", year: 3 })  // 10
db.users.countDocuments({ role: "STUDENT", year: 4 })  // 10

// Check experience
db.users.countDocuments({ role: "TEACHER", yearsOfExperience: 5 })  // 3
db.users.countDocuments({ role: "TEACHER", yearsOfExperience: 2 })  // 4
```

## 📁 Files Changed

### New Files
```
✓ backend/seedNewData.js
✓ frontend/src/components/common/TeacherProfileCard.jsx
✓ SEEDING_GUIDE.md
✓ UPDATE_SUMMARY.md
✓ TEACHER_EXPERIENCE_GUIDE.md
✓ QUICK_REFERENCE.md (this file)
```

### Modified Files
```
✓ backend/models/User.js (added experience fields)
✓ backend/package.json (added seed:new script)
```

## 🎯 Key Features

### Teacher Experience Tracking
- Years of experience (2 or 5)
- Join year (2019 or 2022)
- Qualifications (B.Tech, M.Tech, PhD)
- Specializations (multiple)
- Publications count
- Certifications (AWS, GCP, etc.)

### Student Management
- 10 students per year
- 4 years total (40 students)
- Study logs and mood tracking
- Momentum score calculation
- Badge and XP system

### Department Structure
- CSE Department
- 1 HOD
- 7 Teachers
- 40 Students
- 4 Year groups

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| MongoDB Connection Error | Check MONGODB_URI in .env |
| Seed Script Fails | Verify Node 18+, run `npm install` |
| Port Already in Use | Run `npx kill-port 5000` |
| Data Not Showing | Verify seed completed, check MongoDB |

## 📞 Support Resources

1. **SEEDING_GUIDE.md** - Detailed seeding instructions
2. **UPDATE_SUMMARY.md** - Summary of all changes
3. **TEACHER_EXPERIENCE_GUIDE.md** - Complete feature guide
4. **QUICK_REFERENCE.md** - This file

## ✅ Verification Checklist

- [ ] MongoDB is running
- [ ] .env file configured
- [ ] Node 18+ installed
- [ ] Dependencies installed (`npm install`)
- [ ] Seed script executed (`npm run seed:new`)
- [ ] Backend started (`npm run dev`)
- [ ] Frontend started (`npm run dev`)
- [ ] Can login with credentials
- [ ] Data visible in dashboard

## 🎓 Next Steps

1. ✅ Run seed script
2. ✅ Start backend and frontend
3. ✅ Login with teacher account
4. ✅ View teacher profile with experience
5. ✅ Login with student account
6. ✅ View student dashboard
7. ✅ Explore features

---

**Version:** 1.0.0
**Last Updated:** 2024
**Status:** ✅ Ready to Use
