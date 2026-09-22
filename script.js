let signers = [
  {
    name: 'Mickey Mantle',
    category: 'Sports',
    subcategory: 'Baseball',
    status: 'good',
    response: 'Often responds',
    location: 'New York, NY',
    note: 'Classic Hall of Famer with friendly fan mail practices and strong collector visibility.',
    initials: 'MM',
    score: 82,
    reports: 14,
    wait: '18–35 days',
    verified: 'Sample record · verify before use'
  },
  {
    name: 'Tom Hanks',
    category: 'Film & TV',
    subcategory: 'Actors',
    status: 'mid',
    response: 'Moderate',
    location: 'Los Angeles, CA',
    note: 'High-interest actor with a steady return history and a strong collector audience.',
    initials: 'TH',
    score: 68,
    reports: 9,
    wait: '30–90 days',
    verified: 'Sample record · verify before use'
  },
  {
    name: 'Bruce Springsteen',
    category: 'Music',
    subcategory: 'Musicians',
    status: 'good',
    response: 'Often responds',
    location: 'Asbury Park, NJ',
    note: 'A legendary favorite among collectors who value well-prepared, respectful mail requests.',
    initials: 'BS',
    score: 77,
    reports: 11,
    wait: '21–60 days',
    verified: 'Sample record · verify before use'
  },
  {
    name: 'H.G. Wells',
    category: 'Arts & Authors',
    subcategory: 'Authors',
    status: 'low',
    response: 'Slow response',
    location: 'London, UK',
    note: 'Great for literary collectors, though response times vary and patience is required.',
    initials: 'HW',
    score: 49,
    reports: 5,
    wait: '60+ days',
    verified: 'Sample record · verify before use'
  }
];

function mapRemoteSigner(record) {
  const statusMap = { often: 'good', moderate: 'mid', slow: 'low', unverified: 'low' };
  const responseMap = { often: 'Often responds', moderate: 'Moderate', slow: 'Slow response', unverified: 'Unverified' };
  return {
    name: record.name,
    category: record.category,
    subcategory: record.subcategory,
    status: statusMap[record.response_status] || 'low',
    response: responseMap[record.response_status] || 'Unverified',
    location: record.public_contact_label || 'Public contact source',
    note: record.note || 'Published community record.',
    initials: record.name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(),
    score: record.signal_score || 0,
    reports: record.report_count || 0,
    wait: record.typical_wait_max ? `${record.typical_wait_min || 0}–${record.typical_wait_max} days` : 'Unverified',
    verified: record.public_contact_verified_at ? `Verified ${record.public_contact_verified_at}` : 'Published record'
  };
}

async function loadPublishedSigners() {
  if (!window.TTMBackend || !window.TTMBackend.enabled) return;
  try {
    const records = await window.TTMBackend.getPublishedSigners();
    if (records.length) signers = records.map(mapRemoteSigner);
  } catch (error) {
    console.warn('Live signer records unavailable; showing prototype records.', error);
  }
}

function renderSigners() {
  const list = document.getElementById('signerList');
  const categoryFilter = document.getElementById('categoryFilter');
  const statusFilter = document.getElementById('statusFilter');
  const searchInput = document.querySelector('input[type="search"]');
  if (!list) return;

  const category = categoryFilter ? categoryFilter.value : 'All';
  const status = statusFilter ? statusFilter.value : 'All';
  const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

  const filtered = signers.filter((signer) => {
    const matchesCategory = category === 'All' || signer.category === category || signer.subcategory === category;
    const matchesStatus = status === 'All' || signer.response === status;
    const matchesQuery = !query || signer.name.toLowerCase().includes(query) || signer.category.toLowerCase().includes(query) || signer.subcategory.toLowerCase().includes(query);
    return matchesCategory && matchesStatus && matchesQuery;
  });

  list.innerHTML = filtered.map((signer) => `
    <article class="signer-card">
      <div class="signer-head">
        <div class="avatar">${signer.initials}</div>
        <span class="status ${signer.status}">${signer.response}</span>
      </div>
      <h3>${signer.name}</h3>
      <div class="meta">
        <span>${signer.category}</span>
        <span>•</span>
        <span>${signer.subcategory}</span>
        <span>•</span>
        <span>${signer.location}</span>
      </div>
      <p>${signer.note}</p>
      <div class="signal-score">
        <span><strong>${signer.score}</strong> Signal</span>
        <span>${signer.reports} reports · ${signer.wait}</span>
      </div>
      <div class="contact">
        <span>${signer.verified}</span>
        <a href="profile.html?signer=${encodeURIComponent(signer.name)}">Open profile →</a>
      </div>
    </article>
  `).join('') || '<div class="empty-state"><strong>No signers match those filters.</strong><span>Try a broader category or clear the search.</span></div>';
}

