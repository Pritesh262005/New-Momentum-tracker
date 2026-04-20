# 📊 ALMTS Architecture & Data Flow Diagrams

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        ALMTS SYSTEM                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    FRONTEND (React)                       │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  TeacherProfileCard Component                      │  │   │
│  │  │  - Display experience                              │  │   │
│  │  │  - Show qualifications                             │  │   │
│  │  │  - List certifications                             │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    BACKEND (Node.js)                      │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  API Endpoints                                     │  │   │
│  │  │  - GET /api/teacher/profile                        │  │   │
│  │  │  - GET /api/admin/users/:id                        │  │   │
│  │  │  - PATCH /api/admin/users/:id                      │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  User Model (Updated)                              │  │   │
│  │  │  - yearsOfExperience                               │  │   │
│  │  │  - joinedYear                                      │  │   │
│  │  │  - qualifications                                  │  │   │
│  │  │  - specialization                                  │  │   │
│  │  │  - publications                                    │  │   │
│  │  │  - certifications                                  │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              ↓                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  DATABASE (MongoDB)                       │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Users Collection                                  │  │   │
│  │  │  - Admin (1)                                       │  │   │
│  │  │  - HOD (1)                                         │  │   │
│  │  │  - Teachers (7) with experience details            │  │   │
│  │  │  - Students (40) with study data                   │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │  Related Collections                               │  │   │
│  │  │  - StudyLogs (400)                                 │  │   │
│  │  │  - Mood (400)                                      │  │   │
│  │  │  - MomentumScore (calculated)                      │  │   │
│  │  │  - Badges (awarded)                                │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## 👥 User Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                    ALMTS USER HIERARCHY                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ADMIN (1)                                                   │
│  └─ admin@almts.com                                         │
│     └─ Manages everything                                   │
│                                                              │
│  CSE DEPARTMENT                                              │
│  ├─ HOD (1)                                                 │
│  │  └─ hod.cse@almts.com                                    │
│  │     └─ Manages department                                │
│  │                                                           │
│  ├─ TEACHERS (7)                                            │
│  │  ├─ Senior (5 years) - 3                                 │
│  │  │  ├─ teacher1@almts.com                                │
│  │  │  ├─ teacher2@almts.com                                │
│  │  │  └─ teacher3@almts.com                                │
│  │  │                                                        │
│  │  └─ Junior (2 years) - 4                                 │
│  │     ├─ teacher4@almts.com                                │
│  │     ├─ teacher5@almts.com                                │
│  │     ├─ teacher6@almts.com                                │
│  │     └─ teacher7@almts.com                                │
│  │                                                           │
│  └─ STUDENTS (40)                                           │
│     ├─ Year 1 (10)                                          │
│     │  └─ Semester 1                                        │
│     ├─ Year 2 (10)                                          │
│     │  └─ Semester 3                                        │
│     ├─ Year 3 (10)                                          │
│     │  └─ Semester 5                                        │
│     └─ Year 4 (10)                                          │
│        └─ Semester 7                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Teacher Experience Distribution

