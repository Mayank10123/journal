import { useState, useEffect } from 'react';
import { Camera, Sunrise, Droplet, Mountain, Target, Brain, Activity } from 'lucide-react';

const API_BASE = 'http://localhost:3001/api/journal';
const DUMMY_USER_ID = 'test-user-123';

function App() {
  const [entries, setEntries] = useState([]);
  const [insights, setInsights] = useState(null);
  
  const [ambience, setAmbience] = useState('forest');
  const [text, setText] = useState('');
  
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => {
    fetchEntries();
    fetchInsights();
  }, []);

  const fetchEntries = async () => {
    try {
      const res = await fetch(`${API_BASE}/${DUMMY_USER_ID}`);
      const data = await res.json();
      setEntries(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInsights = async () => {
    try {
      const res = await fetch(`${API_BASE}/insights/${DUMMY_USER_ID}`);
      const data = await res.json();
      setInsights(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async () => {
    if (!text) return;
    setAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      setAnalysisResult(data);
    } catch (err) {
      console.error('Failed to analyze:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text || !ambience) return;

    try {
      const payload = {
        userId: DUMMY_USER_ID,
        ambience,
        text,
        ...(analysisResult || {}) // Include emotion, keywords, summary if analyzed
      };

      await fetch(`${API_BASE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      setText('');
      setAnalysisResult(null);
      fetchEntries();
      fetchInsights();
    } catch (err) {
      console.error('Failed to submit:', err);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-900 text-neutral-100 p-6 md:p-12 font-sans selection:bg-emerald-500/30">
      <header className="max-w-5xl mx-auto mb-12 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <Camera className="w-5 h-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">ArvyaX <span className="text-neutral-500 font-normal">Journal</span></h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          {/* New Entry Form */}
          <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700/50 rounded-2xl p-6 shadow-xl transition-all hover:shadow-2xl hover:border-neutral-600/50">
            <h2 className="text-lg font-medium mb-6 flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-400" />
              New Session Entry
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-3">
                <label className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Immersion Ambience</label>
                <div className="grid grid-cols-3 gap-3">
                  {['forest', 'ocean', 'mountain'].map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAmbience(a)}
                      className={`px-4 py-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                        ambience === a 
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300' 
                        : 'bg-neutral-900/50 border-neutral-800 text-neutral-500 hover:border-neutral-700 hover:text-neutral-300'
                      }`}
                    >
                      {a === 'forest' && <Droplet className="w-5 h-5" />}
                      {a === 'ocean' && <Sunrise className="w-5 h-5" />}
                      {a === 'mountain' && <Mountain className="w-5 h-5" />}
                      <span className="text-sm capitalize">{a}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium text-neutral-400 uppercase tracking-wider">Your Experience</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="How did you feel during this session?"
                  className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 min-h-[160px] resize-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>

              {analysisResult && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400 font-medium">
                    <Brain className="w-4 h-4" /> Analyzed Insight
                  </div>
                  <p className="text-sm text-neutral-300 leading-relaxed">
                    {analysisResult.summary}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.emotion && (
                      <span className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-700 text-xs text-neutral-300">
                        Emotion: <span className="text-emerald-400 font-medium capitalize">{analysisResult.emotion}</span>
                      </span>
                    )}
                    {(analysisResult.keywords || []).map(kw => (
                      <span key={kw} className="px-2.5 py-1 rounded-md bg-neutral-900 border border-neutral-700 text-xs text-neutral-400 capitalize whitespace-nowrap">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing || !text}
                  className="px-6 py-3 rounded-xl bg-neutral-800 text-emerald-400 border border-emerald-500/20 font-medium hover:bg-neutral-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {analyzing ? (
                    <span className="animate-pulse">Analyzing...</span>
                  ) : (
                    <>
                      <Brain className="w-4 h-4" /> AI Analysis
                    </>
                  )}
                </button>
                <button
                  type="submit"
                  disabled={!text}
                  className="flex-1 px-6 py-3 rounded-xl bg-emerald-500 text-emerald-950 font-semibold hover:bg-emerald-400 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Entry
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium text-neutral-300">Previous Sessions</h3>
            <div className="grid gap-4">
              {entries.map(entry => (
                <div key={entry.id} className="bg-neutral-800/30 border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 bg-neutral-900 rounded-lg text-xs font-medium text-emerald-400 capitalize border border-emerald-500/20">
                      {entry.ambience}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-neutral-300 text-sm leading-relaxed mb-4">{entry.text}</p>
                  
                  {(entry.summary || entry.emotion || (entry.keywords && entry.keywords.length > 0)) && (
                    <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3">
                      {entry.summary && <p className="text-sm text-neutral-400 italic">"{entry.summary}"</p>}
                      <div className="flex gap-2 flex-wrap">
                        {entry.emotion && (
                          <span className="text-xs bg-neutral-900 text-emerald-500 px-2.5 py-1 rounded-md border border-neutral-800 capitalize">
                            {entry.emotion}
                          </span>
                        )}
                        {(entry.keywords || []).map(kw => (
                          <span key={kw} className="text-xs bg-neutral-900 text-neutral-500 px-2.5 py-1 rounded-md border border-neutral-800 capitalize">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {entries.length === 0 && (
                <div className="text-center py-12 text-neutral-500 border border-dashed border-neutral-800 rounded-xl flex flex-col items-center justify-center gap-2">
                  <Activity className="w-8 h-8 opacity-20" />
                  <p>No sessions recorded yet.</p>
                </div>
              )}
            </div>
          </div>

        </div>

        <div className="space-y-6 lg:h-[calc(100vh-8rem)]">
          <div className="bg-neutral-800/50 backdrop-blur-xl border border-neutral-700/50 rounded-2xl p-6 shadow-xl sticky top-8">
            <h2 className="text-lg font-medium mb-6 flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-400" />
              Mental State Insights
            </h2>
            
            {insights ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                    <p className="text-xs text-neutral-500 mb-1 uppercase tracking-wider">Total Sessions</p>
                    <p className="text-2xl font-semibold text-neutral-200">{insights.totalEntries}</p>
                  </div>
                  <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800 tracking-wide">
                    <p className="text-xs text-neutral-500 mb-1 uppercase tracking-wider">Top Ambience</p>
                    <p className="text-lg font-medium text-emerald-400 capitalize truncate">{insights.mostUsedAmbience || '-'}</p>
                  </div>
                </div>

                <div className="bg-neutral-900/50 rounded-xl p-4 border border-neutral-800">
                  <p className="text-xs text-neutral-500 mb-2 uppercase tracking-wider">Primary Emotion</p>
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-8 bg-emerald-500 rounded-full"></div>
                    <p className="text-xl font-medium text-neutral-200 capitalize">{insights.topEmotion || 'Need more data'}</p>
                  </div>
                </div>

                {insights.recentKeywords && insights.recentKeywords.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs text-neutral-500 uppercase tracking-wider">Recent Themes</p>
                    <div className="flex flex-wrap gap-2">
                      {insights.recentKeywords.map(kw => (
                        <span key={kw} className="px-3 py-1.5 bg-neutral-900 text-neutral-400 rounded-lg text-sm border border-neutral-800 capitalize">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="animate-pulse space-y-4">
                <div className="h-24 bg-neutral-800 rounded-xl"></div>
                <div className="h-24 bg-neutral-800 rounded-xl"></div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
