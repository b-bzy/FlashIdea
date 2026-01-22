
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { transcribeAudio, fetchDrafts, saveDraft } from '../geminiService';
import { Draft } from '../types';

const QuickNoteScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [note, setNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const [isSaving, setIsSaving] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const autoSaveTimerRef = useRef<number | null>(null);

  useEffect(() => {
    // 加载初始内容
    if (location.state?.draftToLoad) {
      setNote(location.state.draftToLoad.text);
    } else {
      setNote('今天我在思考“隐形进步”这个概念。当我们看不到即时结果时，往往会感到停滞不前，但就像埋在土里的种子一样，最重要的成长往往发生在黑暗中。对于创作者来说，这意味着每一篇“糟糕”的发布，实际上都是通往未来杰作的一块基石...');
    }
  }, [location.state]);

  // 加载草稿历史
  useEffect(() => {
    const loadDrafts = async () => {
      try {
        const savedDrafts = await fetchDrafts();
        setDrafts(savedDrafts);
      } catch (e) {
        console.error(e);
      }
    };
    loadDrafts();
  }, []);

  // 实现自动保存草稿（防抖）
  useEffect(() => {
    if (!note.trim()) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(() => {
      performAutoSave();
    }, 2000); // 停止输入2秒后自动保存

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [note]);

  const performAutoSave = async () => {
    setIsSaving(true);
    // Fetch latest to check diff? Or trust local? 
    // We will trust local state for "currentDrafts" but fetchDrafts is usually better.
    // For simplicity, we just save the new draft.
    const currentDrafts = drafts; // Use state

    // 如果当前内容和最后一次保存的一样，就不再保存
    if (currentDrafts.length > 0 && currentDrafts[0].text === note) {
      setIsSaving(false);
      return;
    }

    const newDraft: Draft = {
      id: Date.now().toString(),
      text: note,
      timestamp: Date.now(),
    };

    // Update local immediately for UI
    const updatedDrafts = [newDraft, ...currentDrafts].slice(0, 20);
    setDrafts(updatedDrafts);

    // Async save to backend
    try {
      await saveDraft(newDraft);
    } catch (e) {
      console.error("Auto save failed", e);
    }

    setTimeout(() => setIsSaving(false), 500);
  };

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  const silenceTimerRef = useRef<number | null>(null);

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = window.setTimeout(() => {
      stopRecording();
      showToast("检测到长时间静音，自动停止");
    }, 10000); // 10 seconds
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Start silence detection immediately
      resetSilenceTimer();

      // Analyze audio volume
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkVolume = () => {
        if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
          audioContext.close();
          return;
        }
        analyser.getByteFrequencyData(dataArray);
        const sum = dataArray.reduce((a, b) => a + b, 0);
        const average = sum / dataArray.length;

        // Threshold for "sound" (adjustable)
        if (average > 10) {
          resetSilenceTimer(); // Reset timer if sound detected
        }
        requestAnimationFrame(checkVolume);
      };

      checkVolume();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = (reader.result as string).split(',')[1];
          setIsTranscribing(true);
          try {
            const transcribedText = await transcribeAudio(base64Data, 'audio/webm');
            if (transcribedText) {
              setNote(prev => prev ? prev + '\n' + transcribedText : transcribedText);
              showToast("语音已精准转录");
            }
          } catch (error) {
            showToast("语音识别失败");
          } finally {
            setIsTranscribing(false);
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      showToast("无法开启麦克风");
    }
  };

  // Fix: stopRecording should not depend on closure state 'isRecording'
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleStartGeneration = () => {
    // 离开前强制保存一次
    performAutoSave();
    navigate('/editor', { state: { rawNote: note } });
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className="flex-1 flex flex-col animate-in fade-in duration-500 relative">
      {toast.show && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-[#131616]/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-white/10">
            <span className="material-symbols-outlined text-primary text-xl">check_circle</span>
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        </div>
      )}

      <div className="sticky top-0 z-10 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#131616] dark:text-white leading-tight">闪念速记</h1>
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-widest text-primary font-bold">Capture</span>
              {isSaving && (
                <span className="text-[9px] text-gray-400 animate-pulse font-medium">已自动备份</span>
              )}
            </div>
          </div>
        </div>
        <button onClick={() => setShowHistory(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white dark:hover:bg-white/10 transition-colors text-[#131616] dark:text-white">
          <span className="material-symbols-outlined">history</span>
        </button>
      </div>

      <main className="flex-1 px-4 py-2 flex flex-col gap-6">


        <div className="flex-1 flex flex-col">
          <div className="relative glass-card rounded-2xl spark-shadow p-5 flex-1 flex flex-col min-h-[300px]">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : (isTranscribing ? 'bg-yellow-500 animate-spin' : 'bg-primary')}`}></span>
                <span className="text-[10px] font-bold text-[#6b7e80] uppercase tracking-wider">{isTranscribing ? 'AI 正在转译...' : '灵感备忘录'}</span>
              </div>
              <span className="text-[#6b7e80] text-[10px] font-bold bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">{note.length} 字</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={isTranscribing}
              className={`flex-1 w-full bg-transparent border-none focus:ring-0 text-[#131616] dark:text-white text-[17px] font-normal leading-relaxed placeholder:text-[#6b7e80]/50 resize-none p-0 ${isTranscribing ? 'opacity-50' : ''}`}
              placeholder="此刻你在想什么？"
            />
          </div>
        </div>

        <div className="flex flex-col items-center py-8 justify-center relative min-h-[140px]">
          {/* Ripple Effect Background (Only when recording) */}
          {isRecording && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
              <span className="animate-ping absolute inline-flex h-28 w-28 rounded-full bg-red-400 opacity-20"></span>
              <span className="absolute inline-flex rounded-full h-32 w-32 bg-red-500/10 animate-pulse"></span>
            </div>
          )}

          <button
            onClick={toggleRecording}
            disabled={isTranscribing}
            className={`
              relative z-10 w-24 h-24 rounded-full flex items-center justify-center 
              shadow-2xl transition-all duration-300 active:scale-90
              ${isRecording
                ? 'bg-gradient-to-tr from-red-500 to-rose-600 shadow-red-500/50 ring-4 ring-red-100 dark:ring-red-900/30 scale-110'
                : (isTranscribing
                  ? 'bg-gray-100 dark:bg-white/10 ring-4 ring-gray-200 dark:ring-white/5 cursor-wait'
                  : 'bg-gradient-to-tr from-primary to-teal-400 shadow-primary/40 hover:shadow-primary/60 hover:-translate-y-1'
                )
              }
            `}
          >
            <span className={`material-symbols-outlined text-5xl transition-all duration-300 
              ${isRecording ? 'text-white scale-110' : (isTranscribing ? 'text-[#6b7e80] animate-spin' : 'text-white scale-100')}
            `}>
              {isTranscribing ? 'progress_activity' : (isRecording ? 'graphic_eq' : 'mic')}
            </span>
          </button>

          <p className={`mt-6 text-xs font-bold tracking-[0.2em] uppercase transition-colors duration-300 ${isRecording ? 'text-red-500 animate-pulse' : 'text-[#6b7e80]'}`}>
            {isTranscribing ? '正在转写文字...' : (isRecording ? '正在倾听...' : '点击录制灵感')}
          </p>
        </div>
      </main>

      <div className="p-4 bg-gradient-to-t from-background-light dark:from-background-dark pb-32">
        <div className="flex gap-3 max-w-[480px] mx-auto">
          <button
            onClick={() => { performAutoSave(); showToast("已手动更新存档"); }}
            className="flex-1 h-14 rounded-2xl border-2 border-primary/20 font-bold bg-white dark:bg-white/5 text-sm transition-all active:scale-95"
          >
            强制存稿
          </button>
          <button
            onClick={handleStartGeneration}
            disabled={!note.trim()}
            className="flex-[1.8] h-14 rounded-2xl bg-primary text-white font-bold shadow-lg shadow-primary/25 text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span>AI 深度生成</span>
            <span className="material-symbols-outlined text-lg">magic_button</span>
          </button>
        </div>
      </div>

      {/* 历史面板逻辑保持不变... */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setShowHistory(false)}></div>
          <div className="relative bg-white dark:bg-[#151d1d] rounded-t-[2rem] p-6 max-h-[80vh] overflow-y-auto no-scrollbar animate-in slide-in-from-bottom duration-300">
            <div className="w-12 h-1 bg-gray-200 dark:bg-white/10 rounded-full mx-auto mb-6"></div>
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">history</span>历史存档
            </h3>
            <div className="space-y-3">
              {drafts.map(d => (
                <div key={d.id} onClick={() => { setNote(d.text); setShowHistory(false); }} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl cursor-pointer hover:border-primary/30 border border-transparent">
                  <p className="text-sm line-clamp-2 text-gray-600 dark:text-gray-300">{d.text}</p>
                  <div className="flex justify-between mt-2">
                    <span className="text-[10px] text-gray-400">{formatTime(d.timestamp)}</span>
                    <span className="text-[10px] text-primary font-bold">加载灵感</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default QuickNoteScreen;
