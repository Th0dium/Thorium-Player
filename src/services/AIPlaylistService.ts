// AI Playlist Service - Creates smart playlists using natural language and AI-generated tags
import { Track, Playlist, AIPlaylistRequest, AIPlaylistResponse, AITag } from '@/types';
import { databaseService } from './DatabaseService';
import { aiTagService } from './AITagService';

const AI_PROMPTS = {
    playlistGeneration: `You are a music curator AI. Based on the user's request, analyze the available songs and their tags to create the perfect playlist.

User's request: "{prompt}"

Available songs with their tags:
{songList}

Select the most appropriate songs for this playlist. Consider:
1. How well each song's mood matches the request
2. The activities the songs are suited for
3. Genre compatibility
4. Overall flow and coherence of the playlist

Respond ONLY with a JSON object in this exact format:
{
  "name": "Suggested Playlist Name",
  "trackIds": ["id1", "id2", "id3"],
  "explanation": "Brief explanation of your selections",
  "matchReasons": {
    "id1": "Why this track fits",
    "id2": "Why this track fits"
  }
}`,
};

// Keywords for different moods/activities
const MOOD_KEYWORDS: Record<string, string[]> = {
    happy: ['happy', 'joyful', 'upbeat', 'cheerful', 'bright', 'fun', 'party'],
    sad: ['sad', 'melancholic', 'emotional', 'heartbreak', 'crying', 'depressed'],
    energetic: ['energetic', 'pump', 'workout', 'gym', 'running', 'exercise', 'power'],
    calm: ['calm', 'relaxing', 'peaceful', 'chill', 'ambient', 'meditation', 'sleep'],
    romantic: ['romantic', 'love', 'date', 'valentine', 'wedding', 'couple'],
    focus: ['focus', 'study', 'work', 'concentration', 'productive', 'coding'],
    driving: ['driving', 'road trip', 'car', 'highway', 'cruise'],
    night: ['night', 'late night', 'midnight', 'evening', 'dark'],
    morning: ['morning', 'wake up', 'sunrise', 'breakfast', 'start'],
};

class AIPlaylistService {
    private static instance: AIPlaylistService;
    private apiKey: string | null = null;
    private provider: 'openai' | 'gemini' | 'ollama' = 'openai';

    private constructor() { }

    static getInstance(): AIPlaylistService {
        if (!AIPlaylistService.instance) {
            AIPlaylistService.instance = new AIPlaylistService();
        }
        return AIPlaylistService.instance;
    }

    configure(apiKey: string, provider: 'openai' | 'gemini' | 'ollama' = 'openai'): void {
        this.apiKey = apiKey;
        this.provider = provider;
    }

    // Create playlist from natural language prompt
    async createPlaylistFromPrompt(request: AIPlaylistRequest): Promise<AIPlaylistResponse> {
        const { prompt, maxTracks = 20, excludeTrackIds = [] } = request;

        try {
            // Get all tracks with tags
            const allTracks = await databaseService.getAllTracks();
            const availableTracks = allTracks.filter(t =>
                !excludeTrackIds.includes(t.id) && t.aiTags.length > 0
            );

            if (availableTracks.length === 0) {
                // Fallback to simple keyword matching if no AI tags
                return this.createPlaylistWithKeywords(prompt, allTracks, maxTracks, excludeTrackIds);
            }

            // Try AI-based selection first
            if (this.apiKey) {
                const aiResult = await this.createPlaylistWithAI(prompt, availableTracks, maxTracks);
                if (aiResult.trackIds.length > 0) {
                    return aiResult;
                }
            }

            // Fallback to tag-based matching
            return this.createPlaylistWithTags(prompt, availableTracks, maxTracks);
        } catch (error) {
            console.error('Error creating playlist:', error);
            return {
                name: 'New Playlist',
                trackIds: [],
                explanation: 'Could not create playlist due to an error.',
                matchReasons: {},
            };
        }
    }

    // Create and save playlist
    async createAndSavePlaylist(request: AIPlaylistRequest): Promise<Playlist> {
        const result = await this.createPlaylistFromPrompt(request);

        const playlist = await databaseService.createPlaylist(
            result.name,
            result.trackIds,
            true, // isAIGenerated
            request.prompt
        );

        return playlist;
    }

    // Get playlist suggestions based on current track
    async getSuggestionsForTrack(trackId: string, count: number = 10): Promise<Track[]> {
        const track = await databaseService.getTrack(trackId);
        if (!track || track.aiTags.length === 0) {
            return [];
        }

        const allTracks = await databaseService.getAllTracks();
        const scoredTracks: { track: Track; score: number }[] = [];

        for (const candidateTrack of allTracks) {
            if (candidateTrack.id === trackId) continue;

            const score = this.calculateSimilarityScore(track.aiTags, candidateTrack.aiTags);
            if (score > 0) {
                scoredTracks.push({ track: candidateTrack, score });
            }
        }

        // Sort by score and return top matches
        scoredTracks.sort((a, b) => b.score - a.score);
        return scoredTracks.slice(0, count).map(st => st.track);
    }

    // Get time-based suggestions
    async getTimeBasedSuggestions(): Promise<{ name: string; trackIds: string[] }> {
        const hour = new Date().getHours();
        let mood: string;
        let name: string;

        if (hour >= 5 && hour < 9) {
            mood = 'morning';
            name = 'Good Morning Vibes';
        } else if (hour >= 9 && hour < 12) {
            mood = 'focus';
            name = 'Focus Time';
        } else if (hour >= 12 && hour < 14) {
            mood = 'happy';
            name = 'Lunch Break Tunes';
        } else if (hour >= 14 && hour < 18) {
            mood = 'energetic';
            name = 'Afternoon Energy';
        } else if (hour >= 18 && hour < 21) {
            mood = 'calm';
            name = 'Evening Wind Down';
        } else {
            mood = 'night';
            name = 'Late Night Sessions';
        }

        const allTracks = await databaseService.getAllTracks();
        const matchingTracks = this.filterTracksByMood(allTracks, mood);

        return {
            name,
            trackIds: matchingTracks.slice(0, 20).map(t => t.id),
        };
    }

