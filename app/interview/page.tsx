'use client';
import { useState, useRef, useEffect } from 'react';
import { INTERVIEW_QUESTIONS, getRecommendation } from '@/utils/questions';

interface Message {
  from: 'bot' | 'user';
  text: string;
  timestamp: string;
  questionId?: string;
  videoTimestamp?: number;
  isFollowUp?: boolean;
}

interface ScoreData {
  [key: string]: number;
  Compliance: number;
  'Stress Tolerance': number;
  Assertiveness: number;
  Flexibility: number;
  Responsibility: number;
}

export default function InterviewPage() {
  // Core state
  const [interviewId, setInterviewId] = useState<string>('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [messages, setMessages] = useState<Message[]>([
    { 
      from: 'bot', 
      text: INTERVIEW_QUESTIONS[0].question, 
      timestamp: new Date().toISOString(),
      questionId: INTERVIEW_QUESTIONS[0].id
    }
  ]);
  const [interviewStatus, setInterviewStatus] = useState<'active' | 'completed' | 'generating_report'>('active');
  
  // Voice recording and transcription
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingStartTime, setRecordingStartTime] = useState<number>(0);
  const [interviewStartTime, setInterviewStartTime] = useState<number>(Date.now());
  const [autoTranscribeEnabled, setAutoTranscribeEnabled] = useState(true);
  const [speechTimeout, setSpeechTimeout] = useState<NodeJS.Timeout | null>(null);
  const [isProcessingResponse, setIsProcessingResponse] = useState(false);
  
  // Scoring and reporting
  const [scores, setScores] = useState<ScoreData | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [recommendation, setRecommendation] = useState<any>(null);
  
  // Candidate info
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [showCandidateForm, setShowCandidateForm] = useState(true);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunksRef = useRef<Blob[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const currentTranscriptionRef = useRef<string>('');

  // Initialize interview
  useEffect(() => {
    if (!interviewId) {
      const newId = `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setInterviewId(newId);
    }
  }, [interviewId]);

  const startInterview = () => {
    if (!candidateName.trim()) {
      alert('Please enter candidate name');
      return;
    }
    setShowCandidateForm(false);
    setInterviewStartTime(Date.now());
    startContinuousRecording();
  };

  const startContinuousRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      mediaChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
          
          // Auto-transcribe when we have enough data and auto-transcribe is enabled
          if (autoTranscribeEnabled && mediaChunksRef.current.length >= 3) {
            processAudioChunk();
          }
        }
      };

      mediaRecorder.start(2000); // Collect data every 2 seconds
      setIsRecording(true);
      setRecordingStartTime(Date.now());
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Error accessing camera/microphone. Please check permissions.');
    }
  };

  const processAudioChunk = async () => {
    if (isTranscribing || mediaChunksRef.current.length === 0) return;
    
    setIsTranscribing(true);
    
    // Create audio blob from recent chunks
    const audioBlob = new Blob(mediaChunksRef.current, { type: 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioBlob);

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });
      
      const transcript = await response.json();
      
      if (transcript.length > 0 && transcript[0].text.trim()) {
        const transcribedText = transcript[0].text.trim();
        
        // Check if this is new content (not just repeated)
        if (transcribedText !== currentTranscriptionRef.current && 
            transcribedText.length > 10) {
          
          currentTranscriptionRef.current = transcribedText;
          
          // Clear timeout if user is still speaking
          if (speechTimeout) {
            clearTimeout(speechTimeout);
          }
          
          // Set timeout to send response after user stops speaking
          const timeout = setTimeout(() => {
            handleTranscribedResponse(transcribedText);
          }, 3000); // Wait 3 seconds after last speech
          
          setSpeechTimeout(timeout);
        }
      }
      
      // Clear processed chunks but keep the last few for continuity
      mediaChunksRef.current = mediaChunksRef.current.slice(-2);
      
    } catch (error) {
      console.error('Transcription error:', error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleTranscribedResponse = async (transcribedText: string) => {
    if (isProcessingResponse) return;
    
    setIsProcessingResponse(true);
    const currentTime = Date.now();
    const videoTimestamp = (currentTime - interviewStartTime) / 1000;
    
    const userMessage: Message = {
      from: 'user',
      text: transcribedText,
      timestamp: new Date(currentTime).toISOString(),
      questionId: INTERVIEW_QUESTIONS[currentQuestionIndex].id,
      videoTimestamp
    };
    
    setMessages(prev => [...prev, userMessage]);
    await saveMessage(userMessage);
    
    // Reset transcription tracking
    currentTranscriptionRef.current = '';
    
    // Analyze response depth and determine next action
    setTimeout(async () => {
      await analyzeResponseAndRespond(transcribedText, currentQuestionIndex);
      setIsProcessingResponse(false);
    }, 1000);
  };

  const analyzeResponseAndRespond = async (response: string, questionIndex: number) => {
    try {
      // Call backend to analyze response depth
      const analysisResponse = await fetch('/api/analyze-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          response,
          questionId: INTERVIEW_QUESTIONS[questionIndex].id,
          questionText: INTERVIEW_QUESTIONS[questionIndex].question
        }),
      });
      
      const analysis = await analysisResponse.json();
      
      let botMessage: Message;
      
      if (analysis.needsFollowUp) {
        // Ask follow-up question
        botMessage = {
          from: 'bot',
          text: analysis.followUpQuestion,
          timestamp: new Date().toISOString(),
          questionId: INTERVIEW_QUESTIONS[questionIndex].id,
          videoTimestamp: (Date.now() - interviewStartTime) / 1000,
          isFollowUp: true
        };
      } else {
        // Move to next question or end interview
        if (questionIndex < INTERVIEW_QUESTIONS.length - 1) {
          const nextQuestionIndex = questionIndex + 1;
          setCurrentQuestionIndex(nextQuestionIndex);
          
          botMessage = {
            from: 'bot',
            text: INTERVIEW_QUESTIONS[nextQuestionIndex].question,
            timestamp: new Date().toISOString(),
            questionId: INTERVIEW_QUESTIONS[nextQuestionIndex].id,
            videoTimestamp: (Date.now() - interviewStartTime) / 1000
          };
        } else {
          // Interview complete
          botMessage = {
            from: 'bot',
            text: "Thank you for completing the interview! I'm now generating your assessment report...",
            timestamp: new Date().toISOString(),
            videoTimestamp: (Date.now() - interviewStartTime) / 1000
          };
          
          setTimeout(() => {
            endInterview();
          }, 2000);
        }
      }
      
      setMessages(prev => [...prev, botMessage]);
      await saveMessage(botMessage);
      
    } catch (error) {
      console.error('Error analyzing response:', error);
      // Fallback to simple progression
      setTimeout(() => {
        proceedToNextQuestion();
      }, 1000);
    }
  };

  const proceedToNextQuestion = () => {
    if (currentQuestionIndex < INTERVIEW_QUESTIONS.length - 1) {
      const nextQuestionIndex = currentQuestionIndex + 1;
      const botMessage: Message = {
        from: 'bot',
        text: INTERVIEW_QUESTIONS[nextQuestionIndex].question,
        timestamp: new Date().toISOString(),
        questionId: INTERVIEW_QUESTIONS[nextQuestionIndex].id,
        videoTimestamp: (Date.now() - interviewStartTime) / 1000
      };
      setMessages(prev => [...prev, botMessage]);
      setCurrentQuestionIndex(nextQuestionIndex);
      saveMessage(botMessage);
    } else {
      endInterview();
    }
  };

  const endInterview = async () => {
    setInterviewStatus('completed');
    stopRecording();
    
    setTimeout(() => {
      generateReport();
    }, 2000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const generateReport = async () => {
    setInterviewStatus('generating_report');
    
    try {
      const conversationHistory = messages
        .filter(msg => msg.from === 'user')
        .map(msg => `Q: ${INTERVIEW_QUESTIONS.find(q => q.id === msg.questionId)?.question}\nA: ${msg.text}`)
        .join('\n\n');
      
      const response = await fetch('/api/score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          transcript: conversationHistory,
          interviewId,
          candidateName,
          candidateEmail
        }),
      });
      
      const scoreData = await response.json();
      setScores(scoreData);
      
      const rec = getRecommendation(scoreData);
      setRecommendation(rec);
      
      setShowReport(true);
      setInterviewStatus('completed');
      
    } catch (error) {
      console.error('Error generating report:', error);
      setInterviewStatus('completed');
    }
  };

  const saveMessage = async (message: Message) => {
    try {
      await fetch('/api/interview/message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interviewId,
          message
        }),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const downloadReport = () => {
    const reportData = {
      interviewId,
      candidateName,
      candidateEmail,
      timestamp: new Date().toISOString(),
      scores,
      recommendation,
      messages: messages.filter(msg => msg.from === 'user'),
      questions: INTERVIEW_QUESTIONS
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview_report_${candidateName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'recommend': return 'text-green-600 bg-green-100';
      case 'consider': return 'text-yellow-600 bg-yellow-100';
      case 'not_recommended': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRecommendationIcon = (rec: string) => {
    switch (rec) {
      case 'recommend': return '🟢';
      case 'consider': return '🟡';
      case 'not_recommended': return '🔴';
      default: return '⚪';
    }
  };

  if (showCandidateForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Momentum Interview</h1>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Candidate Name *
              </label>
              <input
                type="text"
                value={candidateName}
                onChange={(e) => setCandidateName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter candidate name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email (Optional)
              </label>
              <input
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter email address"
              />
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                📹 This interview will be recorded with automatic transcription
              </p>
              <p className="text-xs text-blue-600 mt-1">
                AI will analyze your responses and ask follow-up questions when needed
              </p>
            </div>
            <button
              onClick={startInterview}
              className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 transition-colors"
            >
              Start Interview
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Momentum Interview</h1>
              <p className="text-gray-900">Candidate: {candidateName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500 flex items-center">
                <span className="mr-2">Question {currentQuestionIndex + 1} of {INTERVIEW_QUESTIONS.length}</span>
                {isTranscribing && (
                  <span className="text-blue-600 animate-pulse">🎤 Listening...</span>
                )}
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                interviewStatus === 'active' ? 'bg-green-100 text-green-800' :
                interviewStatus === 'generating_report' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {interviewStatus === 'active' ? '🟢 Active' :
                 interviewStatus === 'generating_report' ? '🟡 Generating Report' :
                 '⚪ Completed'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Chat Interface - Left Side */}
          <div className="col-span-7 bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-medium mb-4">Interview Conversation</h3>
            <div className="space-y-4 h-96 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4">
              {messages.map((msg, i) => (
                <div key={i} className={`${msg.from === 'bot' ? 'text-left' : 'text-right'}`}>
                  <div className={`inline-block max-w-md px-4 py-3 rounded-lg ${
                    msg.from === 'bot' 
                      ? msg.isFollowUp 
                        ? 'bg-yellow-500 text-white'
                        : 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-800'
                  }`}>
                    <p className="text-sm">{msg.text}</p>
                    <span className="text-xs opacity-75 block mt-1">
                      {formatTimestamp(msg.timestamp)}
                      {msg.isFollowUp && ' (Follow-up)'}
                    </span>
                  </div>
                </div>
              ))}
              
              {isProcessingResponse && (
                <div className="text-center">
                  <div className="inline-block bg-gray-300 text-gray-600 px-4 py-2 rounded-lg animate-pulse">
                    🤖 Analyzing response...
                  </div>
                </div>
              )}
            </div>

            {/* Transcription Status */}
            {interviewStatus === 'active' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                    <span className="text-sm text-blue-800">
                      {isRecording ? 'Recording and listening...' : 'Recording paused'}
                    </span>
                  </div>
                  <button
                    onClick={() => setAutoTranscribeEnabled(!autoTranscribeEnabled)}
                    className={`text-xs px-2 py-1 rounded ${
                      autoTranscribeEnabled 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    Auto-transcribe: {autoTranscribeEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                {currentTranscriptionRef.current && (
                  <p className="text-xs text-blue-600 mt-2 italic">
                    Current: "{currentTranscriptionRef.current}"
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Video Recording - Right Side */}
          <div className="col-span-3 bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-medium mb-3">Video Recording</h3>
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden mb-4">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              {isRecording && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  🔴 REC
                </div>
              )}
            </div>

            {/* Recording Controls */}
            <div className="space-y-2">
              <div className="text-sm text-gray-600">
                Duration: {Math.floor((Date.now() - recordingStartTime) / 1000)}s
              </div>
              {interviewStatus === 'active' && (
                <button
                  onClick={isRecording ? stopRecording : startContinuousRecording}
                  className={`w-full py-2 px-4 rounded text-sm ${
                    isRecording 
                      ? 'bg-red-500 hover:bg-red-600 text-white' 
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {isRecording ? '⏹️ Stop Recording' : '▶️ Resume Recording'}
                </button>
              )}
            </div>
          </div>

          {/* Progress Sidebar - Right Side */}
          <div className="col-span-2 space-y-6">
            {/* Progress */}
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="font-medium mb-3">Progress</h3>
              <div className="space-y-2">
                {INTERVIEW_QUESTIONS.map((question, index) => (
                  <div key={question.id} className={`p-2 rounded text-sm ${
                    index < currentQuestionIndex ? 'bg-green-100 text-green-800' :
                    index === currentQuestionIndex ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    <div className="font-medium capitalize">{question.category}</div>
                    <div className="text-xs opacity-75">
                      {index < currentQuestionIndex ? '✅ Complete' :
                       index === currentQuestionIndex ? '🔄 Current' :
                       '⏳ Pending'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Report */}
            {showReport && scores && (
              <div className="bg-white rounded-lg shadow-sm p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Assessment</h3>
                  <button
                    onClick={downloadReport}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    📥
                  </button>
                </div>

                {/* Recommendation */}
                {recommendation && (
                  <div className={`p-3 rounded-lg mb-4 ${getRecommendationColor(recommendation.recommendation)}`}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs">
                        {getRecommendationIcon(recommendation.recommendation)} 
                        {recommendation.recommendation.toUpperCase().replace('_', ' ')}
                      </span>
                      <span className="text-xs">
                        {Math.round(recommendation.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Scores */}
                <div className="space-y-2">
                  {Object.entries(scores).map(([trait, score]) => {
                    if (trait === 'Rationale') return null;
                    return (
                      <div key={trait} className="border-b pb-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium">{trait}</span>
                          <span className="text-sm font-bold text-blue-600">{score}/10</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div 
                            className="bg-blue-600 h-1 rounded-full transition-all duration-500"
                            style={{ width: `${(score / 10) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 