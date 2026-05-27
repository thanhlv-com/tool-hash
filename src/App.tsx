import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, Copy, Check, UploadCloud, Trash2, Cpu, Hash, AlertTriangle, ShieldCheck, Settings, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type AlgorithmDef = {
  id: string;
  desc?: string;
  fileOnly?: boolean;
};

const ALGORITHMS: AlgorithmDef[] = [
  { id: 'MD5', desc: 'Fast, widely used' },
  { id: 'SHA-1', desc: 'Legacy, fast', fileOnly: true },
  { id: 'SHA-256', desc: 'Highly secure' },
  { id: 'SHA-384', desc: 'Secure, 384-bit' },
  { id: 'SHA-512', desc: '64-bit opt.' },
  { id: 'SHA-3', desc: 'Latest standard' },
  { id: 'SHAKE128', desc: 'SHA-3 XOF' },
  { id: 'SHAKE256', desc: 'SHA-3 XOF' },
  { id: 'SM3', desc: 'Chinese standard' },
  { id: 'GOST 256', desc: 'Streebog 256' },
  { id: 'GOST 512', desc: 'Streebog 512', fileOnly: true },
  { id: 'RIPEMD-160', desc: 'Bitcoin standard' },
  { id: 'BLAKE2b', desc: 'Faster on 64-bit', fileOnly: true },
  { id: 'BLAKE2s', desc: 'Faster on 32-bit', fileOnly: true },
  { id: 'BLAKE3', desc: 'Extremely fast' },
];

type AlgoId = 'MD5' | 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512' | 'SHA-3' | 'SHAKE128' | 'SHAKE256' | 'SM3' | 'GOST 256' | 'GOST 512' | 'RIPEMD-160' | 'BLAKE2b' | 'BLAKE2s' | 'BLAKE3';

type EncodingType = 'Hex (Base 16)' | 'Base64' | 'Base 91' | 'Base 85' | 'Base 62' | 'Base 58' | 'Base 8' | 'Base 2';

export default function App() {
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  
  // Text state
  const [textInput, setTextInput] = useState('');
  
  // File state
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const [selectedAlgos, setSelectedAlgos] = useState<Set<AlgoId>>(new Set(['MD5', 'SHA-256']));
  const [selectedEncoding, setSelectedEncoding] = useState<EncodingType>('Hex (Base 16)');
  
  // Processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResultsState] = useState<Record<AlgoId, { status: 'computing' | 'done' | 'error', result?: string, error?: string }>>({} as any);
  const resultsRef = useRef<Record<AlgoId, { status: 'computing' | 'done' | 'error', result?: string, error?: string }>>({} as any);

  const setResults = useCallback((valOrFn: any) => {
    if (typeof valOrFn === 'function') {
      const next = valOrFn(resultsRef.current);
      resultsRef.current = next;
      setResultsState(next);
    } else {
      resultsRef.current = valOrFn;
      setResultsState(valOrFn);
    }
  }, []);

  const workerRef = useRef<Worker | null>(null);
  const currentJobIdRef = useRef<number>(0);
  const inputRef = useRef({ activeTab, textInput, file, selectedEncoding });

  // Copied state
  const [copiedId, setCopiedId] = useState<AlgoId | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./hashWorker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (e) => {
      const { jobId, algoId, status, result, error, done } = e.data;
      if (jobId !== currentJobIdRef.current) return;
      
      if (done) {
        setIsProcessing(false);
        return;
      }
      
      setResults((prev: any) => ({
        ...prev,
        [algoId as AlgoId]: { status, result, error }
      }));
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, [setResults]);

  useEffect(() => {
    const isInputChanged = 
      inputRef.current.activeTab !== activeTab ||
      inputRef.current.textInput !== textInput ||
      inputRef.current.file !== file ||
      inputRef.current.selectedEncoding !== selectedEncoding;
      
    inputRef.current = { activeTab, textInput, file, selectedEncoding };
    
    if (activeTab === 'text') {
      const timeoutId = setTimeout(() => {
        if (!textInput) {
          setResults({});
          return;
        }

        if (isInputChanged) {
          setResults({});
          currentJobIdRef.current += 1;
        }
        
        const algosToCompute: string[] = [];
        ALGORITHMS.forEach(a => {
          if (a.fileOnly && activeTab === 'text') return;
          if (selectedAlgos.has(a.id as AlgoId)) {
             if (isInputChanged || !resultsRef.current[a.id as AlgoId]) {
                algosToCompute.push(a.id);
             }
          }
        });
        
        if (algosToCompute.length > 0) {
           setIsProcessing(true);
           workerRef.current?.postMessage({
             jobId: currentJobIdRef.current,
             text: textInput,
             selectedAlgos: algosToCompute,
             selectedEncoding
           });
           
           setResults((prev: any) => {
             const next = { ...prev };
             algosToCompute.forEach(id => {
               next[id as AlgoId] = { status: 'computing' };
             });
             return next;
           });
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    } else {
      // file tab
      if (!file) {
        setResults({});
        return;
      }
      
      if (file.size > 100 * 1024 * 1024) {
        setFileError('File surpasses the 100MB limit. Please select a smaller file.');
        setIsProcessing(false);
        return;
      }
      
      setFileError(null);
      
      if (isInputChanged) {
        setResults({});
        currentJobIdRef.current += 1;
      }
      
      const algosToCompute: string[] = [];
      ALGORITHMS.forEach(a => {
        if (selectedAlgos.has(a.id as AlgoId)) {
           if (isInputChanged || !resultsRef.current[a.id as AlgoId]) {
              algosToCompute.push(a.id);
           }
        }
      });
      
      if (algosToCompute.length > 0) {
        setIsProcessing(true);
        
        setResults((prev: any) => {
           const next = { ...prev };
           algosToCompute.forEach(id => {
             next[id as AlgoId] = { status: 'computing' };
           });
           return next;
        });
        
        const jobId = currentJobIdRef.current;
        file.arrayBuffer().then(buffer => {
          if (currentJobIdRef.current !== jobId) return;
          workerRef.current?.postMessage({
             jobId,
             buffer,
             selectedAlgos: algosToCompute,
             selectedEncoding
          }, [buffer]);
        }).catch(err => {
          if (currentJobIdRef.current !== jobId) return;
          setFileError(err.message || 'Error reading file');
          setIsProcessing(false);
          setResults((prev: any) => {
             const next = { ...prev };
             algosToCompute.forEach(id => {
               next[id as AlgoId] = { status: 'error', error: err.message };
             });
             return next;
          });
        });
      }
    }
  }, [activeTab, textInput, file, selectedEncoding, selectedAlgos, setResults]);

  const toggleAlgo = (id: AlgoId) => {
    const next = new Set(selectedAlgos);
    if (next.has(id)) {
      if (next.size > 1) { // prevent deselecting all
        next.delete(id);
      }
    } else {
      next.add(id);
    }
    setSelectedAlgos(next);
  };

  const copyToClipboard = (id: AlgoId, hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const clearState = () => {
    setTextInput('');
    setFile(null);
    setResults({} as any);
    setFileError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="max-w-5xl mx-auto px-4 py-12 md:py-16">
        
        {/* Header */}
        <header className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between items-center gap-6">
          <div>
            <div className="flex items-center justify-center md:justify-start gap-3 mb-3">
              <div className="bg-indigo-600 p-2.5 rounded-xl shadow-sm text-white">
                <Hash className="w-6 h-6" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
                Multi-Algorithm Hasher
              </h1>
            </div>
            <p className="text-slate-500 font-medium max-w-lg">
              Securely hash text and files locally in your browser. Data never leaves your device.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 shadow-sm">
            <ShieldCheck className="w-4 h-4" />
            <span>100% Client-side Processing</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          
          {/* Main Workspace */}
          <div className="flex flex-col gap-6">
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              
              {/* Tab Navigation */}
              <div className="flex border-b border-slate-200">
                <button
                  onClick={() => { setActiveTab('text'); clearState(); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2 hover:bg-slate-50",
                    activeTab === 'text' 
                      ? "border-indigo-600 text-indigo-700 bg-indigo-50/50" 
                      : "border-transparent text-slate-500"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  Text Input
                </button>
                <button
                  onClick={() => { setActiveTab('file'); clearState(); }}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors border-b-2 hover:bg-slate-50",
                    activeTab === 'file' 
                      ? "border-indigo-600 text-indigo-700 bg-indigo-50/50" 
                      : "border-transparent text-slate-500"
                  )}
                >
                  <UploadCloud className="w-4 h-4" />
                  File Input
                </button>
              </div>

              {/* Input Area */}
              <div className="p-6">
                {activeTab === 'text' ? (
                  <div className="flex flex-col h-64">
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Type or paste your text here..."
                      className="flex-1 w-full resize-none outline-none text-slate-700 bg-transparent placeholder:text-slate-400"
                    />
                    {textInput && (
                      <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button
                          onClick={clearState}
                          className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Clear Text
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    className={cn(
                      "flex flex-col items-center justify-center border-2 border-dashed rounded-xl h-64 transition-all relative overflow-hidden",
                      file ? "border-indigo-200 bg-indigo-50/50" : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-indigo-300"
                    )}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    
                    {!file ? (
                      <div className="text-center px-6">
                        <div className="w-12 h-12 bg-white rounded-full shadow-sm border border-slate-200 flex items-center justify-center mx-auto mb-4 text-indigo-600">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800 mb-1">Upload a file</h3>
                        <p className="text-xs text-slate-500 mb-4">Drag and drop, or click to browse</p>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 active:scale-95 transition-all shadow-sm"
                        >
                          Browse Files
                        </button>
                        <p className="text-[10px] text-slate-400 mt-4 uppercase tracking-wider font-semibold">Max file size: 100MB</p>
                      </div>
                    ) : (
                      <div className="text-center w-full px-6 flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3 text-indigo-700">
                          <FileText className="w-6 h-6" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-800 truncate max-w-full mb-1">{file.name}</h3>
                        <p className="text-xs text-slate-500 mb-4">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        
                        <div className="flex gap-3">
                          <button 
                            onClick={clearState}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors shadow-sm"
                          >
                            Remove
                          </button>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200 transition-colors shadow-sm"
                          >
                            Change File
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Error Message */}
            {fileError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium">
                <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
                <p>{fileError}</p>
              </div>
            )}

            {/* Results Header */}
            {Object.keys(results).length === 0 && isProcessing ? (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col items-center justify-center text-slate-500 min-h-[300px]">
                <Cpu className="w-8 h-8 animate-pulse text-indigo-500 mb-4" />
                <p className="text-sm font-medium animate-pulse">Initializing hasher...</p>
              </div>
            ) : Object.keys(results).length > 0 ? (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between ml-1 gap-2">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    Generated Hashes
                  </h2>
                  {isProcessing && (
                    <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 shadow-sm w-fit">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Computing...
                    </div>
                  )}
                </div>
                <div className="grid gap-3">
                  {ALGORITHMS.filter(a => selectedAlgos.has(a.id as AlgoId) && !(activeTab === 'text' && a.fileOnly)).map((algo) => {
                    const res = results[algo.id as AlgoId];
                    if (!res) return null;
                    return (
                      <div key={algo.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col sm:flex-row items-stretch group">
                        <div className="bg-slate-100/50 border-r border-slate-100 sm:w-28 px-4 py-3 flex items-center justify-start sm:justify-center shrink-0">
                          <span className="font-semibold text-sm text-slate-700">{algo.id}</span>
                        </div>
                        <div className="flex-1 px-4 py-3 flex items-center bg-white overflow-hidden">
                          {res.status === 'computing' ? (
                            <div className="flex items-center gap-2 text-slate-400 text-[13px] font-medium">
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                              Computing hash...
                            </div>
                          ) : res.status === 'error' ? (
                            <div className="flex items-center gap-2 text-rose-500 text-[13px] font-medium truncate">
                              <AlertTriangle className="w-4 h-4 shrink-0" />
                              <span className="truncate">{res.error || 'Failed to compute'}</span>
                            </div>
                          ) : (
                            <code className="text-[13px] font-mono text-slate-600 truncate mr-4">
                              {res.result}
                            </code>
                          )}
                        </div>
                        {res.status === 'done' && res.result && (
                          <button
                            onClick={() => copyToClipboard(algo.id as AlgoId, res.result!)}
                            className={cn(
                              "flex items-center justify-center gap-2 px-5 py-3 sm:py-0 border-t sm:border-t-0 sm:border-l border-slate-100 transition-colors shrink-0 outline-none w-full sm:w-auto",
                              copiedId === algo.id
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600"
                            )}
                          >
                            {copiedId === algo.id ? (
                              <><Check className="w-4 h-4" /><span className="text-xs font-semibold sm:hidden">Copied</span></>
                            ) : (
                              <><Copy className="w-4 h-4" /><span className="text-xs font-semibold sm:hidden">Copy</span></>
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (activeTab === 'text' && !textInput) ? (
              <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 flex flex-col items-center justify-center text-slate-400 h-[200px]">
                <p className="text-sm font-medium">Results will appear here...</p>
              </div>
            ) : null}

          </div>

          {/* Right Sidebar: Algorithm Settings */}
          <aside>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 sticky top-8 flex flex-col gap-6">
              
              <div>
                <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider">Algorithms</h3>
                <div className="flex flex-col gap-2">
                {ALGORITHMS.filter(algo => !(activeTab === 'text' && algo.fileOnly)).map(algo => (
                  <label key={algo.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100 group">
                    <div className="relative flex items-center justify-center">
                      <input 
                        type="checkbox"
                        className="peer sr-only"
                        checked={selectedAlgos.has(algo.id as AlgoId)}
                        onChange={() => toggleAlgo(algo.id as AlgoId)}
                      />
                      <div className="w-5 h-5 rounded-[6px] border-2 border-slate-300 peer-checked:border-indigo-600 peer-checked:bg-indigo-600 flex items-center justify-center transition-all">
                        <Check className={cn(
                          "w-3.5 h-3.5 text-white transition-transform",
                          selectedAlgos.has(algo.id as AlgoId) ? "scale-100" : "scale-0 opacity-0"
                        )} />
                      </div>
                    </div>
                    <div>
                      <span className={cn(
                        "font-medium text-sm transition-colors",
                         selectedAlgos.has(algo.id as AlgoId) ? "text-slate-800" : "text-slate-500"
                      )}>
                        {algo.id}
                      </span>
                      {algo.desc && <span className="block text-[11px] text-slate-400 font-medium">{algo.desc}</span>}
                    </div>
                  </label>
                ))}
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100">
                <h3 className="font-bold text-slate-800 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Settings className="w-4 h-4 text-slate-500" />
                  Digest Encoding
                </h3>
                <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-xl">
                  {(['Hex (Base 16)', 'Base64', 'Base 91', 'Base 85', 'Base 62', 'Base 58', 'Base 8', 'Base 2'] as EncodingType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setSelectedEncoding(type)}
                      className={cn(
                        "flex-1 min-w-[30%] py-1.5 px-2 text-xs font-semibold rounded-lg transition-all",
                        selectedEncoding === type ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                      )}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-3 font-medium">
                  Resulting hash string representation. Hex is standard.
                </p>
              </div>

            </div>
          </aside>

        </div>
      </div>
    </div>
  );
}
