
export interface ContentVersion {
  id: string;
  title: string;
  tags: string[];
  description: string;
  content: string;
  imageUrl: string;
  type: 'standard' | 'detailed' | 'story' | 'analysis' | 'minimalist';
  isRecommended?: boolean;
}

export interface EditorState {
  title: string;
  content: string;
  tags: string[];
  suggestion: string;
  step: number;
}

export interface Draft {
  id: string;
  text: string;
  timestamp: number;
}

export interface StudioProject {
  id: string;
  title: string;
  originalNote: string;
  versions: ContentVersion[];
  tags: string[];
  timestamp: number;
  mainImageUrl?: string;
}
