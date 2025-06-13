'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from "next/image";

export default function HomePage() {
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const router = useRouter();

  const startInterview = () => {
    if (!candidateName.trim()) {
      alert('Please enter candidate name');
      return;
    }
    
    // Encode the data to be passed via URL
    const queryParams = new URLSearchParams({
      name: candidateName,
      email: candidateEmail || ''
    }).toString();
    
    router.push(`/interview?${queryParams}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 className="text-2xl text-black font-bold text-center mb-6">Momentum Interview</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Candidate Name *
            </label>
            <input
              type="text"
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              className="w-full border border-black rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-black text-black"
              placeholder="Enter candidate name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-black mb-2">
              Email (Optional)
            </label>
            <input
              type="email"
              value={candidateEmail}
              onChange={(e) => setCandidateEmail(e.target.value)}
              className="w-full border border-black rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-black text-black"
              placeholder="Enter email address"
            />
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800">
              📹 This interview will be recorded with automatic transcription
            </p>
            <p className="text-xs text-blue-800 mt-1">
              AI will analyze your responses and ask follow-up questions when needed
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
            <p className="text-sm text-yellow-800 font-medium">
              📋 Before we start:
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              Your browser will ask for camera and microphone permissions. Please click "Allow" to continue with the interview.
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
