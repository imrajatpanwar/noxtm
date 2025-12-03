# Clear Cache Instructions for noxtm.com

## ✅ Backend Successfully Restarted

The backend server has been restarted with all the latest changes including:
- ✅ Socket.IO connection handler (real-time progress)
- ✅ Fixed field mapping (booth numbers in correct field)
- ✅ Deep exhibitor scraping (extracts all contact data)

**Server Status:** Running on PM2 (PID: 39028)

---

## 🌐 Clear Browser Cache - For Users

To see the latest UI and features on **noxtm.com**, you need to clear your browser cache:

### Google Chrome
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select **"Cached images and files"**
3. Time range: **"All time"**
4. Click **"Clear data"**
5. Press `Ctrl + F5` to hard reload the page

### Firefox
1. Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
2. Select **"Cache"**
3. Time range: **"Everything"**
4. Click **"Clear Now"**
5. Press `Ctrl + F5` to hard reload

### Microsoft Edge
1. Press `Ctrl + Shift + Delete`
2. Select **"Cached images and files"**
3. Time range: **"All time"**
4. Click **"Clear now"**
5. Press `Ctrl + F5` to hard reload

### Safari (Mac)
1. Press `Cmd + Option + E` to empty cache
2. OR go to **Develop > Empty Caches**
3. Press `Cmd + R` to reload

---

## 🔧 Hard Reload (Quick Method)

Instead of clearing entire cache, you can hard reload:

- **Windows:** `Ctrl + F5` or `Ctrl + Shift + R`
- **Mac:** `Cmd + Shift + R`

This forces the browser to fetch fresh files from the server.

---

## 🚀 Verify Latest Features Are Working

After clearing cache, verify these features:

### 1. Real-Time Progress
- Start a crawler job
- Progress bar should update from 0% to 100% in real-time
- Logs should stream live

### 2. Correct Field Mapping
- After crawling, check exhibitor data
- Booth numbers should be in "Booth No" column
- Locations/countries should be in "Location" column

### 3. Deep Scraping
- Check crawler logs for:
  - "Found X detail page URLs, queueing for deep scraping..."
  - "Extracting detail page for: [Company Name]"
  - "Added X new contacts to [Company Name]"
- Check exhibitor contacts tab - should have contact persons with emails, phones, designations

---

## 🔍 Troubleshooting

### If cache clearing doesn't work:

#### 1. Incognito/Private Mode
Open noxtm.com in incognito/private browsing mode to bypass cache completely.

#### 2. Developer Tools Cache Clear
1. Open Developer Tools (`F12`)
2. Right-click the refresh button
3. Select **"Empty Cache and Hard Reload"**

#### 3. Clear All Browsing Data
1. Clear ALL browsing data (not just cache)
2. Include cookies, site data, everything
3. Restart browser

#### 4. Check Service Workers
1. Open Developer Tools (`F12`)
2. Go to **Application > Service Workers**
3. Click **"Unregister"** for noxtm.com
4. Reload page

---

## 📊 Server Verification Commands

To verify backend is running correctly:

```bash
# Check PM2 status
pm2 status

# View backend logs
pm2 logs noxtm-backend --lines 50

# Test API
curl http://localhost:5000/api/health

# Restart backend if needed
pm2 restart noxtm-backend
```

---

## ✅ Deployment Checklist

- [x] Latest code pulled from GitHub
- [x] Backend restarted with PM2
- [x] Socket.IO handler loaded
- [x] MongoDB connected
- [x] Server responding to health checks
- [ ] Users clear browser cache (USER ACTION REQUIRED)
- [ ] Verify real-time progress works
- [ ] Verify field mapping is correct
- [ ] Verify deep scraping extracts contacts

---

## 🎯 Next Steps

1. **Clear your browser cache** using instructions above
2. **Navigate to** http://noxtm.com/findr
3. **Start a test crawler** with any trade show URL
4. **Verify** progress bar updates in real-time
5. **Check** extracted data has booth numbers in correct field
6. **Verify** contacts are extracted from detail pages

---

**Server Status:** ✅ ONLINE
**Latest Code:** ✅ DEPLOYED
**Cache:** ⚠️ USERS MUST CLEAR

---

**Last Updated:** 2025-11-26
**Backend PID:** 39028
**PM2 Status:** Online
