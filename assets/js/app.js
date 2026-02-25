import { tmdb } from './tmdbService.js?v=20.0';
import { TMDB_CONFIG, VIDKING_CONFIG } from './config.js?v=20.0';

// ── My List (Watchlist) Helpers ──────────────────────────────────────────────
const STORAGE_KEY = 'captain-hook-list';

function getList() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
}

function saveList(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function isInList(id) {
    return getList().some(item => item.id === id);
}

function toggleList(item) {
    let list = getList();
    const exists = list.findIndex(i => i.id === item.id);
    if (exists >= 0) {
        list.splice(exists, 1);
    } else {
        list.push(item);
    }
    saveList(list);

    const currentActive = document.querySelector('.nav-link.active');
    if (currentActive && currentActive.getAttribute('data-view') === 'list') {
        renderView('list');
    }
}

// ── Global List Handlers ─────────────────────────────────────────────────────
window.removeFromList = (id) => {
    let list = getList();
    list = list.filter(item => item.id !== id);
    saveList(list);
    renderView('list');
};

window.toggleFromListing = (type, id, title, poster_path, overview = '') => {
    const item = { type, id, title, overview, poster_path: poster_path.replace(TMDB_CONFIG.IMAGE_BASE_URL + '/' + TMDB_CONFIG.POSTER_SIZE, '') };
    toggleList(item);

    const btn = document.querySelector(`.toggle-list-btn[data-id="${id}"]`);
    if (btn) {
        const added = isInList(id);
        btn.innerHTML = added ? '<i class="fas fa-minus"></i> REMOVE' : '<i class="fas fa-plus"></i> MY LIST';
    }
};

// Theme Management
const initTheme = () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
};

const updateThemeIcon = (theme) => {
    const icon = document.querySelector('#theme-toggle i');
    if (icon) {
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    const navbar = document.getElementById('navbar');

    if (TMDB_CONFIG.API_KEY === 'YOUR_TMDB_API_KEY_HERE') {
        alert('Please add your TMDB API Key in assets/js/config.js');
    }

    const menuToggle = document.getElementById('mobile-menu');
    const navLinks = document.getElementById('nav-links');
    const themeToggle = document.getElementById('theme-toggle');

    // Theme Toggle Logic
    themeToggle.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });

    // Sidebar toggle (desktop & mobile)
    menuToggle.addEventListener('click', () => {
        if (navbar) {
            navbar.classList.toggle('sidebar-collapsed');
            if (window.innerWidth <= 768) {
                navLinks.classList.toggle('active');
            }
        }
        const icon = menuToggle.querySelector('i');
        if (icon) {
            if (window.innerWidth <= 768) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            } else {
                icon.className = 'fas fa-bars';
            }
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            if (navLinks) navLinks.classList.remove('active');
            const icon = menuToggle.querySelector('i');
            if (icon) icon.className = 'fas fa-bars';
        }
    });

    // Navigation Logic
    const navItems = document.querySelectorAll('.nav-link');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const view = e.currentTarget.getAttribute('data-view');
            if (view) window.navigateTo(view);
        });
    });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Logo click as home button
    const logoBtn = document.getElementById('logo-btn');
    if (logoBtn) {
        logoBtn.addEventListener('click', () => {
            window.navigateTo('home');
        });
    }

    // Initial Load / Deep Linking
    const initialState = history.state;
    if (initialState && initialState.view) {
        renderView(initialState.view, ...(initialState.args || []));
    } else {
        renderView('home');
    }

    // Browser Back/Forward Listener
    window.onpopstate = (event) => {
        if (event.state && event.state.view) {
            renderView(event.state.view, ...(event.state.args || []));
        } else {
            renderView('home');
        }
    };

    initPosterPopup();
    console.log('Captain Hook App Initialized');
});

// ── Routing Logic ────────────────────────────────────────────────────────────
window.navigateTo = (view, ...args) => {
    const currentState = history.state;
    if (currentState && currentState.view === view && JSON.stringify(currentState.args) === JSON.stringify(args)) {
        return;
    }
    history.pushState({ view, args }, '');
    renderView(view, ...args);
};

async function renderView(view, ...args) {
    window.renderView = renderView;
    const heroSection = document.getElementById('hero');
    const contentRows = document.getElementById('content-rows');

    // Update Navbar Active State
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-view') === view);
    });

    // Close mobile menu
    const navLinksContainer = document.getElementById('nav-links');
    if (navLinksContainer) navLinksContainer.classList.remove('active');
    const menuIcon = document.querySelector('#mobile-menu i');
    if (menuIcon) menuIcon.className = 'fas fa-bars';

    // Clear content
    contentRows.innerHTML = '<div class="loader">Loading...</div>';
    // Hide hover popup immediately on any navigation
    const popup = document.getElementById('poster-popup');
    if (popup) popup.classList.remove('visible');


    // Reset layout state
    document.body.classList.remove('hide-nav');

    try {
        if (view === 'home') {
            heroSection.style.display = 'flex';
            const trending = await tmdb.getTrending('movie');
            if (trending && trending.results.length > 0) renderHero(trending.results[0]);

            contentRows.innerHTML = '';
            const categories = [
                { title: 'Top_Rated_Movies', key: 'top-rated:movie', fetch: () => tmdb.getTopRated('movie') },
                { title: 'Popular_TV_Shows', key: 'popular:tv', fetch: () => tmdb.getPopular('tv') },
                { title: 'Action_Movies', key: 'genre:movie:28', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '28' }) },
                { title: 'Sci-Fi_Movies', key: 'genre:movie:878', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '878' }) },
                { title: 'Horror_Movies', key: 'genre:movie:27', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '27' }) },
                { title: 'Animations', key: 'genre:movie:16', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '16' }) }
            ];
            for (const cat of categories) {
                const data = await cat.fetch();
                if (data && data.results) renderRow(cat.title, data.results, cat.key);
            }
        }
        else if (view === 'movies') {
            heroSection.style.display = 'none';
            contentRows.innerHTML = '<div style="padding: 40px 4%"><h2 class="row-title">Movies</h2></div>';
            const movieCategories = [
                { title: 'Popular Movies', key: 'popular:movie', fetch: () => tmdb.getPopular('movie') },
                { title: 'Top Rated Movies', key: 'top-rated:movie', fetch: () => tmdb.getTopRated('movie') },
                { title: 'Action', key: 'genre:movie:28', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '28' }) },
                { title: 'Comedy', key: 'genre:movie:35', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '35' }) },
                { title: 'Drama', key: 'genre:movie:18', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '18' }) },
                { title: 'Horror', key: 'genre:movie:27', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '27' }) },
                { title: 'Sci-Fi', key: 'genre:movie:878', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '878' }) },
                { title: 'Animation', key: 'genre:movie:16', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '16' }) },
                { title: 'Thriller', key: 'genre:movie:53', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '53' }) },
                { title: 'Romance', key: 'genre:movie:10749', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '10749' }) },
            ];
            for (const cat of movieCategories) {
                const data = await cat.fetch();
                if (data && data.results) renderRow(cat.title, data.results, cat.key);
            }
        }
        else if (view === 'tv') {
            heroSection.style.display = 'none';
            contentRows.innerHTML = '<div style="padding: 40px 4%"><h2 class="row-title">TV Shows</h2></div>';
            const tvCategories = [
                { title: 'Popular TV Shows', key: 'popular:tv', fetch: () => tmdb.getPopular('tv') },
                { title: 'Top Rated TV Shows', key: 'top-rated:tv', fetch: () => tmdb.getTopRated('tv') },
                { title: 'Action & Adventure', key: 'genre:tv:10759', fetch: () => tmdb.fetchFromTMDB('/discover/tv', { with_genres: '10759' }) },
                { title: 'Drama', key: 'genre:tv:18', fetch: () => tmdb.fetchFromTMDB('/discover/tv', { with_genres: '18' }) },
                { title: 'Comedy', key: 'genre:tv:35', fetch: () => tmdb.fetchFromTMDB('/discover/tv', { with_genres: '35' }) },
                { title: 'Sci-Fi & Fantasy', key: 'genre:tv:10765', fetch: () => tmdb.fetchFromTMDB('/discover/tv', { with_genres: '10765' }) },
                { title: 'Crime', key: 'genre:tv:80', fetch: () => tmdb.fetchFromTMDB('/discover/tv', { with_genres: '80' }) },
                { title: 'Animation', key: 'genre:tv:16', fetch: () => tmdb.fetchFromTMDB('/discover/tv', { with_genres: '16' }) },
                { title: 'Mystery', key: 'genre:tv:9648', fetch: () => tmdb.fetchFromTMDB('/discover/tv', { with_genres: '9648' }) },
            ];
            for (const cat of tvCategories) {
                const data = await cat.fetch();
                if (data && data.results) renderRow(cat.title, data.results, cat.key);
            }
        }
        else if (view === 'list') {
            heroSection.style.display = 'none';
            const list = getList();
            contentRows.innerHTML = '';
            const header = document.createElement('div');
            header.style.cssText = 'padding: 40px 4% 20px';
            header.innerHTML = `<h2 class="row-title">MY LIST <span style="font-size:1rem; margin-left:10px;">[${list.length}]</span></h2>`;
            contentRows.appendChild(header);

            if (list.length === 0) {
                contentRows.innerHTML += `
                    <div class="my-list-empty">
                        <i class="fas fa-bookmark" style="font-size:3rem; margin-bottom:16px;"></i>
                        <p>Your list is empty.</p>
                        <p style="font-size:0.85rem; margin-top:8px;">Click the <strong>+ MY LIST</strong> button on any movie or show to save it here.</p>
                    </div>`;
            } else {
                const row = document.createElement('div');
                row.className = 'row';
                row.innerHTML = `
                    <div class="row-scroll-container">
                        <button class="row-arrow row-arrow-left" aria-label="Scroll left"><i class="fas fa-chevron-left"></i></button>
                        <div class="row-posters">
                            ${list.map(item => makePosterWrap(item, item.type)).join('')}
                        </div>
                        <button class="row-arrow row-arrow-right" aria-label="Scroll right"><i class="fas fa-chevron-right"></i></button>
                    </div>`;
                contentRows.appendChild(row);
                setupRowArrows(row);
            }
        }
        else if (view === 'view-all') {
            const [fetchKey, catTitle] = args;
            heroSection.style.display = 'none';
            contentRows.innerHTML = `
                <div style="padding: 40px 4% 20px">
                    <button class="preview-back-btn" onclick="history.back()" style="position:static;margin-bottom:20px;">
                        <i class="fas fa-arrow-left"></i> BACK
                    </button>
                    <h2 class="row-title">${catTitle || fetchKey}</h2>
                </div>
                <div id="view-all-grid" class="results-grid"></div>
                <div id="view-all-footer" style="padding:30px 4%;text-align:center;"></div>`;

            // Resolve fetchKey → a function(page) => Promise<{results, total_pages}>
            const resolveKey = (key) => {
                const [kind, type, extra] = key.split(':');
                if (kind === 'popular') return (p) => tmdb.fetchFromTMDB(`/${type}/popular`, { page: p });
                if (kind === 'top-rated') return (p) => tmdb.fetchFromTMDB(`/${type}/top_rated`, { page: p });
                if (kind === 'genre') return (p) => tmdb.fetchFromTMDB(`/discover/${type}`, { with_genres: extra, page: p });
                if (kind === 'trending') return (p) => tmdb.fetchFromTMDB(`/trending/${type}/week`, { page: p });
                return null;
            };

            const fetcher = resolveKey(fetchKey);
            if (!fetcher) { contentRows.innerHTML = '<p style="padding:4%">Unknown category.</p>'; return; }

            const mediaType = fetchKey.includes(':tv') ? 'tv' : 'movie';

            // Instead of a full-height locked container, let it scroll naturally.
            contentRows.innerHTML = `
                <div class="view-all-container">
                    <div style="padding: 40px 4% 10px;">
                        <button class="preview-back-btn" onclick="history.back()" style="position:static; margin-bottom:15px;">
                            <i class="fas fa-arrow-left"></i> BACK
                        </button>
                        <h2 class="row-title">${catTitle || fetchKey}</h2>
                    </div>
                    <div id="view-all-grid" class="results-grid" style="padding-bottom: 20px;"></div>
                    <div id="view-all-loading" style="text-align:center; padding: 20px; font-family: var(--font-mono); color: var(--red);">
                        <div class="loader-inner" style="font-size: 1.2rem;">LOADING_MORE...</div>
                    </div>
                </div>`;

            const grid = document.getElementById('view-all-grid');
            const loadingIndicator = document.getElementById('view-all-loading');

            let currentTMDBPage = 0;
            let totalTMDBPages = 1;
            let isLoading = false;
            let observer = null;

            const loadNextPage = async () => {
                if (isLoading || currentTMDBPage >= totalTMDBPages) return;
                isLoading = true;
                currentTMDBPage++;

                try {
                    const data = await fetcher(currentTMDBPage);
                    if (data && data.results) {
                        totalTMDBPages = Math.min(data.total_pages, 500); // TMDB limits multi-page access
                        const validItems = data.results.filter(i => i.poster_path);

                        const htmlStr = validItems.map(i => makePosterWrap(i, i.media_type || mediaType)).join('');
                        grid.insertAdjacentHTML('beforeend', htmlStr);
                    }
                } catch (error) {
                    console.error("Error loading view-all page:", error);
                } finally {
                    isLoading = false;
                    if (currentTMDBPage >= totalTMDBPages) {
                        loadingIndicator.innerHTML = 'END_OF_RESULTS';
                        loadingIndicator.style.color = 'var(--gray)';
                        if (observer) observer.disconnect();
                    }
                }
            };

            // Setup Intersection Observer for infinite scrolling
            const setupObserver = () => {
                observer = new IntersectionObserver((entries) => {
                    if (entries[0].isIntersecting) {
                        loadNextPage();
                    }
                }, {
                    root: null, // observe relative to viewport
                    rootMargin: '200px', // start loading slightly before indicator becomes visible
                    threshold: 0.1
                });
                observer.observe(loadingIndicator);
            };

            // Initial load
            await loadNextPage();
            setupObserver();

            // Clean up observer when navigating away
            const origRenderView = window.renderView;
            window.renderView = function () {
                if (observer) observer.disconnect();
                if (origRenderView) origRenderView.apply(this, arguments);
            };
        }
        else if (view === 'genres') {
            heroSection.style.display = 'none';
            contentRows.innerHTML = `
                <div style="padding: 40px 4%">
                    <button class="preview-back-btn" onclick="window.navigateTo('home')" style="position: static; margin-bottom: 20px;">
                        <i class="fas fa-arrow-left"></i> BACK
                    </button>
                    <h2 class="row-title">BROWSE_BY_GENRE</h2>
                    <div class="genre-container">
                        <div class="genre-section">
                            <h3 class="genre-sub-title">MOVIES</h3>
                            <div class="genre-grid" id="movie-genres"></div>
                        </div>
                        <div class="genre-section">
                            <h3 class="genre-sub-title">TV_SHOWS</h3>
                            <div class="genre-grid" id="tv-genres"></div>
                        </div>
                    </div>
                </div>`;

            const movieGenres = await tmdb.getGenres('movie');
            const tvGenres = await tmdb.getGenres('tv');

            const renderGenres = (containerId, genres, type) => {
                const container = document.getElementById(containerId);
                if (!container || !genres) return;
                container.innerHTML = genres.genres.map(g => `
                    <div class="genre-card" onclick="window.navigateTo('view-all', 'genre:${type}:${g.id}', '${type.toUpperCase()}_GENRE: ${g.name.toUpperCase()}')">
                        ${g.name}
                    </div>
                `).join('');
            };

            renderGenres('movie-genres', movieGenres, 'movie');
            renderGenres('tv-genres', tvGenres, 'tv');
        }

        else if (view === 'search') {
            const initialQuery = args[0] || '';
            heroSection.style.display = 'none';
            contentRows.innerHTML = `
                <div class="search-page-container">
                    <div class="search-page-header">
                        <div class="search-page-input-wrapper">
                            <input type="text" id="page-search-input" class="search-page-input" placeholder="Search for movies, TV shows..." value="${initialQuery}" autofocus>
                            <button id="page-search-btn" class="search-page-btn">
                                <i class="fas fa-search"></i> SEARCH
                            </button>
                        </div>
                        <div class="search-filters">
                            <select id="filter-type" class="search-filter-select">
                                <option value="all">All Types</option>
                                <option value="movie">Movies</option>
                                <option value="tv">TV Shows</option>
                            </select>
                            <input type="number" id="filter-year" class="search-filter-input" placeholder="Year" min="1900" max="2100">
                        </div>
                    </div>
                    <div id="search-results-container">
                        <div class="loader">Loading...</div>
                    </div>
                </div>
            `;

            const searchInput = document.getElementById('page-search-input');
            const searchBtn = document.getElementById('page-search-btn');
            const resultsContainer = document.getElementById('search-results-container');

            const filterTypeControl = document.getElementById('filter-type');
            const filterYearControl = document.getElementById('filter-year');

            let currentRawData = null; // Store TMDB results for fast local filtering

            const renderLocalResults = (query, resultsArray) => {
                const typeFilter = filterTypeControl.value;
                const yearFilter = filterYearControl.value.trim();

                let filtered = resultsArray;

                if (typeFilter !== 'all') {
                    filtered = filtered.filter(item => item.media_type === typeFilter);
                }

                if (yearFilter) {
                    filtered = filtered.filter(item => {
                        const dateStr = item.release_date || item.first_air_date || '';
                        return dateStr.startsWith(yearFilter);
                    });
                }

                resultsContainer.innerHTML = `<h3 class="search-suggestions-title">RESULTS FOR "${query}"</h3>`;

                if (filtered && filtered.length > 0) {
                    const row = document.createElement('div');
                    row.className = 'row';
                    // Render exactly like the responsive view-all page grid
                    row.innerHTML = `
                        <div class="results-grid" style="padding-top: 20px;">
                            ${filtered.map(item => makePosterWrap(item, item.media_type || 'movie')).join('')}
                        </div>`;
                    resultsContainer.appendChild(row);
                } else {
                    resultsContainer.innerHTML += '<p style="font-family: var(--font-mono); font-size: 1.2rem; padding: 20px 4%;">NO_RESULTS_FOUND</p>';
                }
            };

            const performSearch = async (query) => {
                resultsContainer.innerHTML = '<div class="loader">Searching...</div>';
                if (!query) {
                    currentRawData = null;
                    const trending = await tmdb.getTrending('all');
                    resultsContainer.innerHTML = '<h3 class="search-suggestions-title">TRENDING NOW</h3>';
                    if (trending && trending.results.length > 0) {
                        const row = document.createElement('div');
                        row.className = 'row';
                        row.innerHTML = `
                            <div class="row-scroll-container">
                                <button class="row-arrow row-arrow-left" aria-label="Scroll left"><i class="fas fa-chevron-left"></i></button>
                                <div class="row-posters">
                                    ${trending.results.map(item => makePosterWrap(item, item.media_type || 'movie')).join('')}
                                </div>
                                <button class="row-arrow row-arrow-right" aria-label="Scroll right"><i class="fas fa-chevron-right"></i></button>
                            </div>`;
                        resultsContainer.appendChild(row);
                        setupRowArrows(row);
                    }
                    return;
                }

                if (history.state && history.state.args && history.state.args[0] !== query) {
                    history.replaceState({ view: 'search', args: [query] }, '');
                }

                const response = await tmdb.search(query);
                if (response && response.results) {
                    currentRawData = response.results;
                    renderLocalResults(query, currentRawData);
                } else {
                    resultsContainer.innerHTML = '<p style="font-family: var(--font-mono); font-size: 1.2rem; padding: 20px 4%;">ERROR_FETCHING_RESULTS</p>';
                }
            };

            // Re-render local results fast when filters change
            filterTypeControl.addEventListener('change', () => { if (currentRawData) renderLocalResults(searchInput.value.trim(), currentRawData); });
            filterYearControl.addEventListener('input', () => { if (currentRawData) renderLocalResults(searchInput.value.trim(), currentRawData); });


            searchBtn.addEventListener('click', () => performSearch(searchInput.value.trim()));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') performSearch(searchInput.value.trim());
            });

            performSearch(initialQuery);
            setTimeout(() => searchInput.focus(), 100);
        }
        else if (view === 'details') {
            const [type, id] = args;
            heroSection.style.display = 'none';
            contentRows.innerHTML = '<div class="loader">FETCHING_DETAILS...</div>';
            window.scrollTo(0, 0);

            const [details, similar] = await Promise.all([
                tmdb.getDetails(type, id),
                tmdb.getSimilar(type, id)
            ]);

            if (!details) throw new Error('Details not found');

            const cast = details.credits.cast.slice(0, 5).map(c => c.name).join(', ');
            const backdrop = `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.BACKDROP_SIZE}${details.backdrop_path}`;
            const poster = `${TMDB_CONFIG.IMAGE_BASE_URL}/w500${details.poster_path}`;

            const isTv = type === 'tv';
            const seasons = isTv && details.seasons ? details.seasons.filter(s => s.season_number > 0) : [];

            const seasonSelector = isTv ? `
                <div class="season-browser">
                    <div class="season-header" style="display:flex; flex-wrap:wrap; align-items:center; gap:30px; justify-content:flex-start;">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <label class="season-label">SEASON</label>
                            <select class="season-select" id="season-select-${id}" onchange="window.loadEpisodes(${id}, this.value)">
                                ${seasons.map(s => `<option value="${s.season_number}">Season ${s.season_number} (${s.episode_count} eps)</option>`).join('')}
                            </select>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <label class="season-label">EPISODE</label>
                            <input type="number" id="quick-ep-input-${id}" class="search-filter-input" style="width:70px; padding:5px 10px;" min="1" placeholder="#">
                            <button class="btn btn-primary" style="padding:6px 15px;" onclick="
                                const ep = document.getElementById('quick-ep-input-${id}').value;
                                const sn = document.getElementById('season-select-${id}').value;
                                if(ep) window.playStream('tv', ${id}, sn, ep);
                            "><i class="fas fa-play"></i></button>
                        </div>
                    </div>
                    <div class="episode-list" id="episode-list-${id}">
                        <div class="loader" style="padding: 30px; font-size: 1rem;">LOADING_EPISODES...</div>
                    </div>
                </div>` : '';

            contentRows.innerHTML = `
                <div class="preview-card details-page">
                    <div class="preview-backdrop-wrap">
                        <img class="preview-backdrop-img" src="${backdrop}" alt="${details.title || details.name}">
                        <button class="preview-back-btn" onclick="history.back()">
                            <i class="fas fa-arrow-left"></i> BACK
                        </button>
                        <div class="preview-actions">
                            <button class="preview-play-btn" onclick="window.playStream('${type}', ${id})">
                                <i class="fas fa-play"></i> PLAY
                            </button>
                            <button class="preview-list-btn toggle-list-btn" data-id="${id}" onclick="window.toggleFromListing('${type}', ${id}, '${(details.title || details.name).replace(/'/g, "\\'")}', '${details.poster_path}', '${(details.overview || '').slice(0, 160).replace(/'/g, "\\'").replace(/"/g, '')}')">
                                ${isInList(id) ? '<i class="fas fa-minus"></i> REMOVE' : '<i class="fas fa-plus"></i> MY LIST'}
                            </button>
                        </div>
                    </div>
                    <div class="preview-details distressed">
                        <div class="preview-details-inner">
                            <div class="preview-top-row">
                                <img class="preview-poster-thumb" src="${poster}" alt="${details.title || details.name}">
                                <div class="preview-title-meta">
                                    <h1 class="preview-title glitch">${details.title || details.name}</h1>
                                    <div class="preview-meta">
                                        <span>RELEASE: ${details.release_date || details.first_air_date}</span>
                                        <span>RATING: ⭐ ${details.vote_average.toFixed(1)}</span>
                                        ${isTv ? `<span>SEASONS: ${seasons.length}</span>` : ''}
                                    </div>
                                </div>
                            </div>
                            <p class="preview-overview">${details.overview}</p>
                            <p class="cast-list"><strong>CAST:</strong> ${cast || 'N/A'}</p>
                            ${seasonSelector}
                        </div>
                    </div>
                    
                    ${similar && similar.results && similar.results.length > 0 ? `
                        <div class="similar-content-section">
                            <h2 class="row-title" style="margin: 40px 4% 10px;">SIMILAR_TITLES</h2>
                            <div class="row">
                                <div class="row-posters">
                                    ${similar.results.slice(0, 10).map(item => `
                                        <img class="poster"
                                             src="${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZE}${item.poster_path}"
                                             alt="${item.title || item.name}"
                                             onclick="window.showPreview('${type}', ${item.id})">
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>`;

            if (isTv && seasons.length > 0) window.loadEpisodes(id, seasons[0].season_number);
        }
        else if (view === 'player') {
            const [type, id, season = 1, episode = 1] = args;
            heroSection.style.display = 'none';
            const embedUrl = type === 'tv'
                ? `${VIDKING_CONFIG.TV_URL}${id}/${season}/${episode}?clr=e50914`
                : `${VIDKING_CONFIG.MOVIE_URL}${id}?clr=e50914`;

            document.body.classList.add('hide-nav');
            window.scrollTo(0, 0);

            contentRows.innerHTML = `
                <div class="video-container page-player" id="player-container">
                    <div class="player-loader" id="player-loader">
                        <div class="loader-inner">INITIALIZING_STREAM...</div>
                    </div>
                    
                    <div class="player-ui-overlay" id="player-ui">
                        <div class="player-header" id="player-header">
                            <button class="preview-back-btn" onclick="history.back()">
                                <i class="fas fa-arrow-left"></i> BACK
                            </button>
                        </div>
                    </div>

                    <iframe id="stream-iframe"
                            src="${embedUrl}"
                            allowfullscreen
                            sandbox="allow-forms allow-scripts allow-same-origin allow-presentation">
                    </iframe>
                </div>
            `;

            const iframe = document.getElementById('stream-iframe');
            const loader = document.getElementById('player-loader');
            const ui = document.getElementById('player-ui');
            const headerEl = document.getElementById('player-header');
            const containerEl = document.getElementById('player-container');
            let hideTimeout;

            iframe.onload = () => { if (loader) loader.style.display = 'none'; };
            setTimeout(() => { if (loader) loader.style.display = 'none'; }, 8000);

            const showUI = () => {
                ui.classList.remove('ui-hidden');
                clearTimeout(hideTimeout);
                hideTimeout = setTimeout(() => { ui.classList.add('ui-hidden'); }, 3000);
            };

            containerEl.addEventListener('mousemove', showUI);
            headerEl.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                showUI();
            }, { passive: true });

            showUI();
        }
    } catch (err) {
        contentRows.innerHTML = '<div class="loader">ERROR_LOADING_CONTENT</div>';
        console.error('Render View Error:', err);
    }
}

