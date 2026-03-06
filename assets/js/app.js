import { tmdb } from './tmdbService.js?v=56.0';
import { TMDB_CONFIG, VIDKING_CONFIG, OMDB_CONFIG } from './config.js?v=56.0';

// ── My List (Watchlist) Helpers ──────────────────────────────────────────────
const STORAGE_KEY = 'captain-hook-list';
const HISTORY_KEY = 'captain-hook-history';
const RATING_CACHE = JSON.parse(localStorage.getItem('captain-hook-ratings') || '{}');

function saveRatingToCache(id, rating) {
    RATING_CACHE[id] = rating;
    localStorage.setItem('captain-hook-ratings', JSON.stringify(RATING_CACHE));
}

async function getImdbRating(id, type) {
    if (RATING_CACHE[id]) return RATING_CACHE[id];

    try {
        const details = await tmdb.getDetails(type, id);
        const imdbId = details.imdb_id || (details.external_ids && details.external_ids.imdb_id);
        if (!imdbId) return null;

        const omdbData = await tmdb.getOMDbDetails(imdbId);
        if (omdbData && omdbData.imdbRating && omdbData.imdbRating !== 'N/A') {
            const rating = omdbData.imdbRating;
            saveRatingToCache(id, rating);
            return rating;
        }
    } catch (err) {
        console.error(`Error fetching IMDb rating for ${id}:`, err);
    }
    return null;
}

async function enrichResultsWithIMDb(items, defaultType) {
    const enriched = await Promise.all(items.map(async (item) => {
        const type = item.media_type || defaultType;
        const rating = await getImdbRating(item.id, type);
        return { ...item, imdbRating: rating ? parseFloat(rating) : 0 };
    }));
    return enriched;
}

// ── Skeletons & Loaders ──────────────────────────────────────────────────────
function getSkeletonRow(title) {
    return `
        <div class="row">
            <div class="row-header"><h2 class="row-title">${title}</h2></div>
            <div class="row-scroll-container">
                <div class="row-posters">
                    ${Array(6).fill('<div class="skeleton skeleton-poster"></div>').join('')}
                </div>
            </div>
        </div>
    `;
}

function getSkeletonHero() {
    return `<div class="skeleton skeleton-hero"></div>`;
}

// ── Dynamic Vibrant Theme ────────────────────────────────────────────────────
async function getVibrantColor(imageUrl) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageUrl;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = 1; canvas.height = 1;
            ctx.drawImage(img, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            resolve(`rgb(${r},${g},${b})`);
        };
        img.onerror = () => resolve('rgb(20,20,20)');
    });
}

function updateVibrantTheme(color) {
    const root = document.documentElement;
    root.style.setProperty('--vibrant-bg', color);
    // Create a brighter/saturated version for accent
    const accent = color.replace('rgb', 'rgba').replace(')', ', 0.8)');
    root.style.setProperty('--vibrant-accent', color === 'rgb(20,20,20)' ? 'var(--red)' : color);
}

function getHistory() {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
}

function saveToHistory(item) {
    let history = getHistory();
    const index = history.findIndex(i => i.id === item.id);
    if (index > -1) {
        history.splice(index, 1);
    }
    // Add progress for visual demo (random between 20 and 90)
    item.progress = Math.floor(Math.random() * 70) + 20;
    history.unshift(item);
    if (history.length > 20) {
        history.pop();
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

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
    contentRows.classList.remove('vibrant-themed');
    // Stop any running hero rotation when navigating away
    stopHeroRotation();

    console.log(`Rendering View: ${view}`, args);

    try {
        if (view === 'home') {
            // Home skeleton
            heroSection.style.display = 'flex';
            heroSection.innerHTML = getSkeletonHero();
            contentRows.innerHTML = '';

            const skeletonCategories = [
                { title: 'CONTINUE WATCHING', key: 'CONTINUE WATCHING' },
                { title: 'Top Rated Movies', key: 'top-rated:movie' },
                { title: 'Popular TV Shows', key: 'popular:tv' },
                { title: 'Action Movies', key: 'genre:movie:28' },
                { title: 'Sci-Fi Movies', key: 'genre:movie:878' },
                { title: 'Horror Movies', key: 'genre:movie:27' },
                { title: 'Animations', key: 'genre:movie:16' }
            ];
            skeletonCategories.forEach(cat => {
                contentRows.innerHTML += `<div data-skeleton="${cat.key}">${getSkeletonRow(cat.title)}</div>`;
            });

            // Actual data fetch
            const trending = await tmdb.getTrending('movie');
            if (trending && trending.results && trending.results.length > 0) {
                initHeroRotation(trending.results.slice(0, 5));
            } else if (!trending) {
                throw new Error('CONNECTION_TIMEOUT');
            }

            const historyItems = getHistory();
            if (historyItems.length > 0) {
                renderContinueWatchingRow('CONTINUE WATCHING', historyItems);
            } else {
                const cwSkeleton = contentRows.querySelector('[data-skeleton="CONTINUE WATCHING"]');
                if (cwSkeleton) cwSkeleton.remove();
            }

            const categories = [
                { title: 'Top Rated Movies', key: 'top-rated:movie', fetch: () => tmdb.getTopRated('movie') },
                { title: 'Popular TV Shows', key: 'popular:tv', fetch: () => tmdb.getPopular('tv') },
                { title: 'Action Movies', key: 'genre:movie:28', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '28' }) },
                { title: 'Sci-Fi Movies', key: 'genre:movie:878', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '878' }) },
                { title: 'Horror Movies', key: 'genre:movie:27', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '27' }) },
                { title: 'Animations', key: 'genre:movie:16', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '16' }) }
            ];
            categories.forEach(cat => {
                cat.fetch()
                    .then(async data => {
                        if (data && data.results) {
                            const enriched = await enrichResultsWithIMDb(data.results, cat.key.includes('movie') ? 'movie' : 'tv');
                            enriched.sort((a, b) => b.imdbRating - a.imdbRating);
                            renderRow(cat.title, enriched, cat.key);
                        }
                    })
                    .catch(err => console.error(`Failed loading category: ${cat.title}`, err));
            });
        }
        else if (view === 'movies') {
            heroSection.style.display = 'none';
            contentRows.innerHTML = `
                <div style="padding: 40px 4% 10px"><h2 class="row-title">MOVIES</h2></div>
                <div id="movies-content"></div>
            `;
            const moviesContent = document.getElementById('movies-content');
            const movieCategories = [
                { title: 'Popular Movies', key: 'popular:movie', fetch: () => tmdb.getPopular('movie') },
                { title: 'Top Rated Movies', key: 'top-rated:movie', fetch: () => tmdb.getTopRated('movie') },
                { title: 'Action', key: 'genre:movie:28', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '28' }) },
                { title: 'Sci-Fi', key: 'genre:movie:878', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '878' }) }
            ];
            movieCategories.forEach(cat => {
                moviesContent.innerHTML += `<div data-skeleton="${cat.key}">${getSkeletonRow(cat.title)}</div>`;
            });

            for (const cat of movieCategories) {
                cat.fetch().then(async data => {
                    if (data && data.results) {
                        const enriched = await enrichResultsWithIMDb(data.results, 'movie');
                        enriched.sort((a, b) => b.imdbRating - a.imdbRating);
                        renderRow(cat.title, enriched, cat.key);
                    }
                });
            }
        }
        else if (view === 'tv') {
            heroSection.style.display = 'none';
            contentRows.innerHTML = `
                <div style="padding: 40px 4% 10px"><h2 class="row-title">TV SHOWS</h2></div>
                <div id="tv-content"></div>
            `;
            const tvContent = document.getElementById('tv-content');
            const tvCategories = [
                { title: 'Popular TV Shows', key: 'popular:tv', fetch: () => tmdb.getPopular('tv') },
                { title: 'Top Rated TV Shows', key: 'top-rated:tv', fetch: () => tmdb.getTopRated('tv') },
                { title: 'Sci-Fi_&_Fantasy', key: 'genre:tv:10765', fetch: () => tmdb.fetchFromTMDB('/discover/tv', { with_genres: '10765' }) }
            ];
            tvCategories.forEach(cat => {
                tvContent.innerHTML += `<div data-skeleton="${cat.key}">${getSkeletonRow(cat.title)}</div>`;
            });

            for (const cat of tvCategories) {
                cat.fetch().then(async data => {
                    if (data && data.results) {
                        const enriched = await enrichResultsWithIMDb(data.results, 'tv');
                        enriched.sort((a, b) => b.imdbRating - a.imdbRating);
                        renderRow(cat.title, enriched, cat.key);
                    }
                });
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
        else if (view === 'history') {
            heroSection.style.display = 'none';
            const history = getHistory();
            contentRows.innerHTML = '';
            const header = document.createElement('div');
            header.style.cssText = 'padding: 40px 4% 20px';
            header.innerHTML = `<h2 class="row-title">WATCH HISTORY <span style="font-size:1rem; margin-left:10px;">[${history.length}]</span></h2>`;
            contentRows.appendChild(header);

            if (history.length === 0) {
                contentRows.innerHTML += `
                    <div class="my-list-empty">
                        <i class="fas fa-history" style="font-size:3rem; margin-bottom:16px;"></i>
                        <p>No watch history found.</p>
                        <p style="font-size:0.85rem; margin-top:8px;">Movies and TV shows you watch will appear here.</p>
                    </div>`;
            } else {
                const row = document.createElement('div');
                row.className = 'row';
                row.innerHTML = `
                    <div class="row-scroll-container">
                        <button class="row-arrow row-arrow-left" aria-label="Scroll left"><i class="fas fa-chevron-left"></i></button>
                        <div class="row-posters">
                            ${history.map(item => makePosterWrap(item, item.type)).join('')}
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
                        totalTMDBPages = Math.min(data.total_pages, 500);
                        const validItems = data.results.filter(i => i.poster_path);
                        const enriched = await enrichResultsWithIMDb(validItems, mediaType);
                        enriched.sort((a, b) => b.imdbRating - a.imdbRating);

                        const htmlStr = enriched.map(i => makePosterWrap(i, i.media_type || mediaType)).join('');
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
                    <h2 class="row-title">BROWSE BY GENRE</h2>
                    <div class="genre-container">
                        <div class="genre-section">
                            <h3 class="genre-sub-title">MOVIES</h3>
                            <div class="genre-grid" id="movie-genres"></div>
                        </div>
                        <div class="genre-section">
                            <h3 class="genre-sub-title">TV SHOWS</h3>
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

                    // Show a message that we're enriching
                    resultsContainer.innerHTML += `<div id="enrich-msg" style="padding:0 4%; font-family:var(--font-mono); font-size:0.8rem; color:var(--text-secondary);">ENRICHING_RATINGS...</div>`;

                    enrichResultsWithIMDb(filtered, 'movie').then(enriched => {
                        const msg = document.getElementById('enrich-msg');
                        if (msg) msg.remove();
                        enriched.sort((a, b) => b.imdbRating - a.imdbRating);
                        row.innerHTML = `
                            <div class="results-grid" style="padding-top: 20px;">
                                ${enriched.map(item => makePosterWrap(item, item.media_type || 'movie')).join('')}
                            </div>`;
                        resultsContainer.appendChild(row);
                    });
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

            const isTv = type === 'tv';
            const seasons = isTv && details.seasons ? details.seasons.filter(s => s.season_number > 0) : [];
            const backdropPath = `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.BACKDROP_SIZE}${details.backdrop_path}`;
            const posterPath = `${TMDB_CONFIG.IMAGE_BASE_URL}/w500${details.poster_path}`;

            // Extract YouTube trailer key
            const trailerVideo = details.videos && details.videos.results
                ? (details.videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube')
                    || details.videos.results.find(v => v.site === 'YouTube'))
                : null;
            const trailerKey = trailerVideo ? trailerVideo.key : null;

            // Vibrant Color Extraction
            const vColor = await getVibrantColor(posterPath);
            updateVibrantTheme(vColor);
            contentRows.classList.add('vibrant-themed');

            // OMDb Fetch for rating badge
            const imdbId = details.imdb_id || (details.external_ids && details.external_ids.imdb_id);
            let imdbRating = '';
            if (imdbId) {
                const omdbData = await tmdb.getOMDbDetails(imdbId);
                if (omdbData && omdbData.imdbRating && omdbData.imdbRating !== 'N/A') {
                    imdbRating = omdbData.imdbRating;
                }
            }

            // Meta badges: year · runtime/seasons · rating
            const year = (details.release_date || details.first_air_date || '').slice(0, 4);
            const runtime = details.runtime
                ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
                : (details.number_of_seasons ? `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? 's' : ''}` : '');
            const metaBadges = [
                year ? `<span class="meta-badge">${year}</span>` : '',
                runtime ? `<span class="meta-badge">${runtime}</span>` : '',
                details.vote_average ? `<span class="meta-badge meta-badge-score">★ ${details.vote_average.toFixed(1)}</span>` : '',
                imdbRating ? `<span class="meta-badge meta-badge-imdb">IMDb ${imdbRating}</span>` : '',
            ].filter(Boolean).join('');

            const castHtml = details.credits.cast.slice(0, 12).map(c => `
                <div class="cast-card" onclick="window.openPerson(${c.id})">
                    <div class="cast-img-wrap">
                        <img class="cast-img" src="${c.profile_path ? TMDB_CONFIG.IMAGE_BASE_URL + '/w185' + c.profile_path : 'assets/img/no-profile.png'}" alt="${c.name}">
                    </div>
                    <div class="cast-name">${c.name}</div>
                </div>
            `).join('');

            // Key crew only (director + writer), deduplicated
            const targetJobs = ['Director', 'Writer', 'Screenplay'];
            const importantCrew = details.credits.crew
                .filter(c => targetJobs.includes(c.job))
                .reduce((acc, cur) => {
                    const x = acc.find(i => i.id === cur.id);
                    if (!x) return acc.concat([cur]);
                    if (!x.job.includes(cur.job)) x.job += ', ' + cur.job;
                    return acc;
                }, []).slice(0, 6);

            const crewHtml = importantCrew.map(c => `
                <div class="cast-card" onclick="window.openPerson(${c.id})">
                    <div class="cast-img-wrap">
                        <img class="cast-img" src="${c.profile_path ? TMDB_CONFIG.IMAGE_BASE_URL + '/w185' + c.profile_path : 'assets/img/no-profile.png'}" alt="${c.name}">
                    </div>
                    <div class="cast-name">${c.name}</div>
                    <div class="cast-role" style="font-size:0.65rem; color:var(--text-secondary); margin-top:2px; text-transform:uppercase;">${c.job}</div>
                </div>
            `).join('');

            const seasonSelector = isTv ? `
                <div class="season-browser" style="margin-top:24px;">
                    <div class="season-header">
                        <label class="season-label">SEASON</label>
                        <select class="season-select" id="season-select-${id}" onchange="window.loadEpisodes(${id}, this.value)">
                            ${seasons.map(s => `<option value="${s.season_number}">Season ${s.season_number}</option>`).join('')}
                        </select>
                    </div>
                    <div class="episode-list" id="episode-list-${id}"></div>
                </div>` : '';

            // Banner: YouTube trailer (autoplay, muted) or fallback to backdrop image
            const bannerHtml = trailerKey
                ? `<iframe class="details-trailer-iframe" id="trailer-iframe"
                       src="https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&loop=1&playlist=${trailerKey}&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&start=5&enablejsapi=1"
                       frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>
                   <div class="details-trailer-fade"></div>
                   <img class="preview-backdrop-img details-backdrop-fallback" src="${backdropPath}" alt="Backdrop">
                   <button class="trailer-mute-btn" id="trailer-mute-btn" title="Toggle mute">
                       <i class="fas fa-volume-mute"></i>
                   </button>`
                : `<img class="preview-backdrop-img" src="${backdropPath}" alt="Backdrop">`;

            contentRows.innerHTML = `
                <div class="preview-card details-page">
                    <div class="preview-backdrop-wrap ${trailerKey ? 'has-trailer' : ''}">
                        ${bannerHtml}
                    </div>

                    <div class="details-grid">
                        <div class="details-poster-area">
                            <img src="${posterPath}" alt="${details.title || details.name}" class="details-main-poster">
                        </div>

                        <div class="details-info-area">
                            <h1 class="preview-title">${details.title || details.name}</h1>

                            <div class="details-meta-row">${metaBadges}</div>

                            <div class="genres-row">
                                ${details.genres.map(g => `<span class="genre-tag">${g.name.toUpperCase()}</span>`).join(' ')}
                            </div>

                            <div class="preview-actions">
                                <button class="details-btn details-btn-play" onclick="window.playStream('${type}', ${id})">
                                    <i class="fas fa-play"></i> PLAY
                                </button>
                                <button class="details-btn details-btn-list toggle-list-btn" data-id="${id}"
                                    onclick="window.toggleFromListing('${type}', ${id}, '${(details.title || details.name).replace(/'/g, "\\'")}', '${details.poster_path}', '${(details.overview || '').slice(0, 160).replace(/'/g, "\\'").replace(/"/g, '')}')">
                                    ${isInList(id) ? '<i class="fas fa-check"></i>' : '<i class="fas fa-plus"></i>'}
                                    <span>${isInList(id) ? 'SAVED' : 'MY LIST'}</span>
                                </button>
                            </div>

                            <p class="preview-overview">${details.overview}</p>

                            <div class="cast-section">
                                <h3 class="details-section-label">THE CAST</h3>
                                <div class="cast-container">${castHtml}</div>
                            </div>

                            ${crewHtml ? `
                            <div class="cast-section" style="margin-top:16px;">
                                <h3 class="details-section-label">CREW</h3>
                                <div class="cast-container">${crewHtml}</div>
                            </div>` : ''}

                            <div style="margin-top:16px;">
                                <button class="details-btn details-btn-outline" onclick="window.viewFullCredits(${id}, '${type}', '${(details.title || details.name).replace(/'/g, "\\'")}')">
                                    FULL CREDITS <i class="fas fa-arrow-right"></i>
                                </button>
                            </div>

                            ${seasonSelector}
                        </div>
                    </div>

                    ${similar && similar.results && similar.results.length > 0 ? `
                        <div class="similar-content-section">
                            <h2 class="details-section-label" style="margin: 32px 4% 10px;">MORE LIKE THIS</h2>
                            <div class="row">
                                <div class="row-scroll-container">
                                    <button class="row-arrow row-arrow-left"><i class="fas fa-chevron-left"></i></button>
                                    <div class="row-posters">
                                        ${similar.results.slice(0, 12).map(item => makePosterWrap(item, type)).join('')}
                                    </div>
                                    <button class="row-arrow row-arrow-right"><i class="fas fa-chevron-right"></i></button>
                                </div>
                            </div>
                        </div>
                    ` : ''}
                </div>`;

            // Setup similar row arrows
            const simRow = contentRows.querySelector('.similar-content-section .row');
            if (simRow) setupRowArrows(simRow);

            // Wire up trailer mute toggle via YouTube postMessage API
            const muteBtn = contentRows.querySelector('#trailer-mute-btn');
            if (muteBtn) {
                let isMuted = true;
                muteBtn.addEventListener('click', () => {
                    const iframe = contentRows.querySelector('#trailer-iframe');
                    if (!iframe) return;
                    isMuted = !isMuted;
                    const cmd = isMuted ? 'mute' : 'unMute';
                    iframe.contentWindow.postMessage(
                        JSON.stringify({ event: 'command', func: cmd, args: '' }),
                        '*'
                    );
                    muteBtn.innerHTML = isMuted
                        ? '<i class="fas fa-volume-mute"></i>'
                        : '<i class="fas fa-volume-up"></i>';
                    muteBtn.classList.toggle('is-unmuted', !isMuted);
                });
            }

            if (isTv && seasons.length > 0) window.loadEpisodes(id, seasons[0].season_number);
        }
        else if (view === 'person') {
            await renderPersonView(args[0]);
        }
        else if (view === 'view-all-person') {
            await renderViewAllPerson(args[0], args[1]);
        }
        else if (view === 'view-full-credits') {
            await renderFullCredits(args[0], args[1], args[2]);
        }
        else if (view === 'player') {
            const [type, id, season = 1, episode = 1] = args;
            heroSection.style.display = 'none';
            document.body.classList.add('hide-nav');
            window.scrollTo(0, 0);

            // Pull stored metadata (set by playStream before navigating)
            const meta = window.__playerMeta || {};
            const accentHex = meta.accentHex || 'e50914';
            const title = meta.title || '';
            const overview = meta.overview || '';
            const poster = meta.poster || '';
            const backdrop = meta.backdrop || '';
            const year = meta.year || '';
            const runtime = meta.runtime || '';
            const genres = meta.genres || '';

            const embedUrl = type === 'tv'
                ? `${VIDKING_CONFIG.TV_URL}${id}/${season}/${episode}?clr=${accentHex}`
                : `${VIDKING_CONFIG.MOVIE_URL}${id}?clr=${accentHex}`;

            contentRows.innerHTML = `
                <div class="page-player" id="player-container">

                    <!-- Loading splash -->
                    <div class="player-loader" id="player-loader">
                        <div class="player-loader-inner">
                            ${poster ? `<img class="player-loader-poster" src="${poster}" alt="${title}">` : ''}
                            <div class="player-loader-text">INITIALIZING_STREAM...</div>
                            <div class="player-loader-bar"><div class="player-loader-fill" style="--accent:#${accentHex}"></div></div>
                        </div>
                    </div>

                    <!-- Top bar (always visible, fades out) -->
                    <div class="player-topbar" id="player-topbar">
                        <button class="player-back-btn" onclick="history.back()">
                            <i class="fas fa-arrow-left"></i>
                        </button>
                        <div class="player-topbar-meta">
                            <span class="player-topbar-title">${title}</span>
                            ${type === 'tv' ? `<span class="player-topbar-ep">S${season} E${episode}</span>` : ''}
                        </div>
                    </div>

                    <!-- Pause-state info overlay (shows on mouse idle) -->
                    <div class="player-info-overlay" id="player-info-overlay">
                        ${backdrop ? `<div class="player-info-backdrop" style="background-image:url('${backdrop}')"></div>` : ''}
                        <div class="player-info-backdrop-fade"></div>
                        <div class="player-info-content">
                            ${poster ? `<img class="player-info-poster" src="${poster}" alt="${title}">` : ''}
                            <div class="player-info-text">
                                <h1 class="player-info-title" style="--accent:#${accentHex}">${title}</h1>
                                <div class="player-info-meta">
                                    ${year ? `<span>${year}</span>` : ''}
                                    ${runtime ? `<span>${runtime}</span>` : ''}
                                    ${genres ? `<span>${genres}</span>` : ''}
                                    ${type === 'tv' ? `<span>S${season} · E${episode}</span>` : ''}
                                </div>
                                <p class="player-info-overview">${overview}</p>
                            </div>
                        </div>
                    </div>

                    <!-- The actual stream iframe -->
                    <iframe id="stream-iframe"
                            src="${embedUrl}"
                            allowfullscreen
                            allow="autoplay; encrypted-media"
                            sandbox="allow-forms allow-scripts allow-same-origin allow-presentation">
                    </iframe>
                </div>
            `;

            const iframe = document.getElementById('stream-iframe');
            const loader = document.getElementById('player-loader');
            const topbar = document.getElementById('player-topbar');
            const infoOverlay = document.getElementById('player-info-overlay');
            const container = document.getElementById('player-container');

            // Hide loader once iframe loads (or after timeout)
            iframe.onload = () => { loader && (loader.style.opacity = '0', setTimeout(() => loader.remove(), 600)); };
            setTimeout(() => { try { loader.style.opacity = '0'; setTimeout(() => loader.remove(), 600); } catch (_) { } }, 8000);

            // UI visibility — topbar fades out after 3s idle, info overlay appears after 4s idle
            let hideTimer, infoTimer, isMoving = false;

            const showUI = () => {
                clearTimeout(hideTimer);
                clearTimeout(infoTimer);
                topbar.classList.remove('ui-hidden');
                infoOverlay.classList.remove('info-visible');
                hideTimer = setTimeout(() => topbar.classList.add('ui-hidden'), 3000);
                infoTimer = setTimeout(() => infoOverlay.classList.add('info-visible'), 4500);
            };

            // Hide overlay immediately when user clicks into iframe (play/pause)
            // window.blur fires when the iframe steals focus
            const onWindowBlur = () => {
                clearTimeout(infoTimer);
                infoOverlay.classList.remove('info-visible');
                // Restart idle timer so it shows again if they go idle
                infoTimer = setTimeout(() => infoOverlay.classList.add('info-visible'), 4500);
            };
            window.addEventListener('blur', onWindowBlur);

            container.addEventListener('mousemove', showUI);
            container.addEventListener('touchstart', showUI, { passive: true });
            container.addEventListener('click', showUI);

            // Show overlay immediately on load
            infoOverlay.classList.add('info-visible');
            hideTimer = setTimeout(() => topbar.classList.add('ui-hidden'), 3000);
        }
    } catch (err) {
        console.error('View Rendering Error:', err);
        contentRows.innerHTML = `
            <div class="connection-error" style="text-align:center; padding:100px 20px; color:var(--text-secondary);">
                <i class="fas fa-wifi-slash" style="font-size:4rem; margin-bottom:20px; color:var(--red);"></i>
                <h2 style="font-size:2rem; margin-bottom:10px; color:var(--text-primary);">CONNECTION_ISSUE</h2>
                <p style="max-width:500px; margin:0 auto 30px; line-height:1.6;">The app is having trouble reaching the database. This often happens on mobile data or certain restricted Wi-Fi networks.</p>
                <button class="btn btn-primary" onclick="location.reload()">RETRY CONNECTION</button>
            </div>
        `;
    }
}

// Global hero rotation interval handle — cleared when navigating away
let _heroRotationInterval = null;

function stopHeroRotation() {
    if (_heroRotationInterval) {
        clearInterval(_heroRotationInterval);
        _heroRotationInterval = null;
    }
}
// Expose for inline onclick handlers in hero dots
window.stopHeroRotation = stopHeroRotation;
window.renderHero = renderHero;

function initHeroRotation(movies) {
    stopHeroRotation();
    if (!movies || movies.length === 0) return;
    let currentIndex = 0;

    // Render first slide immediately
    renderHero(movies[0], movies, 0);

    if (movies.length <= 1) return;

    _heroRotationInterval = setInterval(() => {
        currentIndex = (currentIndex + 1) % movies.length;
        const hero = document.getElementById('hero');
        if (!hero) { stopHeroRotation(); return; }

        // Fade out
        hero.style.transition = 'opacity 0.5s ease';
        hero.style.opacity = '0';

        setTimeout(() => {
            if (!document.getElementById('hero')) { stopHeroRotation(); return; }
            renderHero(movies[currentIndex], movies, currentIndex);
            const h = document.getElementById('hero');
            if (h) {
                h.style.transition = 'opacity 0.6s ease';
                h.style.opacity = '1';
            }
        }, 500);
    }, 7000);
}

function renderHero(movie, allMovies, activeIndex) {
    const hero = document.getElementById('hero');
    if (!hero) return;
    hero.style.backgroundImage = `url(${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.BACKDROP_SIZE}${movie.backdrop_path})`;

    const type = movie.title ? 'movie' : 'tv';
    const title = movie.title || movie.name;
    const added = isInList(movie.id);

    // Dot indicators
    const dotsHtml = allMovies && allMovies.length > 1
        ? `<div class="hero-dots">
            ${allMovies.map((_, i) =>
            `<button class="hero-dot ${i === activeIndex ? 'active' : ''}"
                    onclick="event.stopPropagation(); stopHeroRotation(); renderHero(window.__heroMovies[${i}], window.__heroMovies, ${i});"></button>`
        ).join('')}
           </div>`
        : '';

    // Store movie list globally for dot onclick access
    if (allMovies) window.__heroMovies = allMovies;

    hero.innerHTML = `
        <div class="hero-content distressed">
            <h1 class="hero-title glitch" data-text="${title}">${title}</h1>
            <div id="hero-imdb-rating" style="display:none; background:rgba(0,0,0,0.6); padding:5px 10px; border-radius:4px; margin-bottom:15px; font-weight:bold; color:#f5c518; border:1px solid #f5c518;"></div>
            <p class="hero-overview">${(movie.overview || '').slice(0, 220)}${(movie.overview || '').length > 220 ? '…' : ''}</p>
            <div class="hero-buttons">
                <button class="btn btn-primary" onclick="window.playStream('${type}', ${movie.id})">
                   <i class="fas fa-play"></i> PLAY
                </button>
                <button class="btn btn-secondary toggle-list-btn" data-id="${movie.id}"
                    onclick="window.toggleFromListing('${type}', ${movie.id}, '${title.replace(/'/g, "\\'")}', '${movie.poster_path}', '${(movie.overview || '').slice(0, 160).replace(/'/g, "\\'").replace(/"/g, '')}')">
                    ${added ? '<i class="fas fa-minus"></i> REMOVE' : '<i class="fas fa-plus"></i> MY LIST'}
                </button>
                <button class="btn btn-outline hero-info-btn" onclick="window.showPreview('${type}', ${movie.id})">
                    <i class="fas fa-info-circle"></i> MORE INFO
                </button>
            </div>
            ${dotsHtml}
        </div>
    `;

    // Async IMDb rating
    getImdbRating(movie.id, type).then(rating => {
        const ratingEl = document.getElementById('hero-imdb-rating');
        if (ratingEl && rating) {
            ratingEl.innerHTML = `⭐ ${rating}`;
            ratingEl.style.display = 'inline-block';
        }
    });
}

function makePosterWrap(item, type) {
    if (!item.poster_path) return '';
    const name = (item.title || item.name || '').replace(/"/g, '&quot;');
    const raw = item.overview || '';
    const overview = (raw.slice(0, 160) + (raw.length > 160 ? '...' : '')).replace(/"/g, '&quot;');
    const poster = `${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZE}${item.poster_path}`;



    return `<div class="poster-wrap"
                 style="position:relative;"
                 data-id="${item.id}" data-type="${type}"
                 data-title="${name}" data-overview="${overview}" data-poster="${poster}"
                 onclick="window.showPreview('${type}',${item.id})">
                <img class="poster" src="${poster}" alt="${name}">
            </div>`;
}

function makeLandscapePosterWrap(item) {
    const name = (item.title || item.name || '').replace(/"/g, '&quot;');
    const imagePath = item.backdrop_path || item.poster_path;
    if (!imagePath) return '';

    const image = `${TMDB_CONFIG.IMAGE_BASE_URL}/${item.backdrop_path ? TMDB_CONFIG.BACKDROP_SIZE : TMDB_CONFIG.POSTER_SIZE}${imagePath}`;
    const progress = item.progress || Math.floor(Math.random() * 40) + 30; // Default 30-70% for demo

    return `
        <div class="landscape-poster-wrap" onclick="window.playStream('${item.type}', ${item.id})">
            <div class="landscape-poster-main">
                <img class="landscape-poster" src="${image}" alt="${name}">
                <div class="progress-container">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
            </div>
            <div class="landscape-title">${name}</div>
        </div>
    `;
}

function renderContinueWatchingRow(title, history) {
    const container = document.getElementById('content-rows');
    // Deduplicate by id, then filter out items with no images
    const seen = new Map();
    history.forEach(item => { if (!seen.has(String(item.id))) seen.set(String(item.id), item); });
    const validItems = [...seen.values()].filter(item => item.backdrop_path || item.poster_path);
    if (validItems.length === 0) return;

    const row = document.createElement('div');
    row.className = 'row continue-watching-row';

    row.innerHTML = `
        <div class="row-header">
            <h2 class="row-title">${title}</h2>
        </div>
        <div class="row-scroll-container">
            <button class="row-arrow row-arrow-left" aria-label="Scroll left"><i class="fas fa-chevron-left"></i></button>
            <div class="row-posters">
                ${validItems.map(item => makeLandscapePosterWrap(item)).join('')}
            </div>
            <button class="row-arrow row-arrow-right" aria-label="Scroll right"><i class="fas fa-chevron-right"></i></button>
        </div>
    `;
    const existingPlaceholder = container.querySelector('[data-skeleton="CONTINUE WATCHING"]');

    if (existingPlaceholder) {
        existingPlaceholder.replaceWith(row);
    } else {
        const existingRow = Array.from(container.querySelectorAll('.row-title')).find(t => t.textContent === title);
        if (!existingRow) {
            container.appendChild(row);
        } else {
            existingRow.closest('.row').replaceWith(row);
        }
    }
    setupRowArrows(row);
}

function renderRow(title, movies, fetchKey) {
    const container = document.getElementById('content-rows');
    const existingPlaceholder = container.querySelector(`[data-skeleton="${fetchKey}"]`);

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
                ${movies.filter(m => m.poster_path).map(movie => makePosterWrap(movie, movie.media_type || mediaType)).join('')}
            </div>
            <button class="row-arrow row-arrow-right" aria-label="Scroll right">
                <i class="fas fa-chevron-right"></i>
            </button>
        </div>
    `;

    if (existingPlaceholder) {
        existingPlaceholder.replaceWith(row);
    } else {
        // Prevent appending if the user navigated away and the skeleton is gone
        const isCurrentViewMatches = window.location.hash.includes(title.toLowerCase().replace(/[^a-z]/g, '')) || true;
        // We'll just check if the container is still the same intended page by searching for existing titles
        const existingRow = Array.from(container.querySelectorAll('.row-title')).find(t => t.textContent === title);
        if (!existingRow) {
            container.appendChild(row);
        } else {
            // Replace existing row to prevent duplicates
            existingRow.closest('.row').replaceWith(row);
        }
    }
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

    // Clicking anywhere on the popup → details page, unless it's the play button
    popup.addEventListener('click', (e) => {
        if (!currentId || !currentType) return;
        if (e.target.closest('#popup-play-btn')) {
            window.playStream(currentType, currentId);
        } else {
            window.showPreview(currentType, currentId);
        }
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

window.playStream = async (type, id, season = 1, episode = 1) => {
    try {
        const details = await tmdb.getDetails(type, id);
        if (details) {
            const posterPath = `${TMDB_CONFIG.IMAGE_BASE_URL}/w500${details.poster_path}`;
            const backdropPath = `${TMDB_CONFIG.IMAGE_BASE_URL}/original${details.backdrop_path}`;
            // Extract vibrant colour for player accent + store metadata globally
            let accentHex = 'e50914';
            try {
                const vColor = await getVibrantColor(posterPath);
                // getVibrantColor returns "rgb(r,g,b)" — parse and convert to hex
                if (vColor && vColor.startsWith('rgb')) {
                    const nums = vColor.match(/\d+/g);
                    if (nums && nums.length >= 3) {
                        accentHex = nums.slice(0, 3)
                            .map(n => parseInt(n).toString(16).padStart(2, '0'))
                            .join('');
                    }
                }
            } catch (_) { }

            window.__playerMeta = {
                type, id, season, episode,
                title: details.title || details.name,
                overview: details.overview || '',
                poster: posterPath,
                backdrop: backdropPath,
                year: (details.release_date || details.first_air_date || '').slice(0, 4),
                runtime: details.runtime
                    ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
                    : (details.number_of_seasons ? `${details.number_of_seasons} Season${details.number_of_seasons > 1 ? 's' : ''}` : ''),
                accentHex,
                genres: (details.genres || []).map(g => g.name).join(' · '),
            };

            saveToHistory({
                type, id,
                title: details.title || details.name,
                overview: details.overview,
                poster_path: details.poster_path,
                backdrop_path: details.backdrop_path,
            });
        }
    } catch (err) {
        console.error('Error saving to history:', err);
        window.__playerMeta = null;
    }
    window.navigateTo('player', type, id, season, episode);
};

// ── Cast & Person Logic ──────────────────────────────────────────────────────
window.openPerson = (personId) => {
    window.navigateTo('person', personId);
};

window.viewAllPerson = (personId, personName, creditType = 'cast') => {
    window.navigateTo('view-all-person', personId, personName, creditType);
};

window.switchPersonTab = async (personId, type) => {
    const container = document.getElementById('person-credits-container');
    const tabs = document.querySelectorAll('.person-tab');
    tabs.forEach(t => t.classList.toggle('active', t.textContent.toLowerCase().includes(type)));

    container.innerHTML = '<div class="loader" style="padding:20px;">FETCHING_RATINGS...</div>';

    try {
        const raw = window.currentPersonCredits[type];
        const initialCredits = await enrichResultsWithIMDb(raw, 'movie');

        const sortedCredits = initialCredits.sort((a, b) => {
            const aIsDoc = a.genre_ids && a.genre_ids.includes(99);
            const bIsDoc = b.genre_ids && b.genre_ids.includes(99);
            if (aIsDoc && !bIsDoc) return 1;
            if (!aIsDoc && bIsDoc) return -1;
            return (b.imdbRating || 0) - (a.imdbRating || 0);
        });

        container.innerHTML = `
            <div class="row-header" style="margin: 0 4% 20px; justify-content: flex-end;">
               <button class="view-all-btn" onclick="window.viewAllPerson(${personId}, '', '${type}')">
                    VIEW ALL <i class="fas fa-arrow-right"></i>
                </button>
            </div>
            <div class="row">
                <div class="row-scroll-container at-start">
                    <button class="row-arrow row-arrow-left hidden"><i class="fas fa-chevron-left"></i></button>
                    <div class="row-posters">
                        ${sortedCredits.slice(0, 20).map(m => makePosterWrap(m, 'movie')).join('')}
                    </div>
                    <button class="row-arrow row-arrow-right"><i class="fas fa-chevron-right"></i></button>
                </div>
            </div>
        `;
        setupRowArrows(container.querySelector('.row'));
    } catch (err) {
        container.innerHTML = '<div class="loader">ERROR_LOADING_TAB</div>';
    }
};

async function renderPersonView(personId) {
    const contentRows = document.getElementById('content-rows');
    const heroSection = document.getElementById('hero');
    heroSection.style.display = 'none';
    contentRows.innerHTML = '<div class="loader">FETCHING_PERSON_DETAILS...</div>';
    window.scrollTo(0, 0);

    try {
        const [details, credits] = await Promise.all([
            tmdb.getPersonDetails(personId),
            tmdb.getPersonMovies(personId)
        ]);

        const isActing = details.known_for_department === 'Acting';
        const initialType = isActing ? 'cast' : 'crew';

        // Prepare and deduplicate both sets
        const process = (raw) => {
            const unique = [];
            const ids = new Set();
            for (const c of raw) {
                if (!ids.has(c.id)) {
                    unique.push(c);
                    ids.add(c.id);
                }
            }
            return unique.filter(i => i.poster_path);
        };

        window.currentPersonCredits = {
            cast: process(credits.cast),
            crew: process(credits.crew)
        };

        const initialCreditsContent = await enrichResultsWithIMDb(window.currentPersonCredits[initialType], 'movie');

        const sortedCredits = initialCreditsContent.sort((a, b) => {
            const aIsDoc = a.genre_ids && a.genre_ids.includes(99);
            const bIsDoc = b.genre_ids && b.genre_ids.includes(99);
            if (aIsDoc && !bIsDoc) return 1;
            if (!aIsDoc && bIsDoc) return -1;
            return (b.imdbRating || 0) - (a.imdbRating || 0);
        });

        const profile = details.profile_path
            ? `${TMDB_CONFIG.IMAGE_BASE_URL}/h632${details.profile_path}`
            : 'assets/img/no-profile.png';

        const tabConfigs = [
            { type: 'cast', label: 'AS CAST MEMBER' },
            { type: 'crew', label: 'AS CREW MEMBER' }
        ];
        if (!isActing) tabConfigs.reverse();

        const tabsHtml = tabConfigs.map(t => `
            <button class="person-tab ${initialType === t.type ? 'active' : ''}" onclick="window.switchPersonTab(${personId}, '${t.type}')">${t.label}</button>
        `).join('');

        contentRows.innerHTML = `
            <div class="preview-card details-page">
                <div class="preview-backdrop-wrap">
                     <img class="preview-backdrop-img" src="${profile}" alt="${details.name}" style="filter: grayscale(1) opacity(0.3); object-position: top;">
                </div>
                <div class="details-grid">
                    <div class="details-poster-area">
                        <img src="${profile}" alt="${details.name}" class="details-main-poster">
                        <div class="meta-sidebar">
                            <p><strong>BORN:</strong> ${details.birthday || 'N/A'}</p>
                            <p><strong>PLACE:</strong> ${details.place_of_birth || 'N/A'}</p>
                        </div>
                    </div>
                    <div class="details-info-area">
                        <h1 class="preview-title glitch">${details.name}</h1>
                        <p class="preview-overview">${details.biography || 'No biography available.'}</p>
                    </div>
                </div>
                    <div class="row-header" style="margin: 0 4% 0;">
                        <h2 class="row-title">KNOWN FOR</h2>
                    </div>
                    
                    <div class="person-tabs">
                        ${tabsHtml}
                    </div>

                    <div id="person-credits-container">
                        <div class="row-header" style="margin: 0 4% 20px; justify-content: flex-end;">
                           <button class="view-all-btn" onclick="window.viewAllPerson(${personId}, '${details.name.replace(/'/g, "\\'")}', '${initialType}')">
                                VIEW ALL <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                        <div class="row">
                            <div class="row-scroll-container at-start">
                                <button class="row-arrow row-arrow-left hidden"><i class="fas fa-chevron-left"></i></button>
                                <div class="row-posters">
                                    ${sortedCredits.slice(0, 20).map(m => makePosterWrap(m, 'movie')).join('')}
                                </div>
                                <button class="row-arrow row-arrow-right"><i class="fas fa-chevron-right"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const rowElement = contentRows.querySelector('.similar-content-section .row');
        if (rowElement) {
            setupRowArrows(rowElement);
        }
    } catch (err) {
        contentRows.innerHTML = '<div class="loader">ERROR_LOADING_PERSON</div>';
        console.error(err);
    }
}

async function renderViewAllPerson(personId, personName, creditType = 'cast') {
    const contentRows = document.getElementById('content-rows');
    const heroSection = document.getElementById('hero');
    heroSection.style.display = 'none';
    contentRows.innerHTML = '<div class="loader">LOADING_CREDITS...</div>';
    window.scrollTo(0, 0);

    try {
        const credits = await tmdb.getPersonMovies(personId);
        const rawCredits = creditType === 'cast' ? credits.cast : credits.crew;

        const uniqueCredits = [];
        const seenIds = new Set();
        for (const c of rawCredits) {
            if (!seenIds.has(c.id)) {
                uniqueCredits.push(c);
                seenIds.add(c.id);
            }
        }

        const sortedCreditsRaw = uniqueCredits.filter(c => c.poster_path);
        const enrichedCredits = await enrichResultsWithIMDb(sortedCreditsRaw, 'movie');

        const sortedCredits = enrichedCredits.sort((a, b) => {
            const aIsDoc = a.genre_ids && a.genre_ids.includes(99);
            const bIsDoc = b.genre_ids && b.genre_ids.includes(99);
            if (aIsDoc && !bIsDoc) return 1;
            if (!aIsDoc && bIsDoc) return -1;
            return (b.imdbRating || 0) - (a.imdbRating || 0);
        });

        contentRows.innerHTML = `
            <div class="view-all-container">
                <div class="view-all-header" style="padding: 40px 4% 20px; display:flex; gap:20px; align-items:center;">
                    <button class="preview-back-btn" onclick="history.back()" style="position:static;">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h2 class="row-title" style="margin:0;">OTHER WORKS: ${personName} (${creditType.toUpperCase()})</h2>
                </div>
                <div class="results-grid">
                    ${sortedCredits.map(item => makePosterWrap(item, 'movie')).join('')}
                </div>
            </div>
        `;
    } catch (err) {
        contentRows.innerHTML = '<div class="loader">ERROR_LOADING_CREDITS</div>';
        console.error(err);
    }
}

window.viewFullCredits = (id, type, title) => {
    window.navigateTo('view-full-credits', id, type, title);
};

async function renderFullCredits(id, type, title) {
    const contentRows = document.getElementById('content-rows');
    const heroSection = document.getElementById('hero');
    heroSection.style.display = 'none';
    contentRows.innerHTML = '<div class="loader">LOADING_CREDITS...</div>';
    window.scrollTo(0, 0);

    try {
        const details = await tmdb.fetchFromTMDB(`/${type}/${id}`, { append_to_response: 'credits' });
        const { cast, crew } = details.credits;

        const makePersonCard = c => `
            <div class="cast-card" style="width: auto; max-width: 150px; text-align: center; cursor: pointer;" onclick="window.openPerson(${c.id})">
                <div class="cast-img-wrap" style="width: 100px; height: 100px; margin: 0 auto 10px; border-radius: 50%; overflow: hidden;">
                    <img class="cast-img" style="width: 100%; height: 100%; object-fit: cover;" src="${c.profile_path ? TMDB_CONFIG.IMAGE_BASE_URL + '/w185' + c.profile_path : 'assets/img/no-profile.png'}" alt="${c.name}">
                </div>
                <div class="cast-name" style="font-size: 0.9rem; font-weight: bold; margin-bottom: 5px;">${c.name}</div>
                <div class="cast-role" style="font-size:0.8rem; color:var(--text-secondary);">${c.character || c.job}</div>
            </div>
        `;

        // Group crew by department
        const crewByDept = crew.reduce((acc, curr) => {
            if (!acc[curr.department]) acc[curr.department] = [];
            acc[curr.department].push(curr);
            return acc;
        }, {});

        let crewHtml = '';
        for (const dept in crewByDept) {
            crewHtml += `
                <h3 class="row-title" style="margin-top:30px; font-size:1.2rem;">${dept.toUpperCase()}</h3>
                <div class="cast-container" style="display:flex; flex-wrap:wrap; gap:20px;">
                    ${crewByDept[dept].map(makePersonCard).join('')}
                </div>
            `;
        }

        contentRows.innerHTML = `
            <div class="view-all-container">
                <div class="view-all-header" style="padding: 40px 4% 20px; display:flex; gap:20px; align-items:center;">
                    <button class="preview-back-btn" onclick="history.back()" style="position:static;">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h2 class="row-title" style="margin:0;">FULL CAST & CREW</h2>
                </div>
                
                <div style="padding: 0 4%;">
                    <h2 class="preview-title glitch" style="font-size: 2rem; margin-bottom: 20px;">${title}</h2>

                    <div class="cast-section">
                        <h3 class="row-title" style="margin-top:20px; font-size:1.5rem;">CAST <span style="font-size:1rem; margin-left:10px;">[${cast.length}]</span></h3>
                        <div class="cast-container" style="display:flex; flex-wrap:wrap; gap:20px; margin-top:20px;">
                            ${cast.map(makePersonCard).join('')}
                        </div>
                    </div>

                    <div class="crew-section" style="margin-top: 50px; border-top: 1px solid var(--text-secondary); padding-top: 20px;">
                        <h3 class="row-title" style="font-size:1.5rem;">CREW <span style="font-size:1rem; margin-left:10px;">[${crew.length}]</span></h3>
                        ${crewHtml}
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        contentRows.innerHTML = '<div class="loader">ERROR_LOADING_CREDITS</div>';
        console.error(err);
    }
}

// ── Trailer Logic ────────────────────────────────────────────────────────────
window.watchTrailer = async (type, id) => {
    try {
        const videos = await tmdb.fetchFromTMDB(`/${type}/${id}/videos`);
        const trailer = videos.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');

        if (trailer) {
            const modal = document.getElementById('trailer-modal');
            const container = document.getElementById('trailer-container');
            container.innerHTML = `
                <iframe width="100%" height="100%" 
                        src="https://www.youtube.com/embed/${trailer.key}?autoplay=1" 
                        frameborder="0" allow="autoplay; encrypted-media" allowfullscreen>
                </iframe>`;
            modal.style.display = 'flex';
        } else {
            alert('Trailer not found for this title.');
        }
    } catch (err) {
        console.error('Trailer Error:', err);
    }
};

window.closeTrailer = () => {
    const modal = document.getElementById('trailer-modal');
    const container = document.getElementById('trailer-container');
    container.innerHTML = '';
    modal.style.display = 'none';
};