```
┌──────────────────────────────────────────────────────────┐
│         TEACHER EXPERIENCE DISTRIBUTION                   │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  5 YEARS EXPERIENCE (3 Teachers)                          │
│  ████████████████████████████████████████ 42.9%          │
│  ├─ Prof. Rajesh Kumar (teacher1@almts.com)              │
│  ├─ Prof. Priya Sharma (teacher2@almts.com)              │
│  └─ Prof. Amit Patel (teacher3@almts.com)                │
│                                                           │
│  2 YEARS EXPERIENCE (4 Teachers)                          │
│  ████████████████████████████████████████████████ 57.1%  │
│  ├─ Prof. Neha Verma (teacher4@almts.com)                │
│  ├─ Prof. Sanjay Singh (teacher5@almts.com)              │
│  ├─ Prof. Anjali Gupta (teacher6@almts.com)              │
│  └─ Prof. Vikram Reddy (teacher7@almts.com)              │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## 📚 Student Distribution by Year

```
┌──────────────────────────────────────────────────────────┐
│         STUDENT DISTRIBUTION BY YEAR                      │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  YEAR 1 (Semester 1) - 10 Students                        │
│  ██████████ 25%                                           │
│  ├─ Aarav Shah                                            │
│  ├─ Nitya Rao                                             │
│  ├─ Ishaan Patel                                          │
│  ├─ Sara Khan                                             │
│  ├─ Vikram Nair                                           │
│  ├─ Priya Desai                                           │
│  ├─ Rohan Gupta                                           │
│  ├─ Ananya Iyer                                           │
│  ├─ Arjun Mehta                                           │
│  └─ Kavya Nair                                            │
│                                                           │
│  YEAR 2 (Semester 3) - 10 Students                        │
│  ██████████ 25%                                           │
│  ├─ Siddharth Bose                                        │
│  ├─ Meera Pillai                                          │
│  ├─ Karthik Nair                                          │
│  ├─ Divya Sharma                                          │
│  ├─ Aditya Verma                                          │
│  ├─ Neha Kapoor                                           │
│  ├─ Rahul Menon                                           │
│  ├─ Pooja Singh                                           │
│  ├─ Varun Kumar                                           │
│  └─ Shreya Patel                                          │
│                                                           │
│  YEAR 3 (Semester 5) - 10 Students                        │
│  ██████████ 25%                                           │
│  ├─ Abhishek Reddy                                        │
│  ├─ Preethi Raj                                           │
│  ├─ Nikhil Joshi                                          │
│  ├─ Anjali Verma                                          │
│  ├─ Aryan Singh                                           │
│  ├─ Diya Nair                                             │
│  ├─ Harsh Patel                                           │
│  ├─ Isha Sharma                                           │
│  ├─ Jatin Kumar                                           │
│  └─ Kriti Gupta                                           │
│                                                           │
│  YEAR 4 (Semester 7) - 10 Students                        │
│  ██████████ 25%                                           │
│  ├─ Akshay Desai                                          │
│  ├─ Bhavna Iyer                                           │
│  ├─ Chirag Patel                                          │
│  ├─ Deepika Nair                                          │
│  ├─ Eshan Reddy                                           │
│  ├─ Fiona Khan                                            │
│  ├─ Gaurav Singh                                          │
│  ├─ Hema Sharma                                           │
│  ├─ Ishan Verma                                           │
│  └─ Jaya Gupta                                            │
│                                                           │
│  TOTAL: 40 Students                                       │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    SEED SCRIPT FLOW                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. CONNECT TO DATABASE                                      │
│     └─ MongoDB Connection                                   │
│                                                              │
│  2. CLEAR EXISTING DATA                                      │
│     └─ Remove Students & Teachers (keep Admin/HOD)          │
│                                                              │
│  3. CREATE TEACHERS (7)                                      │
│     ├─ 3 with 5 years experience                            │
│     └─ 4 with 2 years experience                            │
│        └─ Add qualifications, certifications, etc.          │
│                                                              │
│  4. CREATE CLASSES (4)                                       │
│     ├─ Y1-S1 (Year 1, Semester 1)                           │
│     ├─ Y2-S3 (Year 2, Semester 3)                           │
│     ├─ Y3-S5 (Year 3, Semester 5)                           │
│     └─ Y4-S7 (Year 4, Semester 7)                           │
│                                                              │
│  5. CREATE STUDENTS (40)                                     │
│     ├─ 10 per year                                          │
│     └─ Assign to classes                                    │
│                                                              │
│  6. GENERATE STUDY DATA                                      │
│     ├─ 10 days of study logs per student                    │
│     ├─ 10 days of mood tracking per student                 │
│     └─ Random topics and subjects                           │
│                                                              │
│  7. CALCULATE MOMENTUM SCORES                                │
│     ├─ Last 2 weeks of data                                 │
│     └─ Per student calculation                              │
│                                                              │
│  8. AWARD BADGES                                             │
│     └─ Based on performance                                 │
│                                                              │
│  9. COMPLETE                                                 │
│     └─ Display credentials                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 📈 Teacher Experience Details

