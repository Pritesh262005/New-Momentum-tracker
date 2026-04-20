# 🎓 ALMTS - Database Seeding & Teacher Experience Features

## 📌 Overview

This document outlines the recent updates to the ALMTS project, including:
- New database seeding script with 7 teachers and 40 students
- Teacher experience details tracking
- Enhanced student data generation
- Frontend component for displaying teacher profiles

---

## 🔄 What Changed

### Backend Changes

#### 1. **New Seed Script: `seedNewData.js`**
- Removes all existing students and teachers
- Preserves admin and HOD accounts
- Creates 7 teachers with experience details
- Creates 40 students (10 per year)
- Generates study logs and mood data
- Calculates momentum scores

#### 2. **Updated User Model**
Added teacher experience fields:
```javascript
{
  yearsOfExperience: Number,      // 2 or 5 years
  joinedYear: Number,              // 2019 or 2022
  qualifications: [String],        // B.Tech, M.Tech, PhD
  specialization: [String],        // Subject areas
  publications: Number,            // Research count
  certifications: [String]         // Professional certs
}
```

#### 3. **Updated package.json**
Added new npm script:
```json
"seed:new": "node seedNewData.js"
```

### Frontend Changes

#### 1. **New Component: `TeacherProfileCard.jsx`**
Displays teacher experience details with:
- Years of experience
- Join year
- Qualifications
- Specializations
- Certifications
- Publications count
- Experience level badge

---

## 📊 Data Structure

### Teachers (7 Total)

| Name | Email | Experience | Joined | Qualifications | Certifications |
|------|-------|------------|--------|----------------|-----------------|
| Prof. Rajesh Kumar | teacher1@almts.com | 5 years | 2019 | B.Tech, M.Tech, PhD | AWS, GCP |
| Prof. Priya Sharma | teacher2@almts.com | 5 years | 2019 | B.Tech, M.Tech, PhD | AWS, GCP |
| Prof. Amit Patel | teacher3@almts.com | 5 years | 2019 | B.Tech, M.Tech, PhD | AWS, GCP |
| Prof. Neha Verma | teacher4@almts.com | 2 years | 2022 | B.Tech, M.Tech | AWS |
| Prof. Sanjay Singh | teacher5@almts.com | 2 years | 2022 | B.Tech, M.Tech | AWS |
| Prof. Anjali Gupta | teacher6@almts.com | 2 years | 2022 | B.Tech, M.Tech | AWS |
| Prof. Vikram Reddy | teacher7@almts.com | 2 years | 2022 | B.Tech, M.Tech | AWS |

### Students (40 Total)

**Year 1 (10 students):**
Aarav Shah, Nitya Rao, Ishaan Patel, Sara Khan, Vikram Nair, Priya Desai, Rohan Gupta, Ananya Iyer, Arjun Mehta, Kavya Nair

**Year 2 (10 students):**
Siddharth Bose, Meera Pillai, Karthik Nair, Divya Sharma, Aditya Verma, Neha Kapoor, Rahul Menon, Pooja Singh, Varun Kumar, Shreya Patel

**Year 3 (10 students):**
Abhishek Reddy, Preethi Raj, Nikhil Joshi, Anjali Verma, Aryan Singh, Diya Nair, Harsh Patel, Isha Sharma, Jatin Kumar, Kriti Gupta

**Year 4 (10 students):**
Akshay Desai, Bhavna Iyer, Chirag Patel, Deepika Nair, Eshan Reddy, Fiona Khan, Gaurav Singh, Hema Sharma, Ishan Verma, Jaya Gupta

---

## 🚀 Quick Start

### Step 1: Run the Seed Script
```bash
cd backend
npm run seed:new
```

### Step 2: Start Backend
```bash
npm run dev
```

### Step 3: Start Frontend (in another terminal)
```bash
cd frontend
npm run dev
```

### Step 4: Login
Visit `http://localhost:5173` and login with:
- **Teacher:** teacher1@almts.com / Teacher@123
- **Student:** aarav.shah@student.almts.com / Student@123
- **Admin:** admin@almts.com / Admin@123

---

## 📋 Login Credentials

### All Teachers (Password: Teacher@123)
```
teacher1@almts.com  (5 years exp)
teacher2@almts.com  (5 years exp)
teacher3@almts.com  (5 years exp)
teacher4@almts.com  (2 years exp)
teacher5@almts.com  (2 years exp)
teacher6@almts.com  (2 years exp)
teacher7@almts.com  (2 years exp)
```

### Sample Students (Password: Student@123)
```
aarav.shah@student.almts.com        (Year 1)
siddharth.bose@student.almts.com    (Year 2)
abhishek.reddy@student.almts.com    (Year 3)
akshay.desai@student.almts.com      (Year 4)
```

### Admin & HOD
```
admin@almts.com / Admin@123
hod.cse@almts.com / HOD@123
```

---

## 🔍 Database Verification

### Check MongoDB Collections