function setYear() {
  const yearTarget = document.getElementById('year');
  if (yearTarget) yearTarget.textContent = new Date().getFullYear();
}

document.addEventListener('DOMContentLoaded', async () => {
  setYear();
  const categoryFilter = document.getElementById('categoryFilter');
  const statusFilter = document.getElementById('statusFilter');
  const searchInput = document.querySelector('input[type="search"]');

  if (categoryFilter) {
    categoryFilter.addEventListener('change', renderSigners);
  }
  if (statusFilter) {
    statusFilter.addEventListener('change', renderSigners);
  }
  if (searchInput) {
    searchInput.addEventListener('input', renderSigners);
  }

  await loadPublishedSigners();
  renderSigners();
  renderProfile();
  setupMission();
});

function renderProfile() {
  const profile = document.getElementById('profileContent');
  if (!profile) return;
  const requestedName = new URLSearchParams(window.location.search).get('signer');
  const signer = signers.find((item) => item.name === requestedName);
  if (!signer) {
    profile.innerHTML = '<div class="empty-state"><strong>Signer profile not found.</strong><span>Return to the directory and choose a signer from the current catalog.</span><a class="button" href="directory.html">Back to directory</a></div>';
    return;
  }
  profile.innerHTML = `
    <div class="profile-heading">
      <div class="avatar avatar-large">${signer.initials}</div>
      <div><p class="eyebrow">${signer.category} · ${signer.subcategory} · Sample profile</p><h1>${signer.name}</h1><p>${signer.note}</p></div>
    </div>
    <div class="profile-grid">
      <div class="card profile-panel">
        <span class="profile-label">Signal Score</span>
        <strong class="score-display">${signer.score}<small>/100</small></strong>
        <p>Transparent sample score based on source freshness, report volume, and response consistency.</p>
        <div class="score-meter"><span style="width: ${signer.score}%"></span></div>
        <div class="profile-facts"><span><b>${signer.reports}</b> reports</span><span><b>${signer.wait}</b> typical wait</span><span><b>${signer.response}</b> current status</span></div>
      </div>
      <div class="card profile-panel">
        <span class="profile-label">Before you send</span>
        <ul class="mission-list"><li>Confirm the public contact source.</li><li>Use a respectful, concise request.</li><li>Include a return envelope when appropriate.</li><li>Never send private or irreplaceable items.</li></ul>
        <a class="button" href="mission.html?signer=${encodeURIComponent(signer.name)}">Start Request Mission</a>
      </div>
    </div>
    <div class="profile-source"><strong>Source status:</strong> ${signer.verified}. This prototype contains synthetic records and is not a live address directory.</div>
  `;
}

function setupMission() {
  const form = document.getElementById('missionForm');
  if (!form) return;
  const signer = new URLSearchParams(window.location.search).get('signer') || 'your selected signer';
  const signerTarget = document.getElementById('missionSigner');
  const storageKey = `ttm-mission:${signer}`;
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch (error) {
    localStorage.removeItem(storageKey);
  }
  if (signerTarget) signerTarget.textContent = signer;
  form.elements.signer.value = signer;
  ['item', 'note', 'status'].forEach((field) => {
    if (saved[field] && form.elements[field]) form.elements[field].value = saved[field];
  });
  form.addEventListener('input', () => {
    localStorage.setItem(storageKey, JSON.stringify({
      signer: form.elements.signer.value,
      item: form.elements.item.value,
      note: form.elements.note.value,
      status: form.elements.status.value
    }));
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const mission = {
      signer: form.elements.signer.value,
      item: form.elements.item.value,
      note: form.elements.note.value,
      status: form.elements.status.value
    };
    localStorage.setItem(storageKey, JSON.stringify(mission));
    if (window.TTMBackend && window.TTMBackend.enabled) {
      window.TTMBackend.saveMission({
        item_type: mission.item,
        note: mission.note,
        status: mission.status
      }).catch((error) => console.warn('Mission saved locally; remote save unavailable.', error));
    }
    const confirmation = document.getElementById('missionConfirmation');
    if (confirmation) confirmation.hidden = false;
  });
}