function renderHero(movie) {
    const hero = document.getElementById('hero');
    hero.style.backgroundImage = `url(${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.BACKDROP_SIZE}${movie.backdrop_path})`;

    const added = isInList(movie.id);
    const title = movie.title || movie.name;

    hero.innerHTML = `
        <div class="hero-content distressed">
            <h1 class="hero-title glitch" data-text="${title}">${title}</h1>
            <p class="hero-overview">${movie.overview}</p>
            <div class="hero-buttons">
                <button class="btn btn-primary" onclick="window.showPreview('movie', ${movie.id})">
                   <i class="fas fa-play"></i> PLAY
                </button>
                <button class="btn btn-secondary toggle-list-btn" data-id="${movie.id}" onclick="window.toggleFromListing('movie', ${movie.id}, '${title.replace(/'/g, "\\'")}'.replace(/"/g,''), '${movie.poster_path}', '${(movie.overview || '').slice(0, 160).replace(/'/g, "\\'").replace(/"/g, '')}')">
                    ${added ? '<i class="fas fa-minus"></i> REMOVE' : '<i class="fas fa-plus"></i> MY LIST'}
                </button>
            </div>
        </div>
    `;
}

function makePosterWrap(item, type) {
    if (!item.poster_path) return '';
    const name = (item.title || item.name || '').replace(/"/g, '&quot;');
    const raw = item.overview || '';
    const overview = (raw.slice(0, 160) + (raw.length > 160 ? '...' : '')).replace(/"/g, '&quot;');
    const poster = `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZE}${item.poster_path}`;
    return `<div class="poster-wrap"
                 data-id="${item.id}" data-type="${type}"
                 data-title="${name}" data-overview="${overview}" data-poster="${poster}"
                 onclick="window.showPreview('${type}',${item.id})">
                <img class="poster" src="${poster}" alt="${name}">
            </div>`;
}

function renderRow(title, movies, fetchKey) {
    const container = document.getElementById('content-rows');
    const row = document.createElement('div');
    row.className = 'row';
    const mediaType = title.toLowerCase().includes('tv') || title.toLowerCase().includes('show') ? 'tv' : 'movie';

    row.innerHTML = `
        <div class="row-header">
            <h2 class="row-title">${title}</h2>
            ${fetchKey ? `<button class="view-all-btn" onclick="window.navigateTo('view-all','${fetchKey}','${title.replace(/'/g, "\\'")}')">VIEW ALL <i class="fas fa-chevron-right"></i></button>` : ''}
        </div>
        <div class="row-scroll-container">
            <button class="row-arrow row-arrow-left" aria-label="Scroll left">
                <i class="fas fa-chevron-left"></i>
            </button>
            <div class="row-posters">
                ${movies.filter(m => m.poster_path).map(movie => {
        const type = movie.media_type || mediaType;
        const name = (movie.title || movie.name || '').replace(/"/g, '&quot;');
        const overview = (movie.overview || '').replace(/"/g, '&quot;').slice(0, 160) + ((movie.overview || '').length > 160 ? '...' : '');
        const posterUrl = `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZE}${movie.poster_path}`;
        return `
                    <div class="poster-wrap"
                         data-id="${movie.id}"
                         data-type="${type}"
                         data-title="${name}"
                         data-overview="${overview}"
                         data-poster="${posterUrl}"
                         onclick="window.showPreview('${type}', ${movie.id})">
                        <img class="poster" src="${posterUrl}" alt="${name}">
                    </div>`;
    }).join('')}
            </div>
            <button class="row-arrow row-arrow-right" aria-label="Scroll right">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;
    container.appendChild(row);
    setupRowArrows(row);
}

function setupRowArrows(row) {
    const track = row.querySelector('.row-posters');
    const btnLeft = row.querySelector('.row-arrow-left');
    const btnRight = row.querySelector('.row-arrow-right');
    if (!track || !btnLeft || !btnRight) return;

    const SCROLL_BY = 660;

    const scrollContainer = row.querySelector('.row-scroll-container');

    const update = () => {
        const atStart = track.scrollLeft <= 0;
        const atEnd = track.scrollLeft >= track.scrollWidth - track.clientWidth - 2;
        btnLeft.classList.toggle('hidden', atStart);
        btnRight.classList.toggle('hidden', atEnd);
        if (scrollContainer) {
            scrollContainer.classList.toggle('at-start', atStart);
            scrollContainer.classList.toggle('at-end', atEnd);
        }
    };

    btnLeft.addEventListener('click', () => track.scrollBy({ left: -SCROLL_BY, behavior: 'smooth' }));
    btnRight.addEventListener('click', () => track.scrollBy({ left: SCROLL_BY, behavior: 'smooth' }));
    track.addEventListener('scroll', update, { passive: true });

    // Drag-to-scroll — only capture after real movement so clicks still fire
    let isDown = false, isDragging = false, startX, scrollStart;
    track.addEventListener('pointerdown', e => {
        isDown = true; isDragging = false;
        startX = e.clientX; scrollStart = track.scrollLeft;
    });
    track.addEventListener('pointermove', e => {
        if (!isDown) return;
        if (!isDragging && Math.abs(e.clientX - startX) > 5) {
            isDragging = true;
            track.setPointerCapture(e.pointerId);
        }
        if (isDragging) track.scrollLeft = scrollStart - (e.clientX - startX);
    });
    track.addEventListener('pointerup', () => { isDown = false; isDragging = false; });
    track.addEventListener('pointercancel', () => { isDown = false; isDragging = false; });
    // Block click at end of a real drag
    track.addEventListener('click', e => { if (isDragging) e.stopPropagation(); }, true);

    requestAnimationFrame(update);
}

function initPosterPopup() {
    const popup = document.createElement('div');
    popup.id = 'poster-popup';
    popup.innerHTML = `
        <img id="popup-img" src="" alt="">
        <div id="popup-info">
            <p id="popup-title"></p>
            <p id="popup-desc"></p>
            <button id="popup-play-btn"><i class="fas fa-play"></i> PLAY</button>
        </div>
    `;
    document.body.appendChild(popup);

    // Track which card the popup belongs to
    let currentId = null, currentType = null;

    // Clicking anywhere on the popup → details page (play btn stops propagation)
    popup.addEventListener('click', () => {
        if (currentId && currentType) window.showPreview(currentType, currentId);
    });

    const contentRows = document.getElementById('content-rows');
    let hideTimer;

    let hoverTimer;

    const showPopup = (wrap) => {
        const { id, type, title, overview, poster } = wrap.dataset;
        currentId = id;
        currentType = type;
        document.getElementById('popup-img').src = poster;
        document.getElementById('popup-title').textContent = title;
        document.getElementById('popup-desc').textContent = overview;
        document.getElementById('popup-play-btn').onclick = ev => {
            ev.stopPropagation();
            window.playStream(type, id);
        };
        const rect = wrap.getBoundingClientRect();
        popup.style.left = rect.left + 'px';
        popup.style.top = rect.top + 'px';
        popup.style.width = rect.width + 'px';
        popup.classList.add('visible');
    };

    contentRows.addEventListener('mouseover', e => {
        const wrap = e.target.closest('.poster-wrap');
        if (!wrap) return;
        clearTimeout(hideTimer);
        clearTimeout(hoverTimer);
        // Edge cards (within 60px of boundary) — no popup, unless we're at the scroll edge
        const track = wrap.closest('.row-posters');
        if (track) {
            const sc = track.closest('.row-scroll-container');
            const EDGE = 60;
            const tr = track.getBoundingClientRect();
            const wr = wrap.getBoundingClientRect();
            const leftBlocked = !sc?.classList.contains('at-start') && (wr.left - tr.left < EDGE);
            const rightBlocked = !sc?.classList.contains('at-end') && (tr.right - wr.right < EDGE);
            if (leftBlocked || rightBlocked) return;
        }
        hoverTimer = setTimeout(() => showPopup(wrap), 700);
    });

    const scheduleHide = () => {
        hideTimer = setTimeout(() => { popup.classList.remove('visible'); currentId = null; }, 500);
    };


    contentRows.addEventListener('mouseout', e => {
        const wrap = e.target.closest('.poster-wrap');
        if (!wrap) return;
        clearTimeout(hoverTimer);
        if (!wrap.contains(e.relatedTarget) && !popup.contains(e.relatedTarget)) scheduleHide();
    });

    popup.addEventListener('mouseover', () => clearTimeout(hideTimer));
    popup.addEventListener('mouseout', e => {
        if (!popup.contains(e.relatedTarget)) scheduleHide();
    });

    // Hide on vertical page scroll (card moves away but mouseout never fires)
    window.addEventListener('scroll', () => {
        clearTimeout(hoverTimer);
        popup.classList.remove('visible');
        currentId = null;
    }, { passive: true });
}

// Global functions for the preview and player
window.showPreview = (type, id) => {
    window.navigateTo('details', type, id);
};

window.loadEpisodes = async (tvId, seasonNumber) => {
    const container = document.getElementById(`episode-list-${tvId}`);
    if (!container) return;
    container.innerHTML = '<div class="loader" style="padding: 20px; font-size: 1rem;">LOADING_EPISODES...</div>';

    try {
        const seasonData = await tmdb.getSeasonDetails(tvId, seasonNumber);
        if (!seasonData || !seasonData.episodes) throw new Error('No episodes');

        container.innerHTML = seasonData.episodes.map(ep => `
            <div class="episode-card" onclick="window.playStream('tv', ${tvId}, ${seasonNumber}, ${ep.episode_number})">
                <div class="episode-thumb">
                    ${ep.still_path
                ? `<img src="${TMDB_CONFIG.IMAGE_BASE_URL}/w300${ep.still_path}" alt="Ep ${ep.episode_number}">`
                : `<div class="episode-thumb-placeholder"><i class="fas fa-film"></i></div>`
            }
                    <span class="episode-play-icon"><i class="fas fa-play"></i></span>
                </div>
                <div class="episode-info">
                    <span class="episode-number">EP ${ep.episode_number}</span>
                    <span class="episode-title">${ep.name}</span>
                    ${ep.runtime ? `<span class="episode-runtime">${ep.runtime}m</span>` : ''}
                </div>
            </div>
        `).join('');
    } catch (err) {
        container.innerHTML = '<p style="padding: 10px; font-family: var(--font-mono);">ERROR_LOADING_EPISODES</p>';
        console.error(err);
    }
};

window.playStream = (type, id, season = 1, episode = 1) => {
    window.navigateTo('player', type, id, season, episode);
};

