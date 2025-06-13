'use client';
import { useState, useRef, useEffect } from 'react';
import { INTERVIEW_QUESTIONS, getRecommendation } from '@/utils/questions';
import { useRouter } from 'next/navigation';

interface Message {
  from: 'bot' | 'user';
  text: string;
  timestamp: string;
  questionId?: string;
  videoTimestamp?: number;
  isFollowUp?: boolean;
}

interface TimedQuestion {
  questionId: string;
  text: string;
  timestamp: number;
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
  const [messages, setMessages] = useState<Message[]>([]);
  const [interviewStatus, setInterviewStatus] = useState<'not_started' | 'waiting_for_answer' | 'processing_answer' | 'completed' | 'generating_report'>('not_started');
  const [isLoading, setIsLoading] = useState(false);

  // Per-answer recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const router = useRouter();

  const [followUpCount, setFollowUpCount] = useState(0);
  const MAX_FOLLOWUPS = 2;

  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const saveMessage = async (payload: { interviewId: string, message: Message }) => {
    try {
      await fetch('/api/interview/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const name = searchParams.get('name');
    if (name) setCandidateName(name);
    else router.push('/');
    const email = searchParams.get('email');
    if (email) setCandidateEmail(email);
    const newId = `interview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setInterviewId(newId);
  }, [router]);

  useEffect(() => {
    if (!interviewId || interviewStatus !== 'not_started') return;

    // Restore Lily's friendly intro messages
    const introMsgs = [
      "Hi! I'm Lily, your AI interviewer. Nice to meet you! 😊",
      "I'm going to ask you a few questions to get to know you better. This interview is untimed and you can take your time with each response.",
      "When you've finished, I'll provide you with insights to help you in your job search. Are you ready to begin?",
      INTERVIEW_QUESTIONS[0]?.question || ''
    ];
    
    let i = 0;
    const addNext = () => {
      if (i < introMsgs.length) {
        const msgText = introMsgs[i];
        if (msgText && msgText.trim() !== '') {
          setMessages(prev => [...prev, { from: 'bot', text: msgText, timestamp: new Date().toISOString() }]);
        }
        i++;
        setTimeout(addNext, 1500);
      } else {
        // Start the first question
        setCurrentQuestionId(INTERVIEW_QUESTIONS[0]?.id || 'q1');
        startAnswerRecording();
      }
    };
    addNext();
  }, [interviewId, interviewStatus]);

  const startAnswerRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8,opus' });
      mediaRecorderRef.current = mediaRecorder;
      recordedChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordedChunksRef.current.push(event.data);
      };
      
      mediaRecorder.start(1000);
      setIsRecording(true);
      setInterviewStatus('waiting_for_answer');
      console.log('Started recording for question:', currentQuestionId);
      // Set a 2-minute timeout to auto-stop
      if (recordingTimeoutRef.current) clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = setTimeout(() => {
        if (isRecording) {
          alert('Maximum answer time (2 minutes) reached. Your answer will be submitted automatically.');
          processCurrentAnswer();
        }
      }, 120000);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to start recording. Please check permissions.');
    }
  };

  const processCurrentAnswer = async () => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
      recordingTimeoutRef.current = null;
    }
    if (!mediaRecorderRef.current || !streamRef.current || !isRecording) return;

    setInterviewStatus('processing_answer');
    setIsTranscribing(true);
    setIsRecording(false);

    try {
      // Stop the current recording
      mediaRecorderRef.current.stop();
      streamRef.current.getTracks().forEach(track => track.stop());

      // Wait for the final chunk
      await new Promise(resolve => {
        if (mediaRecorderRef.current) {
          mediaRecorderRef.current.onstop = resolve;
        }
      });

      // Create video blob and upload
      const videoBlob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
      const formData = new FormData();
      formData.append('video', videoBlob, 'answer.webm');
      formData.append('interviewId', interviewId);
      formData.append('questionId', currentQuestionId);
      formData.append('followUpIndex', followUpCount.toString());

      const response = await fetch('/api/transcribe', { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Transcription failed');
      
      const transcription = await response.json();
      const transcriptText = transcription?.map((s: any) => s.text).join(' ').trim() || '';

      if (transcriptText) {
        const userMessage: Message = { 
          from: 'user', 
          text: transcriptText, 
          timestamp: new Date().toISOString(), 
          questionId: currentQuestionId 
        };
        setMessages(prev => [...prev, userMessage]);

        // Gather all user responses for the current question
        const allUserResponses = [
          ...messages.filter(m => m.from === 'user' && m.questionId === currentQuestionId).map(m => m.text),
          transcriptText
        ].join(' ');

        const currentQuestion = INTERVIEW_QUESTIONS.find(q => q.id === currentQuestionId);
        const analysis = await analyzeResponse(allUserResponses, currentQuestionId, currentQuestion?.question || '');
        
        if ((analysis.needsFollowUp || analysis.isFollowUp) && analysis.followUpQuestion && followUpCount < MAX_FOLLOWUPS) {
          setFollowUpCount(followUpCount + 1);
          askFollowUpQuestion(analysis.followUpQuestion);
        } else {
          setFollowUpCount(0);
          askNextQuestion();
        }
      } else {
        setFollowUpCount(0);
        askNextQuestion();
      }
    } catch (error) {
      console.error('Error processing answer:', error);
      setFollowUpCount(0);
      askNextQuestion();
    } finally {
      setIsTranscribing(false);
    }
  };

  const askFollowUpQuestion = (followUpText: string) => {
    const botMessage: Message = { 
      from: 'bot', 
      text: followUpText, 
      timestamp: new Date().toISOString() 
    };
    setMessages(prev => [...prev, botMessage]);
    startAnswerRecording();
  };

  const askNextQuestion = async () => {
    if (currentQuestionIndex < INTERVIEW_QUESTIONS.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      const nextQuestion = INTERVIEW_QUESTIONS[nextIndex];
      setCurrentQuestionIndex(nextIndex);
      setCurrentQuestionId(nextQuestion.id);

      // Get previous user message
      const previousUserMessage = messages.filter(m => m.from === 'user').slice(-1)[0]?.text || '';
      // Rephrase the preset question for better flow
      let reworded = nextQuestion.question;
      try {
        const rephraseRes = await fetch('/api/rephrase-question', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ presetQuestion: nextQuestion.question, previousUserMessage }),
        });
        const data = await rephraseRes.json();
        if (data.reworded) reworded = data.reworded;
      } catch (e) {
        // fallback to original question
      }

      const botMessage: Message = { 
        from: 'bot', 
        text: reworded, 
        timestamp: new Date().toISOString() 
      };
      setMessages(prev => [...prev, botMessage]);
      startAnswerRecording();
    } else {
      endInterview();
    }
  };

  const analyzeResponse = async (transcript: string, questionId: string, questionText: string) => {
    const response = await fetch('/api/analyze-response', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: transcript, questionId, questionText }),
    });
    return await response.json();
  };

  const endInterview = async () => {
    setInterviewStatus('generating_report');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setMessages(prev => [...prev, { 
      from: 'bot', 
      text: "Great, that's all my questions. I'm now generating your report.", 
      timestamp: new Date().toISOString() 
    }]);
  };

  useEffect(() => {
    if (interviewStatus === 'generating_report' && interviewId) {
      router.push(`/interview/${interviewId}/report`);
    }
  }, [interviewStatus, interviewId, router]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl text-black font-bold">Interview Session</h1>
              <p className="text-gray-900">Candidate: {candidateName}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                interviewStatus === 'waiting_for_answer' ? 'bg-green-100 text-green-800' :
                interviewStatus === 'processing_answer' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {interviewStatus === 'waiting_for_answer' ? '🟢 Recording' :
                 interviewStatus === 'processing_answer' ? '🟡 Analyzing...' :
                 interviewStatus === 'generating_report' ? '📝 Generating Report...' :
                 '⚪ Not Started'}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-7 bg-white rounded-lg shadow-sm p-6 flex flex-col">
            <div className="flex-grow space-y-4 h-96 overflow-y-auto bg-gray-50 rounded-lg p-4 mb-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex items-start gap-3 ${msg.from === 'user' ? 'flex-row-reverse' : ''}`}>
                  {msg.from === 'bot' && (
                    <div className="flex-shrink-0">
                      <img 
                        src="/avatar.png" 
                        alt="Lily the Interviewer" 
                        className="w-8 h-8 rounded-full border-2 border-blue-200"
                      />
                    </div>
                  )}
                  <div className={`max-w-md px-4 py-3 rounded-lg ${
                    msg.from === 'bot' 
                      ? 'bg-blue-500 text-white rounded-tl-none' 
                      : 'bg-gray-200 text-gray-800 rounded-tr-none'
                  }`}>
                    <p className="text-sm">{msg.text}</p>
                    <span className={`text-xs block mt-1 ${
                      msg.from === 'bot' ? 'text-blue-100' : 'text-gray-600'
                    }`}>
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              {(interviewStatus === 'waiting_for_answer' || interviewStatus === 'processing_answer') && (
                <button
                  onClick={processCurrentAnswer}
                  disabled={interviewStatus === 'processing_answer'}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {interviewStatus === 'processing_answer' ? 'Analyzing...' : "I'm Done Answering"}
                </button>
              )}
            </div>
          </div>

          <div className="col-span-5 bg-white rounded-lg shadow-sm p-4">
            <h3 className="font-medium text-blackmb-3">Video Feed</h3>
            <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
              {isRecording && (
                <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full animate-pulse">
                  🔴 REC
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}