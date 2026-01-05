# AI Face Recognition Attendance System

A Python-based face recognition attendance system that automatically tracks student attendance using computer vision and machine learning.

## 🚀 Features

- **Real-time Face Recognition**: Uses webcam to detect and recognize faces
- **Automatic Attendance Tracking**: Automatically marks attendance when faces are recognized
- **Database Storage**: SQLite database for storing student information and attendance records
- **Session-based Tracking**: Calculates attendance percentages over time
- **CSV Reports**: Generates detailed attendance reports in CSV format
- **Text-to-Speech**: Announces recognized names aloud
- **Manual Management**: CLI tools for managing students and attendance
- **Cross-platform**: Works on Windows, macOS, and Linux

## 📋 Requirements

- Python 3.7+
- OpenCV
- face_recognition
- pyttsx3
- numpy
- SQLite3 (included with Python)

## 🛠️ Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Edwinjoseph0210/Facial-Recognition.git
   cd Facial-Recognition
   ```

2. **Install required packages:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Grant camera permissions** (macOS):
   - Go to System Preferences → Security & Privacy → Privacy → Camera
   - Add Terminal to allowed applications
   - Enable camera access for Terminal

## 🎯 Usage

### Running the Main Program
```bash
python main.py
```

**How it works:**
1. Camera window opens showing live video feed
2. Green boxes appear around detected faces
3. Known faces show name + confidence percentage
4. Attendance is automatically recorded
5. Press 'q' to quit and generate final report

### Managing Students and Attendance
```bash
python attendance.py
```

**Available options:**
1. Add student
2. List students
3. Update student
4. Delete student
5. List attendance records
6. Mark attendance manually
7. Export attendance to CSV
8. Print summary
9. Delete attendance records
10. Exit

## 📁 Project Structure

```
Facial-Recognition/
├── main.py                 # Main face recognition program
├── attendance.py           # Database management and CLI tools
├── faces/                  # Folder containing known face images
│   ├── aswin.jpg          # Example face image
│   ├── Edwin.png          # Another example face image
│   └── Tom.jpg            # Another example face image
├── requirements.txt        # Python dependencies
├── .gitignore             # Git ignore file
├── attendance.db           # SQLite database with student/attendance data
├── attendance_report_*.csv # Generated attendance reports
└── README.md              # This file
```

## 👥 Adding Students

1. **Add face image**: Place student's photo in `faces/` folder (name it exactly as you want it recognized)
2. **Add student details**: Run `python attendance.py` and choose option 1
3. **Start recognition**: Run `python main.py`

## 📊 Attendance System

The system uses a percentage-based attendance calculation:
- **Present**: >80% detection rate
- **Partial**: 50-80% detection rate  
- **Absent**: <50% detection rate

## 🔧 Configuration

### Camera Settings
The program automatically tries different camera indices (0, 1, 2) to find an available camera.

### Face Recognition Settings
- Confidence threshold: 0.6 (adjustable in code)
- Face detection model: HOG (default) or CNN (for better accuracy)

## 📈 Reports

The system generates CSV reports with:
- Student ID
- Roll Number
- Name
- Timestamp
- Date
- Attendance Status

## 🐛 Troubleshooting

### Camera Issues
- **macOS**: Grant camera permissions in System Preferences
- **Windows**: Ensure camera drivers are installed
- **Linux**: Check camera permissions and USB connections

### Face Recognition Issues
- Ensure face images are clear and well-lit
- Use high-quality photos (at least 100x100 pixels)
- Avoid photos with multiple faces

### Dependencies Issues
```bash
# Install CMake (required for dlib on some systems)
brew install cmake  # macOS
sudo apt install cmake  # Ubuntu/Debian
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 👨‍💻 Authors

**Edwin Joseph**
- GitHub: [@Edwinjoseph0210](https://github.com/Edwinjoseph0210)
**Aswin MS**
- GitHub: [@aswinms926](https://github.com/aswinms926)
**Tom Sibu**
- GitHub: [@TomSibu](https://github.com/TomSibu)

## 🙏 Acknowledgments

- [face_recognition](https://github.com/ageitgey/face_recognition) library
- [OpenCV](https://opencv.org/) for computer vision
- [pyttsx3](https://github.com/nateshmbhat/pyttsx3) for text-to-speech

## 📞 Support

If you encounter any issues or have questions, please:
1. Check the troubleshooting section above
2. Search existing issues in the repository
3. Create a new issue with detailed information

---

⭐ **Star this repository if you found it helpful!**
