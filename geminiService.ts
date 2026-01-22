
import { StudioProject, ContentVersion, Draft } from "./types";

export interface BackgroundTask {
  id: string;
  type: 'refine' | 'versions' | 'single_version';
  status: 'running' | 'completed' | 'error' | 'aborted';
  progress: number;
  result?: any;
  projectId?: string;
  abortController: AbortController;
}

class GenerationManager {
  private tasks: Map<string, BackgroundTask> = new Map();
  private listeners: Set<(tasks: BackgroundTask[]) => void> = new Set();

  subscribe(listener: (tasks: BackgroundTask[]) => void) {
    this.listeners.add(listener);
    listener(Array.from(this.tasks.values()));
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const taskList = Array.from(this.tasks.values());
    this.listeners.forEach(l => l(taskList));
  }

  abortTask(id: string) {
    const task = this.tasks.get(id);
    if (task) {
      task.abortController.abort();
      task.status = 'aborted';
      this.notify();
    }
  }

  async startRefineTask(rawNote: string): Promise<string> {
    const taskId = `refine-${Date.now()}`;
    const abortController = new AbortController();

    const task: BackgroundTask = {
      id: taskId,
      type: 'refine',
      status: 'running',
      progress: 0,
      abortController
    };

    this.tasks.set(taskId, task);
    this.notify();

    try {
      const versions = await generateInitialVersions(rawNote);
      if (versions && versions.length > 0) {
        task.status = 'completed';
        task.result = versions;
      } else {
        task.status = 'error';
      }
    } catch (e: any) {
      task.status = e.name === 'AbortError' ? 'aborted' : 'error';
    }

    this.notify();
    return taskId;
  }

  async startSingleVersionTask(coreNote: string, projectId: string): Promise<string> {
    const taskId = `single-${Date.now()}`;
    const abortController = new AbortController();

    const task: BackgroundTask = {
      id: taskId,
      type: 'single_version',
      status: 'running',
      progress: 0,
      projectId,
      abortController
    };

    this.tasks.set(taskId, task);
    this.notify();

    try {
      const version = await generateSingleVersion(coreNote);
      if (version) {
        // Need to update project with new version via API
        // But here we might rely on UI to refresh or handle it
        // The original code called saveVersionsToStorage here.
        // We should add it to the project if possible.
        await saveVersionsToStorage([version], projectId);
        task.status = 'completed';
        task.result = version;
      } else {
        task.status = 'error';
      }
    } catch (e: any) {
      task.status = e.name === 'AbortError' ? 'aborted' : 'error';
    }

    this.notify();
    return taskId;
  }
}

export const genManager = new GenerationManager();

// API Wrappers

export const saveProjectWithVersions = async (originalNote: string, versions: ContentVersion[], existingProjectId?: string | null): Promise<string> => {
  const projectId = existingProjectId || `project-${Date.now()}`;

  const project: StudioProject = {
    id: projectId,
    title: versions[0].title,
    originalNote: originalNote,
    versions: versions.map(v => ({ ...v, id: v.id.startsWith('temp-') ? `v-${Date.now()}-${Math.random().toString(36).substr(2, 9)}` : v.id })),
    tags: versions[0].tags,
    timestamp: Date.now(),
    mainImageUrl: versions[0].imageUrl
  };

  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project)
  });

  if (!res.ok) throw new Error('Failed to save project');
  return projectId;
};

// Helper to add versions to existing project
export const saveVersionsToStorage = async (newVersions: ContentVersion[], projectId: string) => {
  // We need to fetch current project first to maintain consistency or just push versions if backend supports it.
  // Our backend UPSERTS versions, so we just need to associate them with projectID.
  // However, the project object needs `versions` array if we use the main POST endpoint.
  // Or we use a specific approach. 
  // Simplest: Fetch project, append, Save.

  const projects = await fetchProjects();
  const project = projects.find(p => p.id === projectId);
  if (!project) return;

  const existingIds = new Set(project.versions.map(v => v.id));
  const uniqueNewVersions = newVersions.filter(v => !existingIds.has(v.id));

  const updatedProject = {
    ...project,
    versions: [...project.versions, ...uniqueNewVersions],
    timestamp: Date.now()
  };

  await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatedProject)
  });
};

export const updateProjectContent = async (projectId: string, versionId: string, updates: { title?: string, content?: string }) => {
  await fetch(`/api/projects/${projectId}/versions/${versionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
};

export const transcribeAudio = async (base64Data: string, mimeType: string) => {
  const res = await fetch('/api/ai/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Data, mimeType })
  });
  const data = await res.json();
  return data.text || "";
};

export const generateInitialVersions = async (rawNote: string): Promise<ContentVersion[]> => {
  const res = await fetch('/api/ai/refine', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawNote })
  });
  return await res.json();
};

export const generateSingleVersion = async (coreNote: string): Promise<ContentVersion | null> => {
  const res = await fetch('/api/ai/single', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coreNote })
  });
  return await res.json();
};

// New API methods for replacing localStorage reads

export const fetchProjects = async (): Promise<StudioProject[]> => {
  const res = await fetch('/api/projects');
  if (!res.ok) return [];
  return await res.json();
};

export const deleteRemoteProject = async (id: string) => {
  await fetch(`/api/projects/${id}`, { method: 'DELETE' });
};

export const fetchDrafts = async (): Promise<Draft[]> => {
  const res = await fetch('/api/drafts');
  if (!res.ok) return [];
  return await res.json();
};

export const saveDraft = async (draft: Draft) => {
  await fetch('/api/drafts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(draft)
  });
};

export const deleteDraft = async (id: string) => {
  await fetch(`/api/drafts/${id}`, { method: 'DELETE' });
};
