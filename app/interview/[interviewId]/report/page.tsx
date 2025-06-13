"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

// Simple Tab Component
function Tabs({ children, activeTab, onTabChange }: { 
  children: React.ReactNode[], 
  activeTab: number, 
  onTabChange: (index: number) => void 
}) {
  const tabLabels = ['🟩 Recruiter Report', '🟦 Trait Breakdown'];
  
  return (
    <div className="w-full">
      <div className="flex border-b border-gray-200 mb-6">
        {tabLabels.map((label, index) => (
          <button
            key={index}
            onClick={() => onTabChange(index)}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === index
                ? 'border-blue-500 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div>{children[activeTab]}</div>
    </div>
  );
}

// Simple Bar Chart Component
function TraitBarChart({ traits }: { traits: any[] }) {
  const validTraits = traits.filter(trait => trait.score !== null && trait.score !== undefined);
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border">
      <h3 className="text-lg font-semibold mb-4 text-black">Trait Scores</h3>
      <div className="space-y-3">
        {validTraits.map((trait, index) => {
          const score = trait.score || 0;
          const boundary = trait.boundary;
          const isInRange = boundary && score >= boundary.min && score <= boundary.max;
          
          return (
            <div key={index} className="relative">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-700">{trait.trait}</span>
                <span className={`text-sm font-bold ${isInRange ? 'text-green-600' : 'text-gray-600'}`}>
                  {score.toFixed(1)}/10
                </span>
              </div>
              <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                {/* Green zone highlighting */}
                {boundary && (
                  <div
                    className="absolute h-full bg-green-100 border-l-2 border-r-2 border-green-300"
                    style={{
                      left: `${(boundary.min / 10) * 100}%`,
                      width: `${((boundary.max - boundary.min) / 10) * 100}%`
                    }}
                  />
                )}
                {/* Score bar */}
                <div
                  className={`h-full transition-all duration-500 ${
                    isInRange ? 'bg-green-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${(score / 10) * 100}%` }}
                />
              </div>
              {boundary && (
                <div className="text-xs text-gray-500 mt-1">
                  Ideal range: {boundary.min}-{boundary.max}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Recruiter Report Component
function RecruiterReport({ data }: { data: any }) {
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation?.toLowerCase()) {
      case 'hire': return 'text-green-600 bg-green-100';
      case 'consider': return 'text-yellow-600 bg-yellow-100';
      case 'reject': 
      case 'not recommended': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getRecommendationIcon = (recommendation: string) => {
    switch (recommendation?.toLowerCase()) {
      case 'hire': return '🟢';
      case 'consider': return '🟡';
      case 'reject':
      case 'not recommended': return '🔴';
      default: return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      {/* Overall Score and Recommendation */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Overall Assessment</h2>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">
              {data.overall?.finalScore?.toFixed(1) || 'N/A'}/10
            </div>
            <div className="text-sm text-gray-500">Final Score</div>
          </div>
        </div>
        
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
          getRecommendationColor(data.overall?.recommendation || '')
        }`}>
          <span className="mr-2">{getRecommendationIcon(data.overall?.recommendation || '')}</span>
          {data.overall?.recommendation?.charAt(0).toUpperCase() + data.overall?.recommendation?.slice(1) || 'No recommendation'}
        </div>
      </div>

      {/* Job-fit Analysis */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-3 text-black">Job-fit Analysis</h3>
        <p className="text-gray-700 leading-relaxed">
          {data.overall?.overallRationale || 'No analysis available.'}
        </p>
      </div>

      {/* Trait Scores Chart */}
      <TraitBarChart traits={data.traits || []} />
    </div>
  );
}

// Video Player Component
function VideoPlayer({ videoUrl, startTime }: { videoUrl: string, startTime: number }) {
  // Remove any /api/videos/ prefix if it exists
  const cleanVideoUrl = videoUrl.replace(/^\/api\/videos\//, '');
  const [error, setError] = useState<string | null>(null);
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border mb-6">
      <h3 className="text-lg font-semibold mb-4 text-black">Interview Recording</h3>
      {error ? (
        <div className="text-red-500 p-4 bg-red-50 rounded-lg">
          Error loading video: {error}
        </div>
      ) : (
        <video 
          className="w-full rounded-lg"
          controls
          src={`/api/video/${encodeURIComponent(cleanVideoUrl)}`}
          onLoadedMetadata={(e) => {
            const video = e.target as HTMLVideoElement;
            video.currentTime = startTime;
          }}
          onError={(e) => {
            const video = e.target as HTMLVideoElement;
            setError(video.error?.message || 'Failed to load video');
          }}
        />
      )}
    </div>
  );
}

interface Score {
  videoUrl?: string;
  overall?: {
    finalScore?: number;
    recommendation?: string;
    overallRationale?: string;
  };
  traits?: Array<{
    trait: string;
    score: number;
    boundary?: {
      min: number;
      max: number;
    };
    rationale?: string;
    quotes?: Array<{
      text: string;
      videoFile?: string;
      start?: number;
    }>;
  }>;
}

// Trait Breakdown Component
function TraitBreakdown({ data }: { data: any }) {
  const [expandedTrait, setExpandedTrait] = useState<number | null>(null);
  const [activeClip, setActiveClip] = useState<{ videoFile: string, start: number } | null>(null);
  const validTraits = data.traits?.filter((trait: any) => trait.score !== null && trait.score !== undefined) || [];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Detailed Trait Analysis</h2>
      
      {activeClip && (
        <VideoPlayer 
          videoUrl={`/api/videos/${activeClip.videoFile}`} 
          startTime={activeClip.start} 
        />
      )}
      
      {validTraits.map((trait: any, index: number) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <button
            onClick={() => setExpandedTrait(expandedTrait === index ? null : index)}
            className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-800">{trait.trait}</h3>
                <span className="text-2xl font-bold text-blue-600">
                  {trait.score?.toFixed(1)}/10
                </span>
                {trait.boundary && (
                  <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Target: {trait.boundary.min}-{trait.boundary.max}
                  </span>
                )}
              </div>
              <div className="text-gray-400">
                {expandedTrait === index ? '▼' : '▶'}
              </div>
            </div>
          </button>
          
          {expandedTrait === index && (
            <div className="px-6 pb-6 border-t bg-gray-50">
              {/* Rationale */}
              <div className="mt-4">
                <h4 className="font-semibold text-gray-700 mb-2">Analysis</h4>
                <p className="text-gray-600 leading-relaxed">
                  {trait.rationale || 'No analysis available.'}
                </p>
              </div>
              
              {/* Quotes */}
              {trait.quotes && trait.quotes.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold text-gray-700 mb-2">Supporting Evidence</h4>
                  <div className="space-y-3">
                    {trait.quotes.map((quote: any, quoteIndex: number) => (
                      <div key={quoteIndex} className="bg-white p-4 rounded border-l-4 border-blue-500">
                        <blockquote className="text-gray-700 italic mb-2">
                          "{quote.text}"
                        </blockquote>
                        {quote.videoFile && (quote.start === 0 || quote.start) && (
                          <div className="text-sm text-blue-600">
                            📹 {quote.videoFile} at {Math.floor(quote.start)}s
                            <button 
                              className="ml-2 text-blue-500 hover:text-blue-700 underline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveClip({
                                  videoFile: quote.videoFile,
                                  start: quote.start
                                });
                              }}
                            >
                              Play clip
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      
      {validTraits.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No trait data available for detailed analysis.
        </div>
      )}
    </div>
  );
}

export default function ReportPage() {
  const router = useRouter();
  const { interviewId } = useParams();
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<Score | null>(null);
  const [activeTab, setActiveTab] = useState(1); // Default to trait breakdown tab

  useEffect(() => {
    if (!interviewId) return;
    setLoading(true);

    // First try to fetch existing analysis
    fetch(`/api/analysis/${interviewId}`)
      .then(res => {
        if (res.ok) {
          return res.json();
        }
        // If analysis doesn't exist, call score API
        return fetch('/api/score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interviewId }),
        }).then(res => res.json());
      })
      .then(data => {
        setScore(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [interviewId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-sm">
          <div className="text-xl font-bold mb-4 text-center text-black">Generating your report...</div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
          </div>
          <div className="text-sm text-gray-500 mt-4 text-center">
            This may take a few moments while we analyze the interview data.
          </div>
        </div>
      </div>
    );
  }

  if (!score) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-sm text-center">
          <div className="text-red-600 text-xl font-semibold mb-2">Report Generation Failed</div>
          <div className="text-gray-600 mb-4">We couldn't generate your interview report.</div>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Interview Report</h1>
          <p className="text-gray-600">Comprehensive analysis of candidate performance</p>
        </div>
        
        {score?.videoUrl && (
          <VideoPlayer videoUrl={score.videoUrl} startTime={0} />
        )}
        
        <Tabs activeTab={activeTab} onTabChange={setActiveTab}>
          <RecruiterReport data={score} />
          <TraitBreakdown data={score} />
        </Tabs>
      </div>
    </div>
  );
} 