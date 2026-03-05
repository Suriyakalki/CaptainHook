import { TMDB_CONFIG, OMDB_CONFIG } from './config.js?v=44.0';

class TMDBService {
    async fetchWithTimeout(resource, options = {}) {
        const { timeout = 8000 } = options;
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(resource, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    }

    async fetchFromTMDB(endpoint, params = {}, retries = 1) {
        if (TMDB_CONFIG.API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
            console.warn('TMDB API Key is missing. Metadata fetching will fail.');
            return null;
        }

        const queryParams = new URLSearchParams({
            api_key: TMDB_CONFIG.API_KEY,
            ...params
        });

        const url = `${TMDB_CONFIG.BASE_URL}${endpoint}?${queryParams}`;

        try {
            const response = await this.fetchWithTimeout(url);
            if (!response.ok) throw new Error(`API Status: ${response.status}`);
            return await response.json();
        } catch (error) {
            if (retries > 0 && error.name !== 'AbortError') {
                console.log(`Retrying TMDB (${retries} left)...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.fetchFromTMDB(endpoint, params, retries - 1);
            }
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
        return this.fetchFromTMDB(`/${type}/${id}`, { append_to_response: 'credits,videos,external_ids' });
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
    async getPersonDetails(personId) {
        return this.fetchFromTMDB(`/person/${personId}`);
    }

    async getPersonMovies(personId) {
        return this.fetchFromTMDB(`/person/${personId}/movie_credits`);
    }

    async getPersonTVShows(personId) {
        return this.fetchFromTMDB(`/person/${personId}/tv_credits`);
    }

    async getOMDbDetails(imdbId, retries = 1) {
        if (!imdbId || OMDB_CONFIG.API_KEY === 'YOUR_OMDB_API_KEY_HERE') return null;
        const url = `${OMDB_CONFIG.BASE_URL}?i=${imdbId}&apikey=${OMDB_CONFIG.API_KEY}`;
        try {
            const response = await this.fetchWithTimeout(url);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            if (retries > 0 && error.name !== 'AbortError') {
                console.log(`Retrying OMDb (${retries} left)...`);
                await new Promise(resolve => setTimeout(resolve, 1000));
                return this.getOMDbDetails(imdbId, retries - 1);
            }
            console.error('OMDb Fetch Error:', error);
            return null;
        }
    }
}

export const tmdb = new TMDBService();
