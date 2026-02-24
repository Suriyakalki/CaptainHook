import { TMDB_CONFIG } from './config.js';

class TMDBService {
    async fetchFromTMDB(endpoint, params = {}) {
        if (TMDB_CONFIG.API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
            console.warn('TMDB API Key is missing. Metadata fetching will fail.');
            return null;
        }

        const queryParams = new URLSearchParams({
            api_key: TMDB_CONFIG.API_KEY,
            ...params
        });

        try {
            const response = await fetch(`${TMDB_CONFIG.BASE_URL}${endpoint}?${queryParams}`);
            if (!response.ok) throw new Error('API request failed');
            return await response.ok ? response.json() : null;
        } catch (error) {
            console.error('TMDB Fetch Error:', error);
            return null;
        }
    }

    async getTrending(type = 'all') {
        return this.fetchFromTMDB(`/trending/${type}/week`);
    }

    async getPopular(type = 'movie') {
        return this.fetchFromTMDB(`/${type}/popular`);
    }

    async getTopRated(type = 'movie') {
        return this.fetchFromTMDB(`/${type}/top_rated`);
    }

    async search(query) {
        return this.fetchFromTMDB('/search/multi', { query });
    }

    async getDetails(type, id) {
        return this.fetchFromTMDB(`/${type}/${id}`, { append_to_response: 'credits,videos' });
    }

    async getSeasonDetails(tvId, seasonNumber) {
        return this.fetchFromTMDB(`/tv/${tvId}/season/${seasonNumber}`);
    }

    async getGenres(type = 'movie') {
        return this.fetchFromTMDB(`/genre/${type}/list`);
    }

    async getSimilar(type, id) {
        return this.fetchFromTMDB(`/${type}/${id}/similar`);
    }

    async discoverByGenre(type, genreId) {
        return this.fetchFromTMDB(`/discover/${type}`, { with_genres: genreId });
    }
}

export const tmdb = new TMDBService();
