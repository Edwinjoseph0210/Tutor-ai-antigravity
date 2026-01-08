// ===================================
// SENKU - MODERN SAAS UI JAVASCRIPT
// ===================================

// === STATE MANAGEMENT ===
const state = {
    pdfProcessed: false,
    pdfHash: null,
    curriculum: null,
    teachingActive: false,
    voiceEnabled: true,
    currentFile: null,
    teachingReader: null
};

// === API CONFIGURATION ===
const API_BASE = 'http://localhost:5000/api';

// === INITIALIZATION ===
document.addEventListener('DOMContentLoaded', () => {
    initializeNavigation();
    initializeUpload();
    initializeVoiceSettings();
    checkBackendStatus();

    // Check status periodically
    setInterval(checkBackendStatus, 10000);
});

// === NAVIGATION ===
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            navigateToSection(targetId);
        });
    });
}

function navigateToSection(sectionId) {
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
        }
    });

    // Update sections
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });

    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Show/hide sidebar and adjust layout based on section
    const sidebar = document.querySelector('.sidebar');
    const mainContainer = document.querySelector('.main-container');

    if (sidebar && mainContainer) {
        if (sectionId === 'teach') {
            // Hide sidebar and make content full-width on teaching page
            sidebar.style.display = 'none';
            mainContainer.classList.add('full-width');
        } else {
            // Show sidebar on other pages
            sidebar.style.display = 'flex';
            mainContainer.classList.remove('full-width');
        }
    }
}

// === BACKEND STATUS ===
async function checkBackendStatus() {
    const statusElement = document.getElementById('backendStatus');

    try {
        const response = await fetch(`${API_BASE}/status`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
            statusElement.innerHTML = '<span style="color: var(--success-color);">✅ Online</span>';
            document.querySelector('.status-dot').style.background = 'var(--success-color)';
        } else {
            throw new Error('Backend not responding');
        }
    } catch (error) {
        statusElement.innerHTML = '<span style="color: var(--accent-color);">❌ Offline</span>';
        document.querySelector('.status-dot').style.background = 'var(--accent-color)';
    }
}

// === FILE UPLOAD ===
function initializeUpload() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const fileInfo = document.getElementById('fileInfo');
    const removeFileBtn = document.getElementById('removeFile');
    const processBtn = document.getElementById('processBtn');
    const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            handleFileSelect(files[0]);
        } else {
            showToast('error', 'Invalid File', 'Please upload a PDF file');
        }
    });

    // File input change handler
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    // Remove file
    removeFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetUpload();
    });

    // Process file
    processBtn.addEventListener('click', () => {
        if (state.currentFile) {
            processTextbook(state.currentFile);
        }
    });

    // Upload another PDF
    uploadAnotherBtn.addEventListener('click', () => {
        resetToUpload();
    });
}

function handleFileSelect(file) {
    state.currentFile = file;

    // Update UI
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('fileInfo').style.display = 'block';

    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
}

function resetUpload() {
    state.currentFile = null;
    document.getElementById('uploadZone').style.display = 'flex';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('fileInput').value = '';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// === PROCESS TEXTBOOK ===
async function processTextbook(file) {
    // Hide file info, show processing
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('processingStatus').style.display = 'block';

    const stepsContainer = document.getElementById('processingSteps');
    const progressFill = document.getElementById('progressFill');

    // Create processing steps
    const steps = [
        { id: 'fingerprint', text: 'Computing PDF fingerprint...' },
        { id: 'extract', text: 'Extracting text content...' },
        { id: 'chunk', text: 'Chunking text...' },
        { id: 'embed', text: 'Generating embeddings...' },
        { id: 'store', text: 'Storing in vector database...' },
        { id: 'curriculum', text: 'Extracting curriculum...' }
    ];

    stepsContainer.innerHTML = steps.map(step => `
        <div class="processing-step" id="step-${step.id}">
            <div class="step-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10"/>
                </svg>
            </div>
            <span class="step-text">${step.text}</span>
        </div>
    `).join('');

    try {
        // Create FormData
        const formData = new FormData();
        formData.append('file', file);
        formData.append('voice_enabled', state.voiceEnabled);

        // Send to backend
        const response = await fetch(`${API_BASE}/process`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Processing failed');
        }

        // Read the streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.substring(6));
                    handleProcessingUpdate(data, steps, progressFill);
                }
            }
        }

        showToast('success', 'Success!', 'Textbook processed successfully');

        // Update state
        state.pdfProcessed = true;
        updateStatusDisplay();

        // Show success screen
        setTimeout(() => {
            showSuccessScreen();
        }, 1000);

    } catch (error) {
        console.error('Processing error:', error);
        showToast('error', 'Processing Failed', error.message);
        resetProcessing();
    }
}

