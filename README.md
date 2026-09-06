# 🏢 SAIS Inspection Schedule Booking System
### ระบบบริหารจัดการและจองคิวตรวจรับลิฟต์-บันไดเลื่อน (SAIS Schedule Booking)

ระบบเว็บแอปพลิเคชันสำหรับจัดการตารางงานตรวจรับลิฟต์และบันไดเลื่อนแบบเรียลไทม์ รองรับการทำงานทั้งบน Desktop, Tablet และ Mobile (iOS / Android)

---

## 🚀 วิธีการนำขึ้น GitHub (Step-by-Step Guide)

หากคุณดาวน์โหลดไฟล์โปรเจกต์นี้มาเป็นไฟล์ `.zip` ให้ทำตามขั้นตอนดังนี้:

### 1. แตกไฟล์ (Extract ZIP)
แตกไฟล์ `.zip` ไปยังโฟลเดอร์ในเครื่องของคุณ เช่น `sais-schedule-booking`

### 2. สร้าง Repository ใหม่บน GitHub
1. ไปที่ [GitHub](https://github.com) แล้วเข้าสู่ระบบ
2. กดปุ่ม **New** (หรือเครื่องหมาย `+` มุมขวาบน > **New repository**)
3. ตั้งชื่อ Repository เช่น `sais-schedule-booking`
4. เลือกระดับเป็น **Public** หรือ **Private** ตามต้องการ
5. **ไม่ต้อง** ติ๊กถูกที่ "Add a README file" (เพราะในนี้มีไฟล์แล้ว)
6. กด **Create repository**

### 3. อัปโหลดโค้ดขึ้น GitHub ด้วย Git (Terminal / Command Prompt)
เปิด Terminal หรือ Command Prompt ในโฟลเดอร์ของโปรเจกต์ แล้วพิมพ์คำสั่งตามลำดับ:

```bash
# 1. เริ่มต้น git repository
git init

# 2. เพิ่มไฟล์ทั้งหมดเข้าระบบ git
git add .

# 3. บันทึก commit แรก
git commit -m "Initial commit: SAIS Schedule Booking System"

# 4. ตั้งชื่อ branch หลักเป็น main
git branch -M main

# 5. เชื่อมต่อไปยัง GitHub Repository ของคุณ (เปลี่ยน URL เป็นของคุณ)
git remote add origin https://github.com/<YOUR-USERNAME>/<YOUR-REPO-NAME>.git

# 6. ส่งโค้ดขึ้น GitHub
git push -u origin main
```

*(หรือหากไม่ถนัดใช้ Command Line สามารถใช้โปรแกรม **GitHub Desktop** หรือลากไฟล์ขึ้นหน้าเว็บ GitHub ได้โดยตรง)*

---

## 💻 วิธีการรันในเครื่องตัวเอง (Local Development)

### ข้อกำหนดเบื้องต้น
- ติดตั้ง [Node.js](https://nodejs.org) (แนะนำเวอร์ชัน 18 ขึ้นไป หรือ 20+)

### คำสั่งสำหรับติดตั้งและรัน:

```bash
# 1. ติดตั้ง Dependencies ทั้งหมด
npm install

# 2. รันโหมด Development สำหรับพัฒนา
npm run dev

# 3. เปิดเบราว์เซอร์เข้าไปที่
http://localhost:3000
```

### คำสั่งสร้างไฟล์สำหรับ Production (Build):
```bash
npm run build
```
ไฟล์ผลลัพธ์จะถูกสร้างไว้ในโฟลเดอร์ `dist/` พร้อมนำไป Deploy บน Server หรือโฮสติ้งใดๆ ได้ทันที

---

## 🔥 การตั้งค่า Firebase Firestore (ฐานข้อมูลคลาวด์)

ระบบนี้รองรับการทำงานร่วมกับ **Firebase Firestore** เพื่อการซิงค์ข้อมูลเรียลไทม์ข้ามอุปกรณ์:

1. เข้าไปที่ [Firebase Console](https://console.firebase.google.com/)
2. กด **Add project** แล้วสร้างโปรเจกต์ใหม่
3. ไปที่เมนู **Build > Firestore Database** แล้วกด **Create database** (เลือกโหมด Start in test mode เพื่อเริ่มทดสอบได้ทันที)
4. ไปที่ **Project Settings** (ไอคอนฟันเฟือง) > เลื่อนลงมาที่แท็บ **Your apps** > กดเลือกไอคอนเว็บ `</>` เพื่อลงทะเบียน Web app
5. คัดลอกค่า `firebaseConfig` ที่ได้ มาวางในไฟล์ `src/firebase.ts` หรือกำหนดค่าใน `.env`:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

---

## 🌐 การนำขึ้นระบบออนไลน์ฟรี (Free Hosting Options)

### ตัวเลือกที่ 1: Deploy บน Vercel (ง่ายและเร็วที่สุด)
1. ไปที่ [Vercel](https://vercel.com) แล้วล็อกอินด้วย GitHub
2. กด **Add New Project** แล้วเลือก Repository `sais-schedule-booking`
3. Vercel จะตรวจจับว่าเป็น Vite อัตโนมัติ กด **Deploy** ได้ทันที!

### ตัวเลือกที่ 2: Deploy บน Firebase Hosting
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# เลือก directory เป็น: dist
# เลือก configure as single-page app: Yes
npm run build
firebase deploy
```

### ตัวเลือกที่ 3: GitHub Pages
โปรเจกต์นี้มีไฟล์ GitHub Actions `.github/workflows/deploy.yml` ไว้ให้แล้ว สามารถเปิดใช้งาน GitHub Pages ในแท็บ Settings > Pages > Source เลือก **GitHub Actions** ได้เลย

---

## ✨ ฟังก์ชันเด่นของระบบ (Features)
- 📅 **ตารางตรวจรับ 2 ช่วงต่อเดือน**: งวดวันที่ 1-15 และ 16-สิ้นเดือน พร้อมตัวเลือกปฏิทินย้อนหลัง-ล่วงหน้า
- 🔍 **ระบบค้นหาและกรองข้อมูลด่วน (Smart Filter)**: กรองตามโมเดลสินค้า (ES1, 3300, 5500, S-villas, ES2) และผู้ตรวจ
- 📍 **ปักหมุด Google Maps**: รองรับการระบุพิกัด GPS, การเปิดนำทางผ่าน Google Maps
- 📷 **กล้องสแกนเอกสาร**: ถ่ายรูปเอกสารหน้างาน สลับกล้องหน้า-หลัง พร้อมไฟฉายในตัว
- 🗂️ **ระบบลาก-วาง (Drag & Drop)**: สลับย้ายคิวงานระหว่างวันหรือผู้ตรวจได้สะดวก
- 🗑️ **ถังขยะและกู้คืน (Trash Bin)**: ป้องกันการลบข้อมูลผิดพลาด สามารถกู้คืนได้
- 📊 **สถิติและสรุปยอด (Statistics Dashboard)**: รายงานสรุปงานตรวจแยกตามสถานะและรุ่น
- 🌐 **ระบบ 2 ภาษา**: สลับภาษาไทย 🇹🇭 / ภาษาอังกฤษ 🇬🇧 ได้ทันที
- ⌨️ **ปุ่มลัดคีย์บอร์ด**: กด `T` ไปวันนี้, `←`/`→` เลื่อนงวด, `/` ค้นหา
