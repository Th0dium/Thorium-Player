// AI Tag Service - Generates semantic tags for tracks using AI
import { Track, AITag, AITagCategory, AITagRequest, AITagResponse } from '@/store/types';
import { databaseService } from './DatabaseService';

// Predefined tag colors by category
const TAG_COLORS: Record<AITagCategory, string[]> = {
    mood: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'],
    genre: ['#7C4DFF', '#536DFE', '#448AFF', '#40C4FF', '#18FFFF', '#64FFDA'],
    activity: ['#FF9800', '#FFC107', '#FFEB3B', '#CDDC39', '#8BC34A', '#4CAF50'],
    era: ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#00BCD4'],
    custom: ['#607D8B', '#9E9E9E', '#795548', '#FF5722', '#FF4081', '#E040FB'],
};

// Sample prompts for different AI providers
const AI_PROMPTS = {
    tagGeneration: `You are a music expert. Analyze the following song and generate relevant tags.

Song: "{title}" by {artist}
Album: {album}
Genre: {genre}

Generate tags in these categories:
1. Mood (emotional qualities: happy, sad, energetic, calm, romantic, melancholic, etc.)
2. Genre (specific sub-genres beyond the basic genre)
3. Activity (what activities this song is good for: workout, study, sleep, party, driving, etc.)
4. Era (time period vibes: 80s, 90s, 2000s, retro, modern, futuristic, etc.)

Respond ONLY with a JSON object in this exact format:
{
  "mood": ["tag1", "tag2"],
  "genre": ["tag1", "tag2"],
  "activity": ["tag1", "tag2"],
  "era": ["tag1"]
}`,
};

class AITagService {
    private static instance: AITagService;
    private apiKey: string | null = null;
    private provider: 'openai' | 'gemini' | 'ollama' = 'openai';

    private constructor() { }

    static getInstance(): AITagService {
        if (!AITagService.instance) {
            AITagService.instance = new AITagService();
        }
        return AITagService.instance;
    }

    // Configure API
    configure(apiKey: string, provider: 'openai' | 'gemini' | 'ollama' = 'openai'): void {
        this.apiKey = apiKey;
        this.provider = provider;
    }

    // Generate tags for a single track
    async generateTags(request: AITagRequest): Promise<AITagResponse> {
        const { trackId, title, artist, album, genre } = request;

        try {
            // Build the prompt
            const prompt = AI_PROMPTS.tagGeneration
                .replace('{title}', title)
                .replace('{artist}', artist)
                .replace('{album}', album || 'Unknown')
                .replace('{genre}', genre || 'Unknown');

            // Call AI API
            const response = await this.callAI(prompt);

            // Parse response and create tags
            const tags = this.parseTagResponse(response);

            // Save tags to database
            await databaseService.updateTrackTags(trackId, tags);

            return {
                trackId,
                tags,
                suggestedTags: tags.map(t => t.name),
            };
        } catch (error) {
            console.error('Error generating tags:', error);
            return {
                trackId,
                tags: [],
                suggestedTags: [],
            };
        }
    }

    // Generate tags for multiple tracks (batch)
    async generateTagsBatch(requests: AITagRequest[]): Promise<AITagResponse[]> {
        const results: AITagResponse[] = [];

        // Process in batches of 5 to avoid rate limiting
        const batchSize = 5;
        for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);
            const batchResults = await Promise.all(
                batch.map(req => this.generateTags(req))
            );
            results.push(...batchResults);

            // Small delay between batches
            if (i + batchSize < requests.length) {
                await this.delay(1000);
            }
        }

        return results;
    }

    // Search for song info online (mock implementation - would use real APIs in production)
    async searchSongInfo(title: string, artist: string): Promise<{
        genres: string[];
        mood: string[];
        similar: string[];
    }> {
        // In production, this would call MusicBrainz, Last.fm, Spotify APIs
        // For now, return empty data that can be enhanced with AI
        console.log(`Searching info for: ${title} by ${artist}`);

        return {
            genres: [],
            mood: [],
            similar: [],
        };
    }

    // Get all unique tags in the library
    async getAllTags(): Promise<AITag[]> {
        const tracks = await databaseService.getAllTracks();
        const tagMap = new Map<string, AITag>();

        tracks.forEach(track => {
            track.aiTags.forEach(tag => {
                if (!tagMap.has(tag.id)) {
                    tagMap.set(tag.id, tag);
                }
            });
        });

        return Array.from(tagMap.values());
    }

    // Get tags by category
    async getTagsByCategory(category: AITagCategory): Promise<AITag[]> {
        const allTags = await this.getAllTags();
        return allTags.filter(tag => tag.category === category);
    }

    // Get tracks by tag
    async getTracksByTag(tagName: string): Promise<Track[]> {
        const tracks = await databaseService.getAllTracks();
        return tracks.filter(track =>
            track.aiTags.some(tag =>
                tag.name.toLowerCase() === tagName.toLowerCase()
            )
        );
    }

    // Add custom tag to a track
    async addCustomTag(trackId: string, tagName: string): Promise<void> {
        const track = await databaseService.getTrack(trackId);
        if (track) {
            const newTag: AITag = {
                id: `tag_${Date.now()}`,
                name: tagName,
                category: 'custom',
                color: this.getRandomColor('custom'),
            };
            const updatedTags = [...track.aiTags, newTag];
            await databaseService.updateTrackTags(trackId, updatedTags);
        }
    }

    // Remove tag from a track
    async removeTag(trackId: string, tagId: string): Promise<void> {
        const track = await databaseService.getTrack(trackId);
        if (track) {
            const updatedTags = track.aiTags.filter(t => t.id !== tagId);
            await databaseService.updateTrackTags(trackId, updatedTags);
        }
    }

    // Private methods
    private async callAI(prompt: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('AI API key not configured');
        }

        switch (this.provider) {
            case 'openai':
                return this.callOpenAI(prompt);
            case 'gemini':
                return this.callGemini(prompt);
            case 'ollama':
                return this.callOllama(prompt);
            default:
                throw new Error('Unknown AI provider');
        }
    }

    private async callOpenAI(prompt: string): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 500,
            }),
        });

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    }

    private async callGemini(prompt: string): Promise<string> {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        );

        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    private async callOllama(prompt: string): Promise<string> {
        // Ollama runs locally, default port 11434
        const response = await fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: 'llama2',
                prompt,
                stream: false,
            }),
        });

        const data = await response.json();
        return data.response || '';
    }

    private parseTagResponse(response: string): AITag[] {
        const tags: AITag[] = [];

        try {
            // Try to extract JSON from response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) return tags;

            const parsed = JSON.parse(jsonMatch[0]);

            const categories: AITagCategory[] = ['mood', 'genre', 'activity', 'era'];

            categories.forEach(category => {
                const categoryTags = parsed[category] || [];
                categoryTags.forEach((tagName: string) => {
                    tags.push({
                        id: `tag_${category}_${tagName.toLowerCase().replace(/\s+/g, '_')}`,
                        name: tagName,
                        category,
                        color: this.getRandomColor(category),
                    });
                });
            });
        } catch (error) {
            console.error('Error parsing AI response:', error);
        }

        return tags;
    }

    private getRandomColor(category: AITagCategory): string {
        const colors = TAG_COLORS[category];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export const aiTagService = AITagService.getInstance();
export default aiTagService;
