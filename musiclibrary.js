/* ==========================================================================
   BeatBotAdmin - Music Library Controller (Filters, Pagination, Document ID Copy)
   ========================================================================== */

let allSongs = [];
let filteredSongs = [];

// Pagination State
let currentPage = 1;
let itemsPerPage = 25;

let deleteSongTargetId = null;
let editSongTargetId = null;

async function loadLibraryData() {
  await populateLibraryFilters();
  await fetchSongsFromFirestore();
}

let songsUnsubscribe = null;

/**
 * Real-Time Listener for All Songs in Firestore
 */
function fetchSongsFromFirestore() {
  const tbody = document.getElementById('library-table-body');
  if (tbody && allSongs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="10" class="empty-state"><p>Loading tracks from Firebase...</p></td></tr>`;
  }

  if (!db) return;

  if (songsUnsubscribe) songsUnsubscribe();

  songsUnsubscribe = db.collection("songs").onSnapshot((snapshot) => {
    allSongs = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      data.id = doc.id;
      allSongs.push(data);
    });
    applyLibraryFilters();
  }, (err) => {
    console.warn("BeatBotAdmin: Songs real-time listener notice", err);
  });
}

/**
 * Populate Library Filters
 */
async function populateLibraryFilters() {
  const catSelect = document.getElementById('filter-category');
  const langSelect = document.getElementById('filter-language');
  const countrySelect = document.getElementById('filter-country');
  const playlistSelect = document.getElementById('filter-playlist');

  try {
    let categories = DEFAULT_CATEGORIES;
    let languages = DEFAULT_LANGUAGES;
    let countries = DEFAULT_COUNTRIES;

    if (db) {
      const mSnap = await db.collection("masterData").get();
      if (!mSnap.empty) {
        const cList = [], lList = [], cntList = [];
        mSnap.forEach(doc => {
          const d = doc.data();
          if (d.type === 'category') cList.push(d.name);
          if (d.type === 'language') lList.push(d.name);
          if (d.type === 'country') cntList.push(d.name);
        });
        if (cList.length) categories = cList;
        if (lList.length) languages = lList;
        if (cntList.length) countries = cntList;
      }
    }

    if (catSelect) catSelect.innerHTML = '<option value="">All Categories</option>' + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    if (langSelect) langSelect.innerHTML = '<option value="">All Languages</option>' + languages.map(l => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join('');
    if (countrySelect) countrySelect.innerHTML = '<option value="">All Countries</option>' + countries.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');

    if (db && playlistSelect) {
      const pSnap = await db.collection("playlists").get();
      let opts = '<option value="">All Playlists</option>';
      pSnap.forEach(d => opts += `<option value="${escapeHtml(d.data().playlistName)}">${escapeHtml(d.data().playlistName)}</option>`);
      playlistSelect.innerHTML = opts;
    }
  } catch (err) {
    console.warn("BeatBotAdmin: Filter population warning", err);
  }
}

/**
 * Apply Search, Filters, and Sort Options
 */
function applyLibraryFilters() {
  const searchVal = document.getElementById('library-search')?.value.trim().toLowerCase() || '';
  const catVal = document.getElementById('filter-category')?.value || '';
  const langVal = document.getElementById('filter-language')?.value || '';
  const cntVal = document.getElementById('filter-country')?.value || '';
  const playVal = document.getElementById('filter-playlist')?.value || '';
  const sortVal = document.getElementById('filter-sort')?.value || 'latest';

  filteredSongs = allSongs.filter(song => {
    // Search by Song Title, Artist Name, Album
    if (searchVal) {
      const titleMatch = (song.title || '').toLowerCase().includes(searchVal);
      const artistMatch = (song.artist || '').toLowerCase().includes(searchVal);
      const albumMatch = (song.album || '').toLowerCase().includes(searchVal);
      if (!titleMatch && !artistMatch && !albumMatch) return false;
    }

    if (catVal && song.category !== catVal) return false;
    if (langVal && song.language !== langVal) return false;
    if (cntVal && song.country !== cntVal) return false;
    if (playVal && song.playlist !== playVal) return false;

    return true;
  });

  // Sort Options: Latest Upload, Oldest Upload, A-Z, Z-A
  filteredSongs.sort((a, b) => {
    if (sortVal === 'latest') {
      return (b.uploadDate?.seconds || 0) - (a.uploadDate?.seconds || 0);
    } else if (sortVal === 'oldest') {
      return (a.uploadDate?.seconds || 0) - (b.uploadDate?.seconds || 0);
    } else if (sortVal === 'az') {
      return (a.title || '').localeCompare(b.title || '');
    } else if (sortVal === 'za') {
      return (b.title || '').localeCompare(a.title || '');
    }
    return 0;
  });

  currentPage = 1;
  renderLibraryTable();
}

/**
 * Render Paginated Table
 */
function renderLibraryTable() {
  const tbody = document.getElementById('library-table-body');
  const itemsSelect = document.getElementById('pagination-items-per-page');
  if (itemsSelect) itemsPerPage = parseInt(itemsSelect.value) || 25;

  if (!tbody) return;

  if (filteredSongs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="var(--text-subtle)"><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <p style="margin-top: 8px;">No matching tracks found.</p>
        </td>
      </tr>
    `;
    updatePaginationControls(0);
    return;
  }

  // Calculate Slice
  const totalItems = filteredSongs.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  if (currentPage > totalPages) currentPage = totalPages;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageSongs = filteredSongs.slice(startIndex, endIndex);

  tbody.innerHTML = pageSongs.map(song => {
    const songJson = JSON.stringify(song).replace(/'/g, "&apos;");

    return `
      <tr>
        <td>
          <img src="${song.imageUrl || 'images/logo.png'}" class="song-cover-thumb" alt="${escapeHtml(song.title)}">
        </td>
        <td>
          <div style="font-weight: 700; color: var(--text-main);">${escapeHtml(song.title)}</div>
          ${song.album ? `<div style="font-size: 0.775rem; color: var(--text-muted);">${escapeHtml(song.album)}</div>` : ''}
        </td>
        <td>${escapeHtml(song.artist || 'Unknown')}</td>
        <td><span class="pill-badge pill-purple">${escapeHtml(song.category || 'Music')}</span></td>
        <td><span class="pill-badge">${escapeHtml(song.language || 'N/A')}</span></td>
        <td>${escapeHtml(song.country || 'Global')}</td>
        <td><span class="pill-badge pill-blue">${escapeHtml(song.playlist || 'Single')}</span></td>
        <td>${formatDuration(song.duration)}</td>
        <td><span style="font-size: 0.8rem; font-weight: 600; color: var(--primary-pink);">${getRelativeTime(song.uploadDate)}</span></td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button class="btn btn-sm btn-primary" onclick='playTrackPreview(${songJson})' title="Play Preview">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#FFF"><path d="M8 5v14l11-7z"/></svg>
            </button>
            <button class="btn btn-sm btn-glass" onclick="openEditSongModal('${song.id}')" title="Edit Song">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            </button>
            <button class="btn btn-sm btn-glass" onclick="copyDocumentId('${song.id}')" title="Copy Document ID">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
            </button>
            <button class="btn btn-sm btn-danger" onclick="openDeleteConfirmModal('${song.id}', '${escapeHtml(song.title)}')" title="Delete Song">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  updatePaginationControls(totalItems);
}

function updatePaginationControls(totalItems) {
  const info = document.getElementById('pagination-info');
  const prevBtn = document.getElementById('btn-prev-page');
  const nextBtn = document.getElementById('btn-next-page');

  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const start = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const end = Math.min(currentPage * itemsPerPage, totalItems);

  if (info) info.textContent = `Showing ${start}-${end} of ${totalItems} tracks (Page ${currentPage} of ${totalPages})`;

  if (prevBtn) prevBtn.disabled = (currentPage <= 1);
  if (nextBtn) nextBtn.disabled = (currentPage >= totalPages);
}

function changePage(direction) {
  const totalPages = Math.ceil(filteredSongs.length / itemsPerPage);
  currentPage += direction;
  if (currentPage < 1) currentPage = 1;
  if (currentPage > totalPages) currentPage = totalPages;
  renderLibraryTable();
}

/**
 * Copy Firebase Document ID to Clipboard
 */
function copyDocumentId(docId) {
  if (navigator.clipboard) {
    navigator.clipboard.writeText(docId).then(() => {
      showToast('Document ID copied to clipboard!', 'success');
    }).catch(err => {
      showToast('Doc ID: ' + docId, 'success');
    });
  } else {
    showToast('Doc ID: ' + docId, 'success');
  }
}

/**
 * Edit & Delete Modals
 */
function openEditSongModal(songId) {
  const song = allSongs.find(s => s.id === songId);
  if (!song) return;

  editSongTargetId = songId;
  document.getElementById('edit-song-title').value = song.title || '';
  document.getElementById('edit-song-artist').value = song.artist || '';
  document.getElementById('edit-song-album').value = song.album || '';
  document.getElementById('edit-song-desc').value = song.description || '';

  const modal = document.getElementById('modal-edit-song');
  if (modal) modal.classList.add('active');
}

function closeEditSongModal() {
  document.getElementById('modal-edit-song')?.classList.remove('active');
  editSongTargetId = null;
}

async function saveEditSong() {
  if (!editSongTargetId) return;

  const title = document.getElementById('edit-song-title')?.value.trim();
  const artist = document.getElementById('edit-song-artist')?.value.trim();
  const album = document.getElementById('edit-song-album')?.value.trim();
  const description = document.getElementById('edit-song-desc')?.value.trim();

  if (!title || !artist) {
    showToast('Title and Artist are required!', 'error');
    return;
  }

  try {
    if (db) {
      await db.collection("songs").doc(editSongTargetId).update({ title, artist, album, description });
    }
    showToast('✔ Song Details Updated', 'success');
    closeEditSongModal();
    await fetchSongsFromFirestore();
  } catch (err) {
    showToast('Failed to update song: ' + err.message, 'error');
  }
}

function openDeleteConfirmModal(songId, title) {
  deleteSongTargetId = songId;
  const text = document.getElementById('delete-song-title-text');
  if (text) text.textContent = `"${title}"`;
  document.getElementById('modal-delete-confirm')?.classList.add('active');
}

function closeDeleteConfirmModal() {
  document.getElementById('modal-delete-confirm')?.classList.remove('active');
  deleteSongTargetId = null;
}

async function confirmDeleteSong() {
  if (!deleteSongTargetId) return;

  try {
    if (db) {
      await db.collection("songs").doc(deleteSongTargetId).delete();
    }
    showToast('✔ Track Deleted Successfully', 'success');
    closeDeleteConfirmModal();
  } catch (err) {
    showToast('❌ Failed to delete track: ' + err.message, 'error');
  }
}