```javascript
// Count teachers
db.users.countDocuments({ role: "TEACHER" })
// Expected: 7

// Count students
db.users.countDocuments({ role: "STUDENT" })
// Expected: 40

// Count by year
db.users.countDocuments({ role: "STUDENT", year: 1 })  // 10
db.users.countDocuments({ role: "STUDENT", year: 2 })  // 10
db.users.countDocuments({ role: "STUDENT", year: 3 })  // 10
db.users.countDocuments({ role: "STUDENT", year: 4 })  // 10

// Check experience distribution
db.users.countDocuments({ role: "TEACHER", yearsOfExperience: 5 })  // 3
db.users.countDocuments({ role: "TEACHER", yearsOfExperience: 2 })  // 4

// View teacher details
db.users.findOne({ role: "TEACHER", yearsOfExperience: 5 })
```

---

## 📁 Files Modified/Created

### New Files
```
backend/seedNewData.js
frontend/src/components/common/TeacherProfileCard.jsx
SEEDING_GUIDE.md
UPDATE_SUMMARY.md
```

### Modified Files
```
backend/models/User.js
backend/package.json
```

---

## 🎯 Features

### Teacher Experience Tracking
- ✅ Years of experience (2 or 5)
- ✅ Join year (2019 or 2022)
- ✅ Qualifications (B.Tech, M.Tech, PhD)
- ✅ Specializations (multiple)
- ✅ Publications count
- ✅ Certifications (AWS, GCP, etc.)

### Student Data Generation
- ✅ 10 days of study logs per student
- ✅ 10 days of mood tracking
- ✅ Momentum score calculations
- ✅ Badge awards
- ✅ XP points

### Department Structure
- ✅ CSE Department with HOD
- ✅ 4 Year groups (Y1-S1, Y2-S3, Y3-S5, Y4-S7)
- ✅ 7 Teachers assigned to all years
- ✅ 40 Students distributed across years

---

## 🛠️ Troubleshooting

### Issue: MongoDB Connection Error
**Solution:**
```bash
# Check MongoDB is running
# Verify MONGODB_URI in .env
# Example: mongodb+srv://user:pass@cluster.mongodb.net/almts
```

### Issue: Seed Script Fails
**Solution:**
```bash
# Check Node version (requires 18+)
node --version

# Reinstall dependencies
npm install

# Try again
npm run seed:new
```

### Issue: Port Already in Use
**Solution:**
```bash
# Kill process on port 5000
npx kill-port 5000

# Or specify different port
PORT=5001 npm run dev
```

---

## 📚 API Endpoints for Teacher Data

### Get Teacher Profile
```
GET /api/teacher/profile
Response: { yearsOfExperience, joinedYear, qualifications, ... }
```

### Get Teacher Details (Admin)
```
GET /api/admin/users/:id
Response: Full user object with experience details
```

### Update Teacher Experience (Admin)
```
PATCH /api/admin/users/:id
Body: { yearsOfExperience, qualifications, certifications, ... }
```

---

## 🎨 Frontend Integration

### Using TeacherProfileCard Component

```jsx
import TeacherProfileCard from './components/common/TeacherProfileCard';

function TeacherPage({ teacher }) {
  return <TeacherProfileCard teacher={teacher} />;
}
```

### Display in Teacher List

```jsx
{teachers.map(teacher => (
  <div key={teacher._id} className="card p-4">
    <h3>{teacher.name}</h3>
    <p>{teacher.yearsOfExperience} years experience</p>
    <div className="flex gap-2">
      {teacher.qualifications?.map(q => (
        <span key={q} className="badge badge-indigo">{q}</span>
      ))}
    </div>
  </div>
))}
```

---

## 📝 Notes

- The seed script preserves existing admin and HOD accounts
- All students are assigned to CSE department
- Teachers are assigned to all year groups
- Study data is generated for the last 10 days
- Momentum scores are calculated for the last 2 weeks
- Each student gets random study topics and subjects

---

## 🔄 Seed Script Options

### Option 1: Fresh Seed (Recommended)
```bash
npm run seed:new
```
- Removes all students and teachers
- Keeps admin and HOD
- Creates fresh data

### Option 2: Complete Fresh Seed
```bash
npm run seed
```
- Removes everything
- Creates all data from scratch

### Option 3: Seed if Empty
```bash
npm run seed:if-empty
```
- Only seeds if database is empty
- Safe for production

---

## 🎓 Educational Features

Each student gets:
- ✅ Study logs with topics and accuracy
- ✅ Mood tracking for mental health
- ✅ Momentum score (performance metric)
- ✅ Badges for achievements
- ✅ XP points for gamification
- ✅ Leaderboard ranking

Each teacher gets:
- ✅ Experience tracking
- ✅ Qualification records
- ✅ Specialization areas
- ✅ Publication count
- ✅ Professional certifications
- ✅ Class assignments

---

## 📞 Support

For issues or questions:
1. Check SEEDING_GUIDE.md
2. Review UPDATE_SUMMARY.md
3. Check MongoDB logs
4. Verify .env configuration

---

**Last Updated:** 2024
**Version:** 1.0.0
**Status:** ✅ Production Ready
