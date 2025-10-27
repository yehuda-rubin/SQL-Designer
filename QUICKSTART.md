# 🚀 התחלה מהירה - SQL Designer

## הפעלה אוטומטית (מומלץ)

### Windows:
```bash
start.bat
```

### Mac/Linux:
```bash
chmod +x start.sh
./start.sh
```

---

## הפעלה ידנית

### 1️⃣ Backend (טרמינל 1)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### 2️⃣ Frontend (טרמינל 2)
```bash
cd frontend
npm install
npm run dev
```

### 3️⃣ פתח בדפדפן
```
http://localhost:5173
```

---

## בדיקה מהירה

### בדוק שה-Backend עובד:
```bash
curl http://localhost:5000/api/health
```

תקבל:
```json
{
  "success": true,
  "message": "SQL Designer API is running",
  "version": "1.0.0"
}
```

---

## שימוש ראשון

1. **לחץ "פרויקט חדש"**
2. **הזן שם**: "University System"
3. **לחץ "הוסף ישות"**
4. **לחץ פעמיים על הישות** לעריכה
5. **הוסף מאפיינים**:
   - ID (INT) - סמן כ-🔑
   - Name (VARCHAR)
   - Age (INT)
6. **שמור!**

---

## בעיות? 🐛

### Backend לא עולה:
```bash
cd backend
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### Frontend לא עולה:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

### פורט תפוס:
```bash
# Backend (פורט 5000)
lsof -ti:5000 | xargs kill -9

# Frontend (פורט 5173)
lsof -ti:5173 | xargs kill -9
```

---

## מפת מקלדת ⌨️

- **Ctrl/Cmd + S** - שמירה
- **Delete** - מחיקת ישות נבחרת
- **Scroll** - Zoom in/out
- **Drag** - הזזת Canvas
- **Double Click** - עריכת ישות

---

**זקוק לעזרה? קרא את [README.md](./README.md) המלא**