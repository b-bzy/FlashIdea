
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BottomNav from '../components/BottomNav';
import { genManager, BackgroundTask, fetchProjects, deleteRemoteProject, fetchDrafts, deleteDraft as deleteRemoteDraft, saveProjectWithVersions } from '../geminiService';
import { StudioProject, Draft, ContentVersion } from '../types';

const StudioVersionsScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const coreNoteFromState = location.state?.coreNote;
  const targetProjectId = location.state?.projectId;

  const [activeTab, setActiveTab] = useState<'completed' | 'draft'>('completed');
  const [savedProjects, setSavedProjects] = useState<StudioProject[]>([]);
  const [savedDrafts, setSavedDrafts] = useState<Draft[]>([]);
  const [runningTasks, setRunningTasks] = useState<BackgroundTask[]>([]);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" });

  const [selectedProject, setSelectedProject] = useState<StudioProject | null>(null);

  useEffect(() => {
    loadSavedData();
    if (coreNoteFromState && targetProjectId) {
      genManager.startSingleVersionTask(coreNoteFromState, targetProjectId);
    }
  }, [coreNoteFromState, targetProjectId]);

  useEffect(() => {
    const unsubscribe = genManager.subscribe((tasks) => {
      const active = tasks.filter(t => t.status === 'running');
      setRunningTasks(active);
      if (tasks.some(t => t.status === 'completed')) {
        loadSavedData();
      }
    });
    return unsubscribe;
  }, []);

  const loadSavedData = async () => {
    try {
      const projects = await fetchProjects();
      const drafts = await fetchDrafts();
      setSavedProjects(projects);
      setSavedDrafts(drafts);

      if (selectedProject) {
        const updated = projects.find((p: StudioProject) => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    } catch (e) {
      console.error("Failed to load data", e);
    }
  };

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: "" }), 2000);
  };

  const deleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('确认删除该主题项目及其所有版本吗？')) {
      await deleteRemoteProject(id);
      loadSavedData();
      showToast("项目已移除");
    }
  };

  const deleteVersion = async (versionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedProject) return;

    if (window.confirm('确认删除该版本吗？')) {
      const updatedVersions = selectedProject.versions.filter(v => v.id !== versionId);

      try {
        // Optimistic update
        const updatedProject = { ...selectedProject, versions: updatedVersions };
        setSelectedProject(updatedProject); // Update UI

        const projects = savedProjects.map(p => p.id === selectedProject.id ? updatedProject : p);
        setSavedProjects(projects);

        await saveProjectWithVersions(selectedProject.originalNote, updatedVersions, selectedProject.id);
        showToast("版本已移除");
      } catch (e) {
        showToast("删除失败，请重试");
        loadSavedData(); // Revert
      }
    }
  };

  const deleteDraft = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteRemoteDraft(id);
    loadSavedData();
    showToast("草稿已移除");
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  if (selectedProject) {
    return (
      <div className="flex-1 flex flex-col h-screen bg-background-light dark:bg-background-dark animate-in slide-in-from-right duration-300">
        {toast.show && (
          <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
            <div className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold border border-white/10 flex items-center gap-2 shadow-2xl">
              <span className="material-symbols-outlined text-sm">delete</span>{toast.message}
            </div>
          </div>
        )}

        <header className="sticky top-0 z-10 bg-white/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-gray-100 dark:border-white/5">
          <button onClick={() => setSelectedProject(null)} className="p-2">
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </button>
          <div className="flex flex-col items-center max-w-[200px]">
            <h2 className="text-sm font-bold truncate">{selectedProject.title}</h2>
            <span className="text-[9px] text-primary font-bold tracking-tighter">PROJECT VERSIONS</span>
          </div>
          <div className="w-10"></div>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10">
            <p className="text-[11px] text-primary font-bold uppercase mb-2">原始灵感</p>
            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-3">{selectedProject.originalNote}</p>
          </div>

          <div className="grid grid-cols-1 gap-4 pb-20">
            {selectedProject.versions.map((version: ContentVersion) => (
              <div
                key={version.id}
                className="bg-white dark:bg-[#1f2929] rounded-2xl overflow-hidden shadow-sm border border-black/5 active:scale-98 transition-transform relative group"
              >
                {/* 修改处：点击版本时带入 projectId */}
                <div onClick={() => navigate('/editor', { state: { versionData: version, projectId: selectedProject.id } })} className="cursor-pointer">
                  <div className="h-24 bg-gray-100 relative overflow-hidden">
                    <img src={version.imageUrl} className="w-full h-full object-cover opacity-60" alt="" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
                      <span className="text-[10px] font-bold text-white uppercase px-2 py-0.5 bg-primary/80 rounded-md backdrop-blur-sm">
                        {version.type}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 pr-12">
                    <h4 className="font-bold text-sm mb-1">{version.title}</h4>
                    <p className="text-[11px] text-gray-500 line-clamp-2">{version.description || version.content?.substring(0, 50) + '...'}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => deleteVersion(version.id, e)}
                  className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}

            {runningTasks.some(t => t.projectId === selectedProject.id) && (
              <div className="border-2 border-dashed border-primary/30 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 animate-pulse bg-primary/5">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs font-bold text-primary">新版本生成中...</span>
              </div>
            )}
          </div>
        </main>
        <BottomNav activeTab="studio" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background-light dark:bg-background-dark animate-in fade-in duration-500">
      {toast.show && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4">
          <div className="bg-black/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-xs font-bold border border-white/10 flex items-center gap-2 shadow-2xl">
            <span className="material-symbols-outlined text-sm">delete</span>{toast.message}
          </div>
        </div>
      )}

      <header className="px-6 pt-8 pb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-[#131616] dark:text-white">工作室</h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mt-1">Creation Center</p>
        </div>
        <div className="flex gap-1 mb-1">
          {runningTasks.map(t => (
            <div key={t.id} className="w-2 h-2 rounded-full bg-primary animate-ping"></div>
          ))}
        </div>
      </header>

      <div className="px-6 py-2">
        <div className="flex bg-gray-200/50 dark:bg-white/5 p-1 rounded-2xl">
          <button onClick={() => setActiveTab('completed')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'completed' ? 'bg-white dark:bg-[#2a3636] shadow-sm text-primary' : 'text-gray-400'}`}>主题项目</button>
          <button onClick={() => setActiveTab('draft')} className={`flex-1 py-3 text-xs font-bold rounded-xl transition-all ${activeTab === 'draft' ? 'bg-white dark:bg-[#2a3636] shadow-sm text-primary' : 'text-gray-400'}`}>草稿箱</button>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 pt-4">
        {activeTab === 'completed' ? (
          <div className="grid grid-cols-1 gap-4">
            {savedProjects.length === 0 ? (
              <div className="py-20 text-center space-y-3 opacity-30">
                <span className="material-symbols-outlined text-5xl">folder_off</span>
                <p className="text-sm font-bold">暂无灵感项目</p>
              </div>
            ) : (
              savedProjects.map(project => (
                <div
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className="bg-white dark:bg-[#1f2929] p-5 rounded-3xl border border-black/5 shadow-sm space-y-3 active:scale-[0.99] transition-all relative overflow-hidden group"
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-base leading-tight max-w-[70%] truncate">{project.title}</h4>
                    <div className="flex items-center gap-2">
                      {runningTasks.some(t => t.projectId === project.id) && (
                        <span className="flex h-2 w-2 rounded-full bg-primary animate-ping"></span>
                      )}
                      <button
                        onClick={(e) => deleteProject(project.id, e)}
                        className="w-8 h-8 rounded-full bg-gray-50 dark:bg-white/5 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-gray-400">
                    <div className="flex items-center gap-2 font-bold">
                      <span className="material-symbols-outlined text-[12px]">layers</span>
                      <span>{project.versions.length} 个版本</span>
                    </div>
                    <span>{formatTime(project.timestamp)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {savedDrafts.length === 0 ? (
              <div className="py-20 text-center space-y-3 opacity-30">
                <span className="material-symbols-outlined text-5xl">edit_off</span>
                <p className="text-sm font-bold">草稿箱空空如也</p>
              </div>
            ) : (
              savedDrafts.map(draft => (
                <div key={draft.id} className="bg-white dark:bg-[#1f2929] p-5 rounded-3xl border border-black/5 space-y-4 relative group">
                  <p className="text-sm line-clamp-2 pr-10">{draft.text}</p>
                  <button
                    onClick={(e) => deleteDraft(draft.id, e)}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-gray-400">{formatTime(draft.timestamp)}</span>
                    <button onClick={() => navigate('/', { state: { draftToLoad: draft } })} className="px-4 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-bold">载入编辑</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <BottomNav activeTab="studio" />
    </div>
  );
};

export default StudioVersionsScreen;