    // Private methods
    private async createPlaylistWithAI(
        prompt: string,
        tracks: Track[],
        maxTracks: number
    ): Promise<AIPlaylistResponse> {
        // Build song list for AI
        const songList = tracks.slice(0, 50).map(t => {
            const tags = t.aiTags.map(tag => tag.name).join(', ');
            return `- ID: ${t.id} | "${t.title}" by ${t.artist} | Tags: ${tags}`;
        }).join('\n');

        const fullPrompt = AI_PROMPTS.playlistGeneration
            .replace('{prompt}', prompt)
            .replace('{songList}', songList);

        const response = await this.callAI(fullPrompt);
        return this.parsePlaylistResponse(response, maxTracks);
    }

    private createPlaylistWithTags(
        prompt: string,
        tracks: Track[],
        maxTracks: number
    ): AIPlaylistResponse {
        const promptLower = prompt.toLowerCase();
        const scoredTracks: { track: Track; score: number; reason: string }[] = [];

        // Detect mood from prompt
        let detectedMoods: string[] = [];
        for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
            if (keywords.some(kw => promptLower.includes(kw))) {
                detectedMoods.push(mood);
            }
        }

        for (const track of tracks) {
            let score = 0;
            let reasons: string[] = [];

            for (const tag of track.aiTags) {
                const tagLower = tag.name.toLowerCase();

                // Direct match with prompt
                if (promptLower.includes(tagLower)) {
                    score += 10;
                    reasons.push(`Tag "${tag.name}" matches request`);
                }

                // Match with detected moods
                for (const mood of detectedMoods) {
                    if (tagLower.includes(mood) || MOOD_KEYWORDS[mood]?.some(kw => tagLower.includes(kw))) {
                        score += 5;
                        reasons.push(`Tag "${tag.name}" matches ${mood} mood`);
                    }
                }
            }

            if (score > 0) {
                scoredTracks.push({
                    track,
                    score,
                    reason: reasons[0] || 'Matches overall vibe',
                });
            }
        }

        // Sort and select top tracks
        scoredTracks.sort((a, b) => b.score - a.score);
        const selectedTracks = scoredTracks.slice(0, maxTracks);

        const matchReasons: Record<string, string> = {};
        selectedTracks.forEach(st => {
            matchReasons[st.track.id] = st.reason;
        });

        return {
            name: this.generatePlaylistName(prompt),
            trackIds: selectedTracks.map(st => st.track.id),
            explanation: `Found ${selectedTracks.length} tracks matching "${prompt}"`,
            matchReasons,
        };
    }

    private createPlaylistWithKeywords(
        prompt: string,
        tracks: Track[],
        maxTracks: number,
        excludeTrackIds: string[]
    ): AIPlaylistResponse {
        const promptLower = prompt.toLowerCase();
        const matchingTracks: Track[] = [];

        for (const track of tracks) {
            if (excludeTrackIds.includes(track.id)) continue;

            const titleLower = track.title.toLowerCase();
            const artistLower = track.artist.toLowerCase();
            const genreLower = (track.genre || '').toLowerCase();

            if (
                titleLower.includes(promptLower) ||
                artistLower.includes(promptLower) ||
                genreLower.includes(promptLower)
            ) {
                matchingTracks.push(track);
            }
        }

        return {
            name: this.generatePlaylistName(prompt),
            trackIds: matchingTracks.slice(0, maxTracks).map(t => t.id),
            explanation: `Found ${matchingTracks.length} tracks by keyword matching`,
            matchReasons: {},
        };
    }

    private filterTracksByMood(tracks: Track[], mood: string): Track[] {
        const keywords = MOOD_KEYWORDS[mood] || [mood];

        return tracks.filter(track =>
            track.aiTags.some(tag =>
                keywords.some(kw => tag.name.toLowerCase().includes(kw))
            )
        );
    }

    private calculateSimilarityScore(tags1: AITag[], tags2: AITag[]): number {
        if (tags1.length === 0 || tags2.length === 0) return 0;

        let matches = 0;
        for (const tag1 of tags1) {
            for (const tag2 of tags2) {
                if (tag1.name.toLowerCase() === tag2.name.toLowerCase()) {
                    matches += 2;
                } else if (tag1.category === tag2.category) {
                    matches += 0.5;
                }
            }
        }

        return matches / Math.max(tags1.length, tags2.length);
    }

    private generatePlaylistName(prompt: string): string {
        const words = prompt.split(' ').slice(0, 4);
        return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    private async callAI(prompt: string): Promise<string> {
        if (!this.apiKey) {
            throw new Error('AI API key not configured');
        }

        // Use same AI calling logic as AITagService
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
                max_tokens: 1000,
            }),
        });

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    }

    private parsePlaylistResponse(response: string, maxTracks: number): AIPlaylistResponse {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                name: parsed.name || 'AI Playlist',
                trackIds: (parsed.trackIds || []).slice(0, maxTracks),
                explanation: parsed.explanation || '',
                matchReasons: parsed.matchReasons || {},
            };
        } catch (error) {
            console.error('Error parsing playlist response:', error);
            return {
                name: 'AI Playlist',
                trackIds: [],
                explanation: 'Could not parse AI response',
                matchReasons: {},
            };
        }
    }
}

export const aiPlaylistService = AIPlaylistService.getInstance();
export default aiPlaylistService;