function handleProcessingUpdate(data, steps, progressFill) {
    const { step, progress, message, curriculum, pdf_hash } = data;

    // Update progress bar
    if (progress !== undefined) {
        progressFill.style.width = `${progress}%`;
    }

    // Update step status
    if (step) {
        const stepIndex = steps.findIndex(s => s.id === step);
        if (stepIndex !== -1) {
            // Mark previous steps as complete
            for (let i = 0; i < stepIndex; i++) {
                const stepEl = document.getElementById(`step-${steps[i].id}`);
                if (stepEl) {
                    stepEl.classList.remove('active');
                    stepEl.classList.add('complete');
                }
            }

            // Mark current step as active
            const currentStepEl = document.getElementById(`step-${step}`);
            if (currentStepEl) {
                currentStepEl.classList.add('active');
            }
        }
    }

    // Store curriculum if provided
    if (curriculum) {
        state.curriculum = curriculum;
        state.pdfHash = pdf_hash;
        displayCurriculum(curriculum);
    }
}

function resetProcessing() {
    document.getElementById('processingStatus').style.display = 'none';
    document.getElementById('uploadZone').style.display = 'flex';
    state.currentFile = null;
}

function showSuccessScreen() {
    document.getElementById('processingStatus').style.display = 'none';
    document.getElementById('uploadSuccess').style.display = 'flex';
}

function resetToUpload() {
    // Hide all upload states
    document.getElementById('uploadSuccess').style.display = 'none';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('processingStatus').style.display = 'none';

    // Show upload zone
    document.getElementById('uploadZone').style.display = 'flex';

    // Reset file input
    document.getElementById('fileInput').value = '';
    state.currentFile = null;
}

// === CURRICULUM DISPLAY ===
function displayCurriculum(curriculum) {
    const curriculumList = document.getElementById('curriculumList');
    const curriculumEmpty = document.getElementById('curriculumEmpty');

    if (!curriculum || curriculum.length === 0) {
        curriculumList.style.display = 'none';
        curriculumEmpty.style.display = 'flex';
        return;
    }

    curriculumEmpty.style.display = 'none';
    curriculumList.style.display = 'flex';

    curriculumList.innerHTML = curriculum.map((unit, index) => {
        const icon = unit.type === 'chapter' ? '📖' : '📝';
        return `
            <div class="curriculum-item">
                <div class="curriculum-icon">${icon}</div>
                <div class="curriculum-details">
                    <div class="curriculum-number">Unit ${index + 1}</div>
                    <div class="curriculum-title">${unit.title}</div>
                </div>
                <div class="curriculum-type">${unit.type}</div>
            </div>
        `;
    }).join('');

    // Update status
    document.getElementById('curriculumCount').textContent = curriculum.length;

    // Enable teaching button
    document.getElementById('startTeachingBtn').disabled = false;
    document.getElementById('teachingEmpty').querySelector('.empty-subtitle').textContent =
        `Ready to teach ${curriculum.length} units automatically`;
}

// === VOICE SETTINGS ===
function initializeVoiceSettings() {
    const voiceToggle = document.getElementById('voiceToggle');
    const voiceInfo = document.getElementById('voiceInfo');

    voiceToggle.addEventListener('change', (e) => {
        state.voiceEnabled = e.target.checked;
        voiceInfo.style.display = state.voiceEnabled ? 'flex' : 'none';
    });
}

// === TEACHING ===
document.getElementById('startTeachingBtn')?.addEventListener('click', startTeaching);

