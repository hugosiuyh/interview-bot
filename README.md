# 🤖 AI Interview Bot

A Next.js-based interview chatbot with voice recording, AI transcription, and personality scoring capabilities.

## 🚀 Features

### ✅ Current Implementation
- **Chat Interface**: Interactive conversation flow at `/interview`
- **Voice Recording**: MediaRecorder API for audio capture
- **Mock Transcription**: Simulated Whisper API responses
- **AI Scoring**: Personality assessment (Compliance, Stress Tolerance, Assertiveness)
- **Real-time Scoring Display**: Visual progress bars and detailed rationale
- **Message History**: Timestamped conversation tracking

### 🔄 Planned Features
- **Real Whisper Integration**: Local Python service for transcription
- **OpenAI Integration**: GPT-4 powered personality assessment
- **Export Functionality**: PDF reports and JSON downloads
- **Live Scoring**: Real-time assessment during interviews

## 🛠️ Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create `.env.local` in the root directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
WHISPER_SERVICE_URL=http://localhost:5000
NEXT_PUBLIC_APP_NAME=AI Interview Bot
```

### 3. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000/interview` to start interviewing!

## 🎯 API Endpoints

### `/api/transcribe`
- **Method**: POST
- **Input**: FormData with audio file
- **Output**: Transcript segments with timestamps
- **Status**: Mock implementation (ready for Whisper integration)

### `/api/score`
- **Method**: POST  
- **Input**: JSON with conversation transcript
- **Output**: Personality scores with detailed rationale
- **Status**: Mock implementation (ready for OpenAI integration)

## 🧠 Whisper Service Setup (Optional)

### 1. Install Python Dependencies
```bash
cd whisper-service
pip install -r requirements.txt
```

### 2. Run Whisper Service
```bash
python app.py
```

### 3. Update Transcription Endpoint
Modify `/api/transcribe/route.ts` to call local Whisper service:
```typescript
const response = await fetch('http://localhost:5000/transcribe', {
  method: 'POST',
  body: formData
});
```

## 🔧 OpenAI Integration

### 1. Get OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com)
2. Create account and generate API key
3. Add to `.env.local`

### 2. Enable Real Scoring
Uncomment the OpenAI integration code in `/app/api/score/route.ts`:

```typescript
const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "gpt-4",
    messages: [
      { role: "system", content: SCORING_SYSTEM_PROMPT },
      { role: "user", content: transcript }
    ]
  })
});
```

## 📁 Project Structure

```
/app
  /interview/page.tsx        ← Main chat interface
  /api/transcribe/route.ts   ← Audio transcription endpoint
  /api/score/route.ts        ← Personality scoring endpoint
  /layout.tsx                ← Root layout
/utils/prompts.ts            ← AI prompt templates
/whisper-service/            ← Python Whisper service
  app.py                     ← Flask server
  requirements.txt           ← Python dependencies
```

## 🎨 Personality Scoring Dimensions

### Compliance (1-10)
- Willingness to follow rules and procedures
- Respect for authority and structure
- Attention to detail in following instructions

### Stress Tolerance (1-10)
- Ability to remain calm under pressure
- Coping strategies for difficult situations
- Resilience when facing challenges

### Assertiveness (1-10)
- Confidence in expressing ideas
- Leadership potential and decision-making
- Comfort with taking initiative

## 🔄 Implementation Phases

### Phase 1: Enhanced Chat ✅
- [x] Timestamped message history
- [x] Improved UI with larger chat area
- [x] Enter key support for sending messages

### Phase 2: Audio Input ✅
- [x] MediaRecorder API integration
- [x] Start/stop recording controls
- [x] Audio blob capture and management

### Phase 3: Mock Services ✅
- [x] Enhanced transcription with realistic responses
- [x] Sophisticated scoring with rationale
- [x] Error handling and loading states

### Phase 4: Real AI Integration 🔄
- [ ] OpenAI GPT-4 integration
- [ ] Whisper transcription service
- [ ] Production-ready error handling

### Phase 5: Advanced Features 📋
- [ ] PDF export functionality
- [ ] JSON conversation downloads
- [ ] Live scoring during conversation
- [ ] Interview question progression

## 🚀 Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy to Vercel
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Usage Examples

### Basic Interview Flow
1. Visit `/interview`
2. Type or record audio responses
3. Click "Get Interview Scoring" for assessment
4. Review personality scores and rationale

### API Testing
```bash
# Test transcription
curl -X POST http://localhost:3000/api/transcribe \
  -F "audio=@sample.wav"

# Test scoring
curl -X POST http://localhost:3000/api/score \
  -H "Content-Type: application/json" \
  -d '{"transcript": "user: I applied because..."}'
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

MIT License - see LICENSE file for details.

---

Built with ❤️ using Next.js, React, and AI technologies.
