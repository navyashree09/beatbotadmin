/* ==========================================================================
   BeatBotAdmin - Dashboard Controller
   ========================================================================== */

let dashSongsUnsub = null;
let dashPlaylistsUnsub = null;

let currentDashState = {
  songs: [],
  totalArtists: 0,
  totalPlaylists: 0
};

function loadDashboardData() {
  if (!db) return;

  if (!dashSongsUnsub) {
    dashSongsUnsub = db.collection("songs").onSnapshot((snap) => {
      const songsList = [];
      const artistsSet = new Set();

      snap.forEach(doc => {
        const data = doc.data();
        data.id = doc.id;
        songsList.push(data);
        if (data.artist) {
          artistsSet.add(data.artist.trim().toLowerCase());
        }
      });

      songsList.sort((a, b) => {
        const tA = a.uploadDate?.seconds || 0;
        const tB = b.uploadDate?.seconds || 0;
        return tB - tA;
      });

      currentDashState.songs = songsList;
      currentDashState.totalArtists = artistsSet.size;
      renderDashUI();
    });
  }

  if (!dashPlaylistsUnsub) {
    dashPlaylistsUnsub = db.collection("playlists").onSnapshot((snap) => {
      currentDashState.totalPlaylists = snap.size;
      renderDashUI();
    });
  }
}

function renderDashUI() {
  updateDashboardUI({
    totalSongs: currentDashState.songs.length,
    totalPlaylists: currentDashState.totalPlaylists || 0,
    totalArtists: currentDashState.totalArtists || 0,
    recentSongs: (currentDashState.songs || []).slice(0, 5)
  });
}

function updateDashboardUI(stats) {
  const songsVal = document.getElementById('stat-total-songs');
  const playlistsVal = document.getElementById('stat-total-playlists');
  const artistsVal = document.getElementById('stat-total-artists');
  const recentTable = document.getElementById('dashboard-recent-table');

  if (songsVal) songsVal.textContent = stats.totalSongs || 0;
  if (playlistsVal) playlistsVal.textContent = stats.totalPlaylists || 0;
  if (artistsVal) artistsVal.textContent = stats.totalArtists || 0;

  if (recentTable) {
    if (stats.recentSongs.length === 0) {
      recentTable.innerHTML = `
        <tr>
          <td colspan="5" class="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-subtle)"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            <p style="margin-top: 8px;">No songs uploaded yet. Click "Upload Music" to get started!</p>
          </td>
        </tr>
      `;
      return;
    }

    recentTable.innerHTML = stats.recentSongs.map(song => `
      <tr>
        <td>
          <div class="song-cell">
            <img src="${song.imageUrl || 'images/logo.png'}" class="song-cover-thumb" alt="${escapeHtml(song.title)}">
            <div>
              <div class="song-title-text" style="font-weight: 700;">${escapeHtml(song.title)}</div>
              <div class="song-artist-text" style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(song.artist || 'Unknown Artist')}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="pill-badge pill-purple">${escapeHtml(song.category || 'Music')}</span>
        </td>
        <td>
          <span class="pill-badge pill-blue">${escapeHtml(song.playlist || 'Single')}</span>
        </td>
        <td>
          <span style="font-size: 0.825rem; font-weight: 600; color: var(--primary-pink);">${getRelativeTime(song.uploadDate)}</span>
        </td>
        <td>
          <button class="btn btn-sm btn-primary" onclick='playTrackPreview(${JSON.stringify(song).replace(/'/g, "&apos;")})' title="Play Preview">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFF"><path d="M8 5v14l11-7z"/></svg> Play
          </button>
        </td>
      </tr>
    `).join('');
  }
}