async function startTeaching() {
    if (!state.curriculum || !state.pdfHash) {
        showToast('error', 'Not Ready', 'Please process a textbook first');
        return;
    }

    // Navigate to teaching section
    navigateToSection('teach');

    // Show teaching UI
    document.getElementById('teachingEmpty').style.display = 'none';
    document.getElementById('teachingActive').style.display = 'flex';

    state.teachingActive = true;
    document.getElementById('teachingStatus').textContent = 'Active';

    try {
        const response = await fetch(`${API_BASE}/teach`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                pdf_hash: state.pdfHash,
                voice_enabled: state.voiceEnabled
            })
        });

        if (!response.ok) {
            throw new Error('Teaching failed to start');
        }

        // Read streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.substring(6));
                    handleTeachingUpdate(data);
                }
            }
        }

        // Teaching complete
        showToast('success', 'Complete!', 'Autonomous teaching session finished');
        state.teachingActive = false;
        document.getElementById('teachingStatus').textContent = 'Ready';

    } catch (error) {
        console.error('Teaching error:', error);
        showToast('error', 'Teaching Failed', error.message);
        stopTeaching();
    }
}

function handleTeachingUpdate(data) {
    const { type, unit_number, total_units, unit_title, lecture, sentence_index, sentences } = data;

    // Update progress
    const progress = (unit_number / total_units) * 100;
    document.getElementById('teachingProgress').style.width = `${progress}%`;
    document.getElementById('lessonCounter').textContent = `${unit_number} / ${total_units}`;
    document.getElementById('currentLessonTitle').textContent = `Lesson ${unit_number}: ${unit_title}`;

    const lectureContent = document.getElementById('lectureContent');

    if (type === 'lesson_start') {
        // Display full lecture
        lectureContent.innerHTML = sentences.map((sentence, idx) =>
            `<span class="sentence" data-index="${idx}">${sentence} </span>`
        ).join('');
    } else if (type === 'sentence_start') {
        // Highlight current sentence
        lectureContent.querySelectorAll('.sentence').forEach((el, idx) => {
            el.classList.toggle('active', idx === sentence_index);
        });
    } else if (type === 'sentence_end') {
        // Remove highlight
        lectureContent.querySelectorAll('.sentence').forEach(el => {
            el.classList.remove('active');
        });
    }
}

function stopTeaching() {
    state.teachingActive = false;
    state.teachingPaused = false;

    // Cancel the reader if it exists
    if (state.teachingReader) {
        state.teachingReader.cancel();
        state.teachingReader = null;
    }

    document.getElementById('teachingStatus').textContent = 'Ready';
    document.getElementById('teachingEmpty').style.display = 'flex';
    document.getElementById('teachingActive').style.display = 'none';

    // Send stop signal to backend
    fetch(`${API_BASE}/teach/stop`, { method: 'POST' }).catch(console.error);

    // Show success message and navigate to upload
    showToast('info', 'Teaching Stopped', 'You can now upload a new PDF to continue learning');

    // Navigate to upload section after a brief delay
    setTimeout(() => {
        navigateToSection('upload');
    }, 1000);
}



document.getElementById('stopBtn')?.addEventListener('click', () => {
    if (confirm('Stop this teaching session? You can upload a new PDF afterwards.')) {
        stopTeaching();
    }
});

document.getElementById('pauseBtn')?.addEventListener('click', pauseTeaching);

function pauseTeaching() {
    // Send pause request to backend
    fetch(`${API_BASE}/teach/pause`, { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            state.teachingPaused = data.paused;
            const pauseBtn = document.getElementById('pauseBtn');

            if (state.teachingPaused) {
                pauseBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6 4l10 6-10 6V4z"/>
                    </svg>
                    Resume
                `;
                document.getElementById('teachingStatus').textContent = 'Paused';
            } else {
                pauseBtn.innerHTML = `
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M6 4h3v12H6V4zM11 4h3v12h-3V4z"/>
                    </svg>
                    Pause
                `;
                document.getElementById('teachingStatus').textContent = 'Active';
            }
        })
        .catch(console.error);
}



// === STATUS DISPLAY ===
function updateStatusDisplay() {
    document.getElementById('pdfStatus').textContent = state.pdfProcessed ? 'Yes' : 'No';
    document.getElementById('curriculumCount').textContent = state.curriculum ? state.curriculum.length : 0;
}

// === TOAST NOTIFICATIONS ===
function showToast(type, title, message) {
    const container = document.getElementById('toastContainer');

    const icons = {
        success: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color: var(--success-color);"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>',
        error: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color: var(--accent-color);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>',
        info: '<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style="color: var(--primary-color);"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type]}</div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn var(--transition-base) reverse';
        setTimeout(() => toast.remove(), 250);
    }, 5000);
}

// === UTILITY FUNCTIONS ===
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