```
┌──────────────────────────────────────────────────────────┐
│      SENIOR TEACHER (5 Years Experience)                  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Name: Prof. Rajesh Kumar                                 │
│  Email: teacher1@almts.com                                │
│  Experience: 5 years                                      │
│  Joined: 2019                                             │
│                                                           │
│  Qualifications:                                          │
│  ✓ B.Tech (Bachelor of Technology)                        │
│  ✓ M.Tech (Master of Technology)                          │
│  ✓ PhD (Doctor of Philosophy)                             │
│                                                           │
│  Certifications:                                          │
│  ✓ AWS Certified Solutions Architect                      │
│  ✓ Google Cloud Certified Professional                    │
│                                                           │
│  Specializations:                                         │
│  • Data Structures                                        │
│  • Algorithms                                             │
│  • Database Systems                                       │
│                                                           │
│  Publications: 5-15 research papers                       │
│                                                           │
└──────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────┐
│      JUNIOR TEACHER (2 Years Experience)                  │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Name: Prof. Neha Verma                                   │
│  Email: teacher4@almts.com                                │
│  Experience: 2 years                                      │
│  Joined: 2022                                             │
│                                                           │
│  Qualifications:                                          │
│  ✓ B.Tech (Bachelor of Technology)                        │
│  ✓ M.Tech (Master of Technology)                          │
│                                                           │
│  Certifications:                                          │
│  ✓ AWS Certified Solutions Architect                      │
│                                                           │
│  Specializations:                                         │
│  • Operating Systems                                      │
│  • Machine Learning                                       │
│                                                           │
│  Publications: 0-3 research papers                        │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

## 🗄️ Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                    USER COLLECTION                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Basic Fields:                                               │
│  ├─ _id (ObjectId)                                          │
│  ├─ name (String)                                           │
│  ├─ email (String, unique)                                  │
│  ├─ password (String, hashed)                               │
│  ├─ role (ADMIN, HOD, TEACHER, STUDENT)                     │
│  └─ userId (String, unique)                                 │
│                                                              │
│  Teacher-Specific Fields:                                    │
│  ├─ yearsOfExperience (Number)                              │
│  ├─ joinedYear (Number)                                     │
│  ├─ qualifications (Array of Strings)                       │
│  ├─ specialization (Array of Strings)                       │
│  ├─ publications (Number)                                   │
│  └─ certifications (Array of Strings)                       │
│                                                              │
│  Student-Specific Fields:                                    │
│  ├─ rollNumber (String)                                     │
│  ├─ class (ObjectId ref)                                    │
│  ├─ year (Number)                                           │
│  ├─ semester (Number)                                       │
│  ├─ xpPoints (Number)                                       │
│  └─ currentStreak (Number)                                  │
│                                                              │
│  Common Fields:                                              │
│  ├─ department (ObjectId ref)                               │
│  ├─ isActive (Boolean)                                      │
│  ├─ isFirstLogin (Boolean)                                  │
│  ├─ badges (Array of ObjectIds)                             │
│  └─ timestamps (createdAt, updatedAt)                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Seed Script Execution Timeline

```
┌─────────────────────────────────────────────────────────────┐
│              SEED SCRIPT EXECUTION TIMELINE                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  npm run seed:new                                            │
│  │                                                           │
│  ├─ [1] Connect to MongoDB                                  │
│  │   └─ ✓ Connected                                         │
│  │                                                           │
│  ├─ [2] Clear existing data                                 │
│  │   └─ ✓ Removed students & teachers                       │
│  │                                                           │
│  ├─ [3] Create 7 teachers                                   │
│  │   ├─ ✓ teacher1@almts.com (5 years)                      │
│  │   ├─ ✓ teacher2@almts.com (5 years)                      │
│  │   ├─ ✓ teacher3@almts.com (5 years)                      │
│  │   ├─ ✓ teacher4@almts.com (2 years)                      │
│  │   ├─ ✓ teacher5@almts.com (2 years)                      │
│  │   ├─ ✓ teacher6@almts.com (2 years)                      │
│  │   └─ ✓ teacher7@almts.com (2 years)                      │
│  │                                                           │
│  ├─ [4] Create 4 classes                                    │
│  │   ├─ ✓ CSE-Y1-S1                                         │
│  │   ├─ ✓ CSE-Y2-S3                                         │
│  │   ├─ ✓ CSE-Y3-S5                                         │
│  │   └─ ✓ CSE-Y4-S7                                         │
│  │                                                           │
│  ├─ [5] Create 40 students                                  │
│  │   ├─ ✓ 10 Year 1 students                                │
│  │   ├─ ✓ 10 Year 2 students                                │
│  │   ├─ ✓ 10 Year 3 students                                │
│  │   └─ ✓ 10 Year 4 students                                │
│  │                                                           │
│  ├─ [6] Generate study logs (400 total)                     │
│  │   └─ ✓ 10 per student                                    │
│  │                                                           │
│  ├─ [7] Generate mood tracking (400 total)                  │
│  │   └─ ✓ 10 per student                                    │
│  │                                                           │
│  ├─ [8] Calculate momentum scores                           │
│  │   └─ ✓ For all students                                  │
│  │                                                           │
│  ├─ [9] Award badges                                        │
│  │   └─ ✓ Based on performance                              │
│  │                                                           │
│  └─ [10] Complete                                           │
│      └─ ✓ Seed complete!                                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

**Version:** 1.0.0
**Date:** 2024
**Status:** Complete
