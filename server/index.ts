
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI, Type } from "@google/genai";
import { logAction } from './logger';

// Load configuration
const configPath = path.resolve(process.cwd(), 'project.config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Supabase Init
// Supabase Init
let supabase: any;
try {
    if (!config.supabase.url.startsWith('http')) {
        console.warn('Invalid Supabase URL. Using mock client or skipping initialization.');
    }
    supabase = createClient(config.supabase.url, config.supabase.key);
} catch (e) {
    console.warn("Supabase init failed (likely missing config). Using mock client.");
    supabase = {
        from: () => ({
            select: () => ({ data: [], error: null }),
            upsert: () => ({ error: null }),
            delete: () => ({ error: null }),
            update: () => ({ error: null })
        })
    };
}

// AI Init
const ai = new GoogleGenAI({ apiKey: config.gemini.apiKey });

// Constants from Types
interface ContentVersion {
    id: string;
    title: string;
    tags: string[];
    description: string;
    content: string;
    imageUrl: string;
    type: 'standard' | 'detailed' | 'story' | 'analysis' | 'minimalist';
    isRecommended?: boolean;
}

interface StudioProject {
    id: string;
    title: string;
    originalNote: string;
    versions: ContentVersion[];
    tags: string[];
    timestamp: number;
    mainImageUrl?: string;
}

// Routes

// 1. Projects - List
app.get('/api/projects', async (req, res) => {
    try {
        const { data: projectsData, error } = await supabase
            .from('projects')
            .select('*')
            .order('timestamp', { ascending: false });

        if (error) throw error;

        const { data: versionsData, error: vError } = await supabase
            .from('versions')
            .select('*');

        if (vError) throw vError;

        const projects: StudioProject[] = projectsData.map((p: any) => ({
            id: p.id,
            title: p.title,
            originalNote: p.original_note,
            tags: p.tags || [],
            timestamp: Number(p.timestamp),
            mainImageUrl: p.main_image_url,
            versions: versionsData
                .filter((v: any) => v.project_id === p.id)
                .map((v: any) => ({
                    id: v.id,
                    title: v.title,
                    tags: v.tags || [],
                    description: v.description,
                    content: v.content,
                    imageUrl: v.image_url,
                    type: v.type,
                    isRecommended: v.is_recommended
                }))
        }));

        logAction('FETCH_PROJECTS', { count: projects.length });
        res.json(projects);
    } catch (err: any) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Save/Update Project
app.post('/api/projects', async (req, res) => {
    try {
        const project: StudioProject = req.body;

        // Upsert Project
        const { error: pError } = await supabase
            .from('projects')
            .upsert({
                id: project.id,
                title: project.title,
                original_note: project.originalNote,
                tags: project.tags,
                timestamp: project.timestamp,
                main_image_url: project.mainImageUrl
            });

        if (pError) throw pError;

        // Detect deleted versions: Find versions in DB for this project that are NOT in the payload
        const versionIdsInPayload = project.versions.map((v: any) => v.id);

        // 1. Delete missing versions
        const { error: deleteError } = await supabase
            .from('versions')
            .delete()
            .eq('project_id', project.id)
            .not('id', 'in', `(${versionIdsInPayload.join(',')})`); // Note: ensure IDs are safe or use a better filter if possible. 
        // Supabase client .in() expects array. .not('id', 'in', array)

        if (versionIdsInPayload.length > 0) {
            const { error: dError } = await supabase
                .from('versions')
                .delete()
                .eq('project_id', project.id)
                .not('id', 'in', `(${versionIdsInPayload.map(id => `"${id}"`).join(',')})`);
            // Actually, the Supabase syntax for "not in" with array:
            // .not('id', 'in', versionIdsInPayload) -> this might not work as expected in all versions or requires exact syntax.
            // Alternative: Fetch existing IDs, compare in JS, delete specific IDs.
        } else {
            // If payload has 0 versions, delete all for this project?
            // Yes.
            const { error: dError } = await supabase.from('versions').delete().eq('project_id', project.id);
            if (dError) throw dError;
        }

        // Better Approach: Fetch existing, Diff, Delete.
        const { data: existingVersions } = await supabase.from('versions').select('id').eq('project_id', project.id);
        if (existingVersions) {
            const existingIds = existingVersions.map((v: any) => v.id);
            const toDelete = existingIds.filter((id: string) => !versionIdsInPayload.includes(id));
            if (toDelete.length > 0) {
                await supabase.from('versions').delete().in('id', toDelete);
            }
        }

        // 2. Upsert payload versions
        const versionsToUpsert = project.versions.map(v => ({
            id: v.id,
            project_id: project.id,
            title: v.title,
            tags: v.tags,
            description: v.description,
            content: v.content,
            image_url: v.imageUrl,
            type: v.type,
            is_recommended: v.isRecommended
        }));

        if (versionsToUpsert.length > 0) {
            const { error: vError } = await supabase
                .from('versions')
                .upsert(versionsToUpsert);
            if (vError) throw vError;
        }

        res.json({ success: true, projectId: project.id });
        logAction('SAVE_PROJECT', { id: project.id, title: project.title, versionCount: project.versions.length });
    } catch (err: any) {
        console.error('Error saving project:', err);
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/projects/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('projects').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Update specific version content
app.put('/api/projects/:projectId/versions/:versionId', async (req, res) => {
    try {
        const { projectId, versionId } = req.params;
        const updates = req.body; // { title?, content? }

        const dbUpdates: any = {};
        if (updates.title) dbUpdates.title = updates.title;
        if (updates.content) dbUpdates.content = updates.content;

        const { error } = await supabase
            .from('versions')
            .update(dbUpdates)
            .eq('id', versionId)
            .eq('project_id', projectId);

        if (error) throw error;

        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

// Drafts Endpoints
app.get('/api/drafts', async (req, res) => {
    try {
        const { data, error } = await supabase.from('drafts').select('*').order('timestamp', { ascending: false });
        if (error) throw error;
        const drafts = data.map((d: any) => ({
            id: d.id,
            text: d.text,
            timestamp: Number(d.timestamp)
        }));
        res.json(drafts);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/drafts', async (req, res) => {
    try {
        const draft = req.body;
        const { error } = await supabase.from('drafts').upsert({
            id: draft.id,
            text: draft.text,
            timestamp: draft.timestamp
        });
        if (error) throw error;
        logAction('SAVE_DRAFT', { id: draft.id });
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

app.delete('/api/drafts/:id', async (req, res) => {
    try {
        const { error } = await supabase.from('drafts').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});


// AI Routes

app.post('/api/ai/transcribe', async (req, res) => {
    try {
        const { base64Data, mimeType } = req.body;
        const response = await ai.models.generateContent({
            model: config.ai.model || 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { mimeType, data: base64Data } },
                    { text: config.ai.prompts?.transcribe || "请将这段语音内容转写成文字。只需返回转写后的文字内容。" }
                ]
            }
        });
        res.json({ text: response.text || "" });
        logAction('AI_TRANSCRIBE', { success: true, textLength: response.text?.length });
    } catch (err: any) {
        console.error("AI Transcribe Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ai/refine', async (req, res) => {
    try {
        const { rawNote } = req.body;
        const response = await ai.models.generateContent({
            model: config.ai.model || 'gemini-3-flash-preview',
            contents: `${config.ai.prompts?.refine || "请基于以下闪念灵感，一次性生成4篇不同风格的深度笔记（包括深度解析版、叙事故事版、多维分析版、精简摘要版）。灵感内容："}${rawNote}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            content: { type: Type.STRING },
                            tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                            description: { type: Type.STRING },
                            type: { type: Type.STRING, enum: ['detailed', 'story', 'analysis', 'minimalist'] }
                        },
                        required: ["title", "content", "tags", "description", "type"]
                    }
                }
            }
        });

        if (!response.text) return res.json([]);
        const data = JSON.parse(response.text);
        const versions = data.map((v: any, idx: number) => ({
            ...v,
            id: `temp-v-${idx}-${Date.now()}`,
            imageUrl: `https://picsum.photos/seed/${v.type}${idx}/800/400`
        }));

        logAction('AI_REFINE', { count: versions.length });
        res.json(versions);

    } catch (err: any) {
        console.error("AI Refine Error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/ai/single', async (req, res) => {
    try {
        const { coreNote } = req.body;
        const response = await ai.models.generateContent({
            model: config.ai.model || 'gemini-3-flash-preview',
            contents: `${config.ai.prompts?.single || "基于核心灵感，生成一个独特的异构版本。要求风格鲜明，内容充实："}${coreNote}`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        tags: { type: Type.ARRAY, items: { type: Type.STRING } },
                        description: { type: Type.STRING },
                        content: { type: Type.STRING },
                        type: { type: Type.STRING, enum: ['detailed', 'story', 'analysis', 'minimalist'] }
                    },
                    required: ["title", "tags", "description", "content", "type"]
                }
            }
        });
        if (!response.text) return res.json(null);
        const v = JSON.parse(response.text);
        const version = {
            ...v,
            id: `v-${v.type}-${Date.now()}`,
            imageUrl: `https://picsum.photos/seed/${v.type}${Date.now()}/800/400`
        };
        logAction('AI_SINGLE', { type: v.type });
        res.json(version);
    } catch (err: any) {
        console.error("AI Single Error:", err);
        res.status(500).json({ error: err.message });
    }
});


const PORT = config.api.port || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
