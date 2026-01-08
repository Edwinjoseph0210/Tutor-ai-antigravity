# 🎉 Senku Integration Complete!

## Quick Start Guide

### 1. Start the Backend
```bash
cd /Users/apple/Downloads/Tutor-ai-antigravity-main
python app.py
```

### 2. Start the Frontend
```bash
cd /Users/apple/Downloads/Tutor-ai-antigravity-main/frontend
npm start
```

### 3. Access Senku
1. Open browser: `http://localhost:3000`
2. Login to your account
3. Click **"Senku"** in the sidebar (🧠 brain icon)
4. Upload a PDF textbook
5. Click **"Start Autonomous Teaching"**

---

## What's New

✅ **Autonomous Teaching** - Upload textbooks and let AI teach you systematically  
✅ **Smart Curriculum Extraction** - Automatically identifies chapters and topics  
✅ **Voice Synthesis** - Natural speech with Inworld API + Piper TTS fallback  
✅ **Text Highlighting** - Synchronized highlighting as lessons are taught  
✅ **Teaching Controls** - Pause, resume, and stop at any time  

---

## Optional Configuration

### Inworld API (for premium voice)
Add to `.env`:
```env
INWORLD_API_KEY=your_key_here
INWORLD_API_SECRET=your_secret_here
```

### Piper TTS (for offline voice on macOS)
Update paths in `teaching/piper_tts.py`:
```python
piper_exe: str = "/path/to/piper"
model_path: str = "/path/to/voices/model.onnx"
```

---

## Features Available

🎯 **PDF Processing**
- Drag-and-drop upload
- Real-time progress tracking
- Automatic curriculum extraction
- Vector embeddings for RAG

🎓 **Autonomous Teaching**
- Systematic teaching of entire curriculum
- Natural voice synthesis
- Text highlighting synchronized with audio
- Pause/resume/stop controls

🎨 **Modern UI**
- Clean, responsive design
- Real-time status updates
- Curriculum visualization
- Error handling

---

## Need Help?

See [walkthrough.md](file:///Users/apple/.gemini/antigravity/brain/f83afd5d-21af-43c1-a7a3-5e3e15d2d645/walkthrough.md) for detailed documentation.

**Enjoy autonomous teaching! 🧠✨**
