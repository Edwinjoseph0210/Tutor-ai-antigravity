# Gemini AI Integration Setup Guide

This guide will help you set up Google Gemini AI integration for the Study Materials feature.

## Prerequisites

- Python 3.7+
- A Google Cloud account
- Google Gemini API key

## Step 1: Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey) or [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Generative AI API (Gemini API)
4. Create an API key
5. Copy your API key (you'll need it in the next step)

## Step 2: Install Dependencies

Install the required Python packages:

```bash
pip install -r requirements.txt
```

This will install:
- `google-generativeai` - Google's Generative AI SDK
- `python-dotenv` - For environment variable management

## Step 3: Configure Environment Variables

### Option A: Using .env file (Recommended)

1. Create a `.env` file in the project root directory:

```bash
touch .env
```

2. Add your Gemini API key to the `.env` file:

```
GEMINI_API_KEY=your_api_key_here
```

**Important:** Never commit the `.env` file to version control. It should already be in `.gitignore`.

### Option B: Using System Environment Variables

**On macOS/Linux:**
```bash
export GEMINI_API_KEY=your_api_key_here
```

**On Windows (Command Prompt):**
```cmd
set GEMINI_API_KEY=your_api_key_here
```

**On Windows (PowerShell):**
```powershell
$env:GEMINI_API_KEY="your_api_key_here"
```

## Step 4: Verify Installation

1. Start the Flask backend:
```bash
python app.py
```

2. Check the console output. You should see:
   - `✓ Gemini AI initialized successfully` (if API key is configured)
   - `⚠ Gemini AI not available (check GEMINI_API_KEY)` (if API key is missing)

## Step 5: Access the Feature

1. Start the frontend:
```bash
cd frontend
npm start
```

2. Log in to the application
3. Navigate to **"Study Materials"** in the sidebar
4. You can now use:
   - **Ask Question**: Ask any educational question
   - **Get Syllabus**: Get comprehensive syllabus for any subject/course
   - **Generate Notes**: Create study notes for any topic
   - **Explain Concept**: Get detailed explanations of concepts

## API Endpoints

The following endpoints are available:

- `POST /api/gemini/ask` - Ask general questions
- `POST /api/gemini/syllabus` - Get syllabus information
- `POST /api/gemini/notes` - Generate study notes
- `POST /api/gemini/explain` - Explain concepts

All endpoints require authentication (login required).

## Troubleshooting

### "Gemini AI is not available" Error

1. Check that `GEMINI_API_KEY` is set correctly
2. Verify the API key is valid and active
3. Ensure `google-generativeai` is installed: `pip install google-generativeai`
4. Check that `python-dotenv` is installed: `pip install python-dotenv`

### API Key Not Found

- Make sure the `.env` file is in the project root (same directory as `app.py`)
- Verify the `.env` file contains: `GEMINI_API_KEY=your_key_here`
- Restart the Flask server after creating/modifying `.env`

### Import Errors

If you see import errors:
```bash
pip install --upgrade google-generativeai python-dotenv
```

### Rate Limiting

Google Gemini API has rate limits. If you encounter rate limit errors:
- Wait a few minutes before retrying
- Consider upgrading your Google Cloud plan for higher limits

## Security Notes

- **Never commit your API key** to version control
- Keep your API key secure and don't share it publicly
- Use environment variables or `.env` files (which should be in `.gitignore`)
- Rotate your API key if it's accidentally exposed

## Example Usage

### Get Syllabus
```json
POST /api/gemini/syllabus
{
  "subject": "Mathematics",
  "grade_level": "Grade 10",
  "course": ""
}
```

### Generate Notes
```json
POST /api/gemini/notes
{
  "topic": "Photosynthesis",
  "subject": "Biology",
  "detail_level": "medium"
}
```

### Ask Question
```json
POST /api/gemini/ask
{
  "query": "What is the water cycle?",
  "context": "educational"
}
```

## Support

For issues with:
- **Gemini API**: Check [Google AI Studio Documentation](https://ai.google.dev/docs)
- **Application**: Check the application logs and error messages

