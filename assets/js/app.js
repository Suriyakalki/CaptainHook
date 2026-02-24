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

window.toggleFromListing = (type, id, title, poster_path) => {
    const item = { type, id, title, poster_path: poster_path.replace(TMDB_CONFIG.IMAGE_BASE_URL + '/' + TMDB_CONFIG.POSTER_SIZE, '') };
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

    // Reset layout state
    document.body.classList.remove('hide-nav');

    try {
        if (view === 'home') {
            heroSection.style.display = 'flex';
            const trending = await tmdb.getTrending('movie');
            if (trending && trending.results.length > 0) renderHero(trending.results[0]);

            contentRows.innerHTML = '';
            const categories = [
                { title: 'Top Rated Movies', fetch: () => tmdb.getTopRated('movie') },
                { title: 'Popular TV Shows', fetch: () => tmdb.getPopular('tv') },
                { title: 'Action Movies', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '28' }) },
                { title: 'Sci-Fi Movies', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '878' }) },
                { title: 'Horror Movies', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '27' }) },
                { title: 'Animations', fetch: () => tmdb.fetchFromTMDB('/discover/movie', { with_genres: '16' }) }
            ];
            for (const cat of categories) {
                const data = await cat.fetch();
                if (data && data.results) renderRow(cat.title, data.results);
            }
        }
        else if (view === 'movies') {
            heroSection.style.display = 'none';
            contentRows.innerHTML = '<div style="padding: 40px 4%"><h2 class="row-title">Movies</h2></div>';
            const movies = await tmdb.getPopular('movie');
            if (movies && movies.results) renderRow('Popular Movies', movies.results);
            const topRated = await tmdb.getTopRated('movie');
            if (topRated && topRated.results) renderRow('Top Rated Movies', topRated.results);
        }
        else if (view === 'tv') {
            heroSection.style.display = 'none';
            contentRows.innerHTML = '<div style="padding: 40px 4%"><h2 class="row-title">TV Shows</h2></div>';
            const tv = await tmdb.getPopular('tv');
            if (tv && tv.results) renderRow('Popular TV Shows', tv.results);
            const topRated = await tmdb.getTopRated('tv');
            if (topRated && topRated.results) renderRow('Top Rated TV Shows', topRated.results);
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
                    <div class="row-posters">
                        ${list.map(item => `
                            <div class="poster-wrap">
                                <img class="poster"
                                     src="${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZE}${item.poster_path}"
                                     alt="${item.title}"
                                     onclick="window.showPreview('${item.type}', ${item.id})">
                                <button class="remove-list-btn" onclick="window.removeFromList(${item.id})" title="Remove from list">
                                    <i class="fas fa-times"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>`;
                contentRows.appendChild(row);
            }
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
                    <div class="genre-card" onclick="window.navigateTo('genre-detail', '${type}', ${g.id}, '${g.name}')">
                        ${g.name}
                    </div>
                `).join('');
            };

            renderGenres('movie-genres', movieGenres, 'movie');
            renderGenres('tv-genres', tvGenres, 'tv');
        }
        else if (view === 'genre-detail') {
            const [type, genreId, genreName] = args;
            heroSection.style.display = 'none';
            contentRows.innerHTML = `
                <div style="padding: 40px 4%">
                    <button class="preview-back-btn" onclick="window.navigateTo('genres')" style="position: static; margin-bottom: 20px;">
                        <i class="fas fa-arrow-left"></i> BACK
                    </button>
                    <h2 class="row-title">${type.toUpperCase()}_GENRE: ${genreName.toUpperCase()}</h2>
                </div>`;

            const data = await tmdb.discoverByGenre(type, genreId);
            if (data && data.results) {
                const grid = document.createElement('div');
                grid.className = 'results-grid';
                grid.innerHTML = data.results.map(item => `
                    <div class="result-card" onclick="window.showPreview('${type}', ${item.id})">
                        <img src="${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZE}${item.poster_path}"
                             alt="${item.title || item.name}"
                             loading="lazy">
                        <div class="result-info">
                            <span class="result-title">${item.title || item.name}</span>
                        </div>
                    </div>
                `).join('');
                contentRows.appendChild(grid);
            }
        }
        else if (view === 'search') {
            const initialQuery = args[0] || '';
            heroSection.style.display = 'none';
            contentRows.innerHTML = `
                <div class="search-page-container">
                    <div class="search-page-input-wrapper">
                        <input type="text" id="page-search-input" class="search-page-input" placeholder="Search for movies, TV shows..." value="${initialQuery}" autofocus>
                        <button id="page-search-btn" class="search-page-btn">
                            <i class="fas fa-search"></i> SEARCH
                        </button>
                    </div>
                    <div id="search-results-container">
                        <div class="loader">Loading...</div>
                    </div>
                </div>
            `;

            const searchInput = document.getElementById('page-search-input');
            const searchBtn = document.getElementById('page-search-btn');
            const resultsContainer = document.getElementById('search-results-container');

            const performSearch = async (query) => {
                resultsContainer.innerHTML = '<div class="loader">Searching...</div>';
                if (!query) {
                    const trending = await tmdb.getTrending('all');
                    resultsContainer.innerHTML = '<h3 class="search-suggestions-title">TRENDING NOW</h3>';
                    if (trending && trending.results.length > 0) {
                        const tempDiv = document.createElement('div');
                        const row = document.createElement('div');
                        row.className = 'row';
                        row.innerHTML = `
                            <div class="row-posters">
                                ${trending.results.map(item => item.poster_path ? `
                                    <img class="poster" src="${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZE}${item.poster_path}" alt="${item.title || item.name}" onclick="window.showPreview('${item.media_type || 'movie'}', ${item.id})">
                                ` : '').join('')}
                            </div>
                        `;
                        tempDiv.appendChild(row);
                        resultsContainer.appendChild(tempDiv);
                    }
                    return;
                }

                if (history.state && history.state.args && history.state.args[0] !== query) {
                    history.replaceState({ view: 'search', args: [query] }, '');
                }

                const results = await tmdb.search(query);
                resultsContainer.innerHTML = `<h3 class="search-suggestions-title">RESULTS FOR "${query}"</h3>`;

                if (results && results.results.length > 0) {
                    const tempDiv = document.createElement('div');
                    const row = document.createElement('div');
                    row.className = 'row';
                    row.innerHTML = `
                        <div class="row-posters">
                            ${results.results.map(item => {
                        if (!item.poster_path) return '';
                        return `<img class="poster" src="${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZE}${item.poster_path}" alt="${item.title || item.name}" onclick="window.showPreview('${item.media_type || 'movie'}', ${item.id})">`;
                    }).join('')}
                        </div>
                    `;
                    tempDiv.appendChild(row);
                    resultsContainer.appendChild(tempDiv);
                } else {
                    resultsContainer.innerHTML += '<p style="font-family: var(--font-mono); font-size: 1.2rem; padding: 20px 4%;">NO_RESULTS_FOUND</p>';
                }
            };

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
                    <div class="season-header">
                        <label class="season-label">SEASON</label>
                        <select class="season-select" id="season-select-${id}" onchange="window.loadEpisodes(${id}, this.value)">
                            ${seasons.map(s => `<option value="${s.season_number}">Season ${s.season_number} (${s.episode_count} eps)</option>`).join('')}
                        </select>
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
                            <button class="preview-list-btn toggle-list-btn" data-id="${id}" onclick="window.toggleFromListing('${type}', ${id}, '${(details.title || details.name).replace(/'/g, "\\'")}', '${details.poster_path}')">
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
                            <h2 class="row-title" style="margin: 40px 4% 10px;">SIMILAR_MODELS</h2>
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
                    VIEW_META [RAW]
                </button>
                <button class="btn btn-secondary toggle-list-btn" data-id="${movie.id}" onclick="window.toggleFromListing('movie', ${movie.id}, '${title.replace(/'/g, "\\'")}', '${movie.poster_path}')">
                    ${added ? '<i class="fas fa-minus"></i> REMOVE' : '<i class="fas fa-plus"></i> MY LIST'}
                </button>
            </div>
        </div>
    `;
}

function renderRow(title, movies) {
    const container = document.getElementById('content-rows');
    const row = document.createElement('div');
    row.className = 'row';

    row.innerHTML = `
        <h2 class="row-title">${title}</h2>
        <div class="row-posters">
            ${movies.map(movie => `
                <img class="poster"
                     src="${TMDB_CONFIG.IMAGE_BASE_URL}/${TMDB_CONFIG.POSTER_SIZE}${movie.poster_path}"
                     alt="${movie.title || movie.name}"
                     onclick="window.showPreview('${movie.media_type || (title.includes('TV') ? 'tv' : 'movie')}', ${movie.id})"
                >
            `).join('')}
        </div>
    `;
    container.appendChild(row);
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
