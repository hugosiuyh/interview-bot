# �� AI Interview Bot

An intelligent interview platform built with Next.js that conducts automated interviews, analyzes responses, and provides detailed candidate assessments.

## ✨ Features

- **Interactive Interview Experience**
  - Real-time video/audio recording
  - Natural conversation flow with follow-up questions
  - 2-minute response time limit per question
  - Professional interviewer persona (Lily)

- **AI-Powered Analysis**
  - GPT-4 powered question rephrasing
  - Personality trait assessment
  - Detailed scoring and rationale
  - Comprehensive interview reports

- **Candidate Assessment**
  - Multiple trait evaluation (Compliance, Stress Tolerance, Assertiveness, etc.)
  - Visual score representation
  - Detailed feedback and recommendations
  - Supporting evidence from responses

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- OpenAI API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/interview-bot.git
cd interview-bot
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
Create a `.env.local` file in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

4. Start the development server
```bash
npm run dev
```

Visit `http://localhost:3000` to start using the application.

## 📝 Interview Flow

1. **Start Interview**
   - Enter candidate details
   - Begin recording session

2. **Question & Answer**
   - AI asks questions with natural flow
   - Candidate responds via video/audio
   - 2-minute time limit per response
   - Optional follow-up questions

3. **Analysis & Report**
   - Comprehensive trait assessment
   - Detailed scoring and rationale
   - Visual representation of scores
   - Supporting evidence from responses

## 🎯 Trait Assessment

The system evaluates candidates across multiple dimensions:

- **Compliance** (1-10)
  - Rule adherence
  - Process following
  - Attention to detail

- **Stress Tolerance** (1-10)
  - Pressure handling
  - Emotional stability
  - Problem-solving under stress

- **Assertiveness** (1-10)
  - Communication confidence
  - Leadership potential
  - Initiative taking

## 🛠️ Technical Stack

- **Frontend**
  - Next.js 14
  - React
  - Tailwind CSS
  - MediaRecorder API

- **Backend**
  - Next.js API Routes
  - OpenAI GPT-4
  - WebSocket (for real-time features)

## 📁 Project Structure

```
/app
  /interview/              # Interview interface
  /api/                    # API endpoints
    /analyze-response/     # Response analysis
    /rephrase-question/   # Question rephrasing
    /score/               # Scoring system
    /transcribe/          # Audio transcription
  /utils/                 # Utility functions
```

## 🔧 API Endpoints

### `/api/analyze-response`
Analyzes candidate responses and determines if follow-up questions are needed.

### `/api/rephrase-question`
Rephrases questions to maintain natural conversation flow.

### `/api/score`
Generates comprehensive personality assessment and scoring.

### `/api/transcribe`
Handles audio/video transcription.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ using Next.js and OpenAI technologies.
