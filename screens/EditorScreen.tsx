
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { genManager, saveProjectWithVersions, fetchProjects } from '../geminiService';
import { ContentVersion, StudioProject } from '../types';

const EditorScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const rawNote = location.state?.rawNote || "";
  const initialVersion = location.state?.versionData as ContentVersion | undefined;
  const initialProjectId = location.state?.projectId as string | undefined;

  const [versions, setVersions] = useState<ContentVersion[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(initialProjectId || null);

  const [toast, setToast] = useState<{ show: boolean; message: string; type?: 'success' | 'info' | 'error' }>({ show: false, message: "" });
  const [isGeneratingExtra, setIsGeneratingExtra] = useState(false);

  useEffect(() => {
    const loadProject = async () => {
      if (initialProjectId) {
        try {
          const projects = await fetchProjects();
          const project = projects.find((p: StudioProject) => p.id === initialProjectId);
          if (project) {
            setVersions(project.versions);
            const idx = project.versions.findIndex((v: ContentVersion) => v.id === initialVersion?.id);
            setActiveIndex(idx !== -1 ? idx : 0);
            setIsLoading(false);
            return;
          }
        } catch (e) {
          console.error("Failed to load project", e);
        }
      }

      if (rawNote) {
        const startTask = async () => {
          const taskId = await genManager.startRefineTask(rawNote);
          setActiveTaskId(taskId);
        };
        startTask();
      } else if (initialVersion) {
        setVersions([initialVersion]);
        setIsLoading(false);
      }
    };
    loadProject();
  }, [rawNote, initialProjectId, initialVersion]);

  useEffect(() => {
    const unsubscribe = genManager.subscribe((tasks) => {
      if (activeTaskId) {
        const task = tasks.find(t => t.id === activeTaskId);
        if (task) {
          if (task.status === 'completed' && task.result) {
            setVersions(task.result);
            setIsLoading(false);
          } else if (task.status === 'error') {
            setIsLoading(false);
            showToast("生成失败", 'error');
          } else if (task.status === 'aborted') {
            setIsLoading(false);
          }
        }
      }

      const extraTask = tasks.find(t => t.type === 'single_version' && t.status === 'running' && t.projectId === currentProjectId);
      setIsGeneratingExtra(!!extraTask);

      const finishedExtra = tasks.find(t => t.type === 'single_version' && t.status === 'completed' && t.projectId === currentProjectId);
      if (finishedExtra && !toast.show && isGeneratingExtra) {
        showToast("新风格版本已加入项目", 'success');
        // Reload project from API to get the new version added by backend logic or fetch from backend?
        // Since our logic for single version generation adds to storage (API), we should re-fetch.
        // Or just update local state if we trust the result.
        // Let's re-fetch.
        fetchProjects().then(projects => {
          const p = projects.find((proj: any) => proj.id === currentProjectId);
          if (p) {
            setVersions(p.versions);
            setActiveIndex(p.versions.length - 1);
          }
        });
      }
    });
    return unsubscribe;
  }, [activeTaskId, currentProjectId, isGeneratingExtra, toast.show]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "" }), 3000);
  };

  const currentVersion = versions[activeIndex];

  const handleUpdateCurrent = (field: 'title' | 'content', value: string) => {
    const newVersions = [...versions];
    newVersions[activeIndex] = { ...newVersions[activeIndex], [field]: value };
    setVersions(newVersions);
  };

  const deleteVersion = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (versions.length <= 1) {
      showToast("至少需要保留一个版本", 'info');
      return;
    }
    const newVersions = versions.filter((_, i) => i !== index);
    setVersions(newVersions);
    if (activeIndex >= newVersions.length) {
      setActiveIndex(newVersions.length - 1);
    }
  };

  const handleSaveAll = async () => {
    if (versions.length === 0) return;
    try {
      const projectId = await saveProjectWithVersions(rawNote || currentVersion.content, versions, currentProjectId);
      setCurrentProjectId(projectId);
      showToast(`成功！已保存所有生成的笔记内容及 ${versions.length} 个版本`, 'success');
    } catch (e) {
      showToast("保存失败", 'error');
    }
  };

  const handleGenerateOneMore = async () => {
    const contextText = currentVersion?.content || rawNote;
    if (currentProjectId) {
      genManager.startSingleVersionTask(contextText, currentProjectId);
      showToast("AI 正在追加一篇新风格...", 'info');
    } else {
      try {
        const pid = await saveProjectWithVersions(rawNote || contextText, versions);
        setCurrentProjectId(pid);
        genManager.startSingleVersionTask(contextText, pid);
        showToast("项目已归档，AI 正在追加新风格...", 'info');
      } catch (e) {
        showToast("自动保存失败", 'error');
      }
    }
  };

  const handleCopy = async () => {
    if (!currentVersion) return;
    const textToCopy = `${currentVersion.title}\n\n${currentVersion.content}`;
    await navigator.clipboard.writeText(textToCopy);
    showToast("当前版本已复制", 'success');
  };

  return (
    <div className="flex-1 flex flex-col min-h-screen pb-32 bg-background-light dark:bg-background-dark animate-in slide-in-from-right duration-500 overflow-hidden">
      {toast.show && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 duration-300">
          <div className={`backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 border border-white/10 ${toast.type === 'error' ? 'bg-red-500/90' : toast.type === 'success' ? 'bg-primary/90' : 'bg-[#131616]/90'
            }`}>
            <span className="material-symbols-outlined text-xl">
              {toast.type === 'error' ? 'error' : toast.type === 'success' ? 'check_circle' : 'info'}
            </span>
            <span className="text-sm font-bold">{toast.message}</span>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <span className="material-symbols-outlined text-[#131616] dark:text-white text-2xl">close</span>
          </button>
          <div className="flex flex-col items-center">
            <h2 className="text-[#131616] dark:text-white text-base font-bold">创意编辑台</h2>
            {currentProjectId && (
              <span className="text-[9px] text-primary font-bold uppercase tracking-widest">存档同步中</span>
            )}
          </div>
          <button
            disabled={isLoading || isGeneratingExtra}
            onClick={handleGenerateOneMore}
            className={`flex items-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-[11px] font-bold transition-all active:scale-95 ${isLoading || isGeneratingExtra ? 'opacity-50' : ''}`}
          >
            <span className="material-symbols-outlined text-sm">auto_fix_normal</span>
            生成更多
          </button>
        </div>
      </header>

      {isLoading ? (
        <main className="flex-1 flex flex-col items-center justify-center p-10 text-center">
          <div className="relative mb-8">
            <div className="w-20 h-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-2xl animate-pulse">magic_button</span>
            </div>
          </div>
          <p className="text-lg font-bold text-[#131616] dark:text-white mb-2">正在获取您的深度创意...</p>
        </main>
      ) : (
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 py-4">
            <div className="flex overflow-x-auto gap-3 no-scrollbar pb-2 snap-x">
              {versions.map((v, i) => (
                <div
                  key={v.id}
                  onClick={() => setActiveIndex(i)}
                  className={`flex-shrink-0 w-44 h-24 rounded-2xl relative overflow-hidden transition-all snap-start border-2 ${activeIndex === i ? 'border-primary shadow-lg shadow-primary/20 scale-100' : 'border-transparent opacity-60 scale-95'
                    }`}
                >
                  <img src={v.imageUrl} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-black/40 p-3 flex flex-col justify-end">
                    <span className="text-[9px] font-black text-white/70 uppercase mb-1">{v.type}</span>
                    <p className="text-[10px] font-bold text-white line-clamp-1">{v.title}</p>
                  </div>
                  <button
                    onClick={(e) => deleteVersion(i, e)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-red-400"
                  >
                    <span className="material-symbols-outlined text-[14px]">close</span>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-1 mt-2">
              {versions.map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all ${activeIndex === i ? 'w-4 bg-primary' : 'w-1 bg-gray-300'}`}></div>
              ))}
            </div>
          </div>

          <div className="flex-1 px-4 overflow-y-auto no-scrollbar pb-32">
            <div className="bg-white dark:bg-[#1f2929] rounded-2xl shadow-sm border border-black/5 flex flex-col animate-in fade-in duration-300">
              <input
                type="text"
                value={currentVersion?.title || ""}
                onChange={(e) => handleUpdateCurrent('title', e.target.value)}
                placeholder="请输入标题..."
                className="text-lg font-bold bg-transparent border-none focus:ring-0 px-5 pt-6 pb-3 placeholder:text-gray-300 dark:placeholder:text-white/10"
              />
              <div className="h-px bg-gray-50 dark:bg-white/5 mx-5"></div>
              <textarea
                value={currentVersion?.content || ""}
                onChange={(e) => handleUpdateCurrent('content', e.target.value)}
                placeholder="灵感正文..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] leading-relaxed p-5 placeholder:text-gray-300 dark:placeholder:text-white/10 resize-none min-h-[350px]"
              />
            </div>
          </div>
        </main>
      )}

      {!isLoading && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-40 flex gap-3">
          <button
            onClick={handleCopy}
            className="flex-1 h-14 bg-white dark:bg-[#131616] text-[#131616] dark:text-white border border-black/5 dark:border-white/10 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl">content_copy</span>复制当前
          </button>
          <button
            onClick={handleSaveAll}
            className="flex-[1.4] h-14 bg-primary text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-xl">inventory_2</span>一键保存全部
          </button>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default EditorScreen;
