# 🎓 DBASE Learning AI
### ระบบเรียนรู้วิชาโปรแกรมฐานข้อมูลอัจฉริยะ (รหัสวิชา 21910-2012)
**Intelligent Database Learning Management System with AI Assistant**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-emerald?style=flat-square&logo=supabase)](https://supabase.com/)
[![Gemini AI](https://img.shields.io/badge/Google%20Gemini-AI%20Assistant-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?style=flat-square&logo=vercel)](https://dbase-learning.vercel.app)

---

## 📖 เกี่ยวกับระบบ (Overview)

**DBASE Learning AI** คือระบบบริหารจัดการการเรียนรู้อัจฉริยะ (Intelligent LMS) ที่พัฒนาขึ้นสำหรับการเรียนการสอนในรายวิชา **โปรแกรมฐานข้อมูล (Database Program)** มุ่งเน้นการยกระดับประสบการณ์การเรียนรู้ของผู้เรียนผ่านเทคโนโลยีปัญญาประดิษฐ์ (AI) พร้อมระบบติดตามความก้าวหน้าและการประเมินผลแบบ Real-time 

🌐 **เข้าใช้งานระบบจริง (Live Production):** [https://dbase-learning.vercel.app](https://dbase-learning.vercel.app)

---

## ✨ ฟีเจอร์เด่นของระบบ (Key Features)

### 🧑‍🎓 สำหรับนักเรียน (Student Portal)
- 📊 **Dashboard ภาพรวมการเรียนรู้:** ติดตามชั่วโมงเรียน, เปอร์เซ็นต์ความก้าวหน้า, คะแนนสะสม (XP) และสถานะการเรียนแบบ Real-time
- 📚 **บทเรียนและสื่อมัลติมีเดีย:** เนื้อหาบทเรียนตามหลักสูตร สื่อวิดีโอ ใบความรู้ และโค้ดตัวอย่าง SQL / ER-Diagram
- 🤖 **AI ผู้ช่วยสอน 24 ชม. (Gemini AI Tutor):** แชทบอทอัจฉริยะที่ช่วยตอบคำถาม แก้ไขปัญหาโค้ด SQL และอธิบายแนวคิดเรื่องฐานข้อมูลได้ตลอดเวลา
- 📝 **ระบบทำแบบทดสอบ & ส่งใบงาน:** รองรับข้อสอบปรนัย-อัตนัย พร้อมระบบส่งไฟล์งานออนไลน์ และรับข้อเสนอแนะ/คะแนนจากคุณครู
- 📈 **กราฟวิเคราะห์ผลการสอบ (Exam Evaluation):** แสดงจุดแข็ง-จุดที่ต้องพัฒนาและสถิติคะแนนรายหน่วยอย่างละเอียด
- 💬 **กล่องข้อความ Real-time:** ส่งข้อความปรึกษาและพูดคุยกับคุณครูผู้สอนได้โดยตรง
- 🏆 **ระบบเกียรติบัตรอัตโนมัติ (E-Certificate):** ออกใบประกาศนียบัตรเมื่อเรียนจบรายวิชาหรือหน่วยการเรียน พร้อมระบบสั่งพิมพ์ขนาด A4 แนวนอนตามมาตรฐาน

---

### 👨‍🏫 สำหรับครูผู้สอนและผู้ดูแลระบบ (Teacher / Admin Portal)
- 📈 **ภาพรวมสถิติระบบ (System Analytics):** วิเคราะห์ผู้เรียนกลุ่มเสี่ยง (At-Risk Students) และรายงาน Item Analysis ของข้อสอบ
- 📖 **ระบบจัดการหลักสูตร (Curriculum Management):** สร้าง แก้ไข จัดหมวดหมู่บทเรียน และจัดลำดับเนื้อหาด้วยระบบ Drag & Drop
- 🪄 **ระบบสร้างข้อสอบอัตโนมัติด้วย AI (AI Quiz Generator):** ให้ Gemini AI ช่วยออกข้อสอบตามหัวข้อบทเรียนและระดับความยากได้ในคลิกเดียว
- ✍️ **ระบบตรวจงานและข้อเขียน (Grading Center):** ตรวจใบงาน ให้คะแนน และแนบข้อเสนอแนะส่งตรงถึงนักเรียน
- 👥 **ระบบจัดการนักเรียน (Student Management):** ดูความก้าวหน้า บันทึกคะแนน และส่งออกข้อมูลเป็นไฟล์ Excel
- 🧑‍💼 **ระบบจัดการครูผู้สอนหลายบัญชี (Multi-Teacher Support):** รองรับการเพิ่ม ลบ จัดการสิทธิ์ และแยกโปรไฟล์ส่วนตัวของคุณครูแต่ละท่าน
- 💬 **Admin Inbox Realtime:** รับและตอบกลับข้อความนักเรียนแบบทันท่วงที
- 📜 **ประวัติการใช้งาน AI (AI Chat Logs):** ตรวจสอบคำถาม-คำตอบระหว่างนักเรียนกับ AI เพื่อนำมาพัฒนาการสอน
- ⚙️ **ตั้งค่าสถาบัน & ระบบ (System Settings):** กำหนดชื่อสถานศึกษา โลโก้ และจำกัดโดเมนอีเมลของสถานศึกษา (@svc.ac.th ฯลฯ)

---

## 🛠️ สถาปัตยกรรมและเทคโนโลยี (Tech Stack)

| ส่วนประกอบ | เทคโนโลยีที่เลือกใช้ |
| :--- | :--- |
| **Frontend Framework** | [Next.js 16 (App Router)](https://nextjs.org/) + React 19 |
| **Language** | TypeScript |
| **Styling & UI** | [Tailwind CSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/) + Glassmorphism Theme |
| **Database & Auth** | [Supabase](https://supabase.com/) (PostgreSQL, Realtime Subscriptions, Row Level Security) |
| **AI Integration** | [Google Gemini AI API](https://ai.google.dev/) (`@google/genai`) |
| **File Storage** | Supabase Storage (ไฟล์ใบงาน, รูปโปรไฟล์, โลโก้) |
| **Deployment & CI/CD** | [Vercel](https://vercel.com/) (Connected to GitHub `main` branch) |

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
ai-lms/
├── public/                     # ไฟล์ Asset สาธารณะ (รูปภาพ, ไอคอน, สื่อการสอน)
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # ระบบยืนยันตัวตน (Login, SignUp, OAuth)
│   │   ├── admin/              # ระบบจัดการสำหรับครูผู้สอน (Admin Portal)
│   │   │   ├── ai-logs/        # ตรวจสอบประวัติคุย AI
│   │   │   ├── courses/        # จัดการหลักสูตรและเนื้อหาบทเรียน
│   │   │   ├── grading/        # ตรวจงานและให้คะแนน
│   │   │   ├── inbox/          # กล่องข้อความกับนักเรียน
│   │   │   ├── settings/       # ตั้งค่าระบบและโปรไฟล์ครู
│   │   │   ├── students/       # รายชื่อและคะแนนนักเรียน
│   │   │   └── teachers/       # จัดการบัญชีครูผู้สอน
│   │   ├── student/            # ระบบการเรียนสำหรับนักเรียน (Student Portal)
│   │   │   ├── certificates/   # ดูและพิมพ์เกียรติบัตร
│   │   │   ├── courses/        # รายการบทเรียนทั้งหมด
│   │   │   ├── dashboard/      # แดชบอร์ดภาพรวมการเรียน
│   │   │   ├── learn/[id]/     # หน้าห้องเรียนและทำแบบทดสอบ
│   │   │   ├── messages/       # กล่องข้อความคุยกับครู
│   │   │   └── profile/        # ข้อมูลโปรไฟล์และสถิติสะสม
│   │   └── api/                # Backend API Routes (Chatbot, Quiz Generator, Auth)
│   ├── components/             # React Components (Admin & Student UI)
│   ├── data/                   # คลังความรู้และชุดข้อมูลสำหรับ AI Chatbot
│   └── utils/                  # Utility Functions (Supabase Client, Auth Helpers, Database Queries)
├── .env.example                # แม่แบบการตั้งค่า Environment Variables
└── package.json                # ข้อมูล Dependencies และคำสั่ง Script
```

---

## 🚀 การติดตั้งและรันในเครื่อง (Local Development)

### 1. โคลน Repository
```bash
git clone https://github.com/Pannawat2904/dbase-learning.git
cd dbase-learning
```

### 2. ติดตั้ง Dependencies
```bash
npm install
```

### 3. ตั้งค่า Environment Variables
คัดลอกไฟล์ `.env.example` เป็น `.env.local` แล้วกรอกค่า Keys:
```bash
cp .env.example .env.local
```
กำหนดค่าใน `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
GEMINI_API_KEY=your-gemini-api-key
```

### 4. รัน Development Server
```bash
npm run dev
```
เปิดเบราว์เซอร์แล้วเข้าใช้งานที่ [http://localhost:3000](http://localhost:3000)

---

## 🔒 ความปลอดภัยและการจัดการข้อมูล (Security)
- มีการใช้ **HTTP-Only Cookies** และการเข้ารหัสแบบ **HMAC Cryptographic Signing** สำหรับ Session ครูผู้สอน
- ป้องกันการเข้าถึงหน้า Admin ด้วย **Next.js Middleware** และตรวจสอบสิทธิ์ระดับ Server-Side
- แยกการเก็บ Sensitive Keys ทั้งหมดไว้ใน Environment Variables โดยไม่ถูกเปิดเผยขึ้น Version Control

---

## 👨‍💻 ผู้พัฒนาและข้อมูลติดต่อ (Author)

- **ครูปาณวัฐ รักรอดจิต** และคณะผู้พัฒนา
- **สถาบัน:** วิทยาลัยอาชีวศึกษาสุราษฎร์ธานี (Surat Thani Vocational College)
- **GitHub:** [@Pannawat2904](https://github.com/Pannawat2904)

---
*จัดทำขึ้นเพื่อการวิจัยและพัฒนาการจัดการเรียนรู้วิชาโปรแกรมฐานข้อมูลด้วยเทคโนโลยีปัญญาประดิษฐ์*
