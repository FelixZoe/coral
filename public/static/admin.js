// ========================================
// ADMIN PANEL — Frontend Logic (with i18n)
// ========================================
(() => {
  'use strict';

  const D = window.__DATA__ || { websites: [], repos: [], files: [], settings: {}, lang: 'zh' };
  let websites = [...D.websites];
  let repos = [...D.repos];
  let settings = { ...D.settings };
  const lang = D.lang || 'zh';

  // === i18n strings ===
  const i = {
    profileSaved: lang === 'zh' ? '个人信息已保存!' : 'Profile saved!',
    websitesSaved: lang === 'zh' ? '网站已保存!' : 'Websites saved!',
    reposSaved: lang === 'zh' ? '仓库已保存!' : 'Repos saved!',
    uploaded: lang === 'zh' ? '上传成功!' : 'uploaded!',
    uploadFailed: lang === 'zh' ? '上传失败' : 'Upload failed',
    linkAdded: lang === 'zh' ? '链接已添加!' : 'Link added!',
    fileDeleted: lang === 'zh' ? '文件已删除!' : 'File deleted!',
    settingsSaved: lang === 'zh' ? '设置已保存! 刷新中...' : 'Settings saved! Refreshing...',
    pwUpdated: lang === 'zh' ? '密码已更新!' : 'Password updated!',
    fillBoth: lang === 'zh' ? '请填写两个字段' : 'Please fill both fields',
    deleteWebsite: lang === 'zh' ? '确定删除此网站?' : 'Delete this website?',
    deleteRepo: lang === 'zh' ? '确定删除此仓库?' : 'Delete this repo?',
    deleteFile: lang === 'zh' ? '确定删除此文件?' : 'Delete this file?',
    addWebsite: lang === 'zh' ? '添加网站' : 'Add Website',
    editWebsite: lang === 'zh' ? '编辑网站' : 'Edit Website',
    addRepo: lang === 'zh' ? '添加仓库' : 'Add Repo',
    editRepo: lang === 'zh' ? '编辑仓库' : 'Edit Repo',
    addExtLink: lang === 'zh' ? '添加外部链接' : 'Add External Link',
    uploading: lang === 'zh' ? '上传中' : 'Uploading',
    // Form labels
    lblTitle: lang === 'zh' ? '标题' : 'Title',
    lblUrl: lang === 'zh' ? 'URL' : 'URL',
    lblDesc: lang === 'zh' ? '描述' : 'Description',
    lblTags: lang === 'zh' ? '标签(逗号分隔)' : 'Tags (comma sep.)',
    lblColor: lang === 'zh' ? '颜色' : 'Color',
    lblIcon: lang === 'zh' ? '图标' : 'Icon',
    lblName: lang === 'zh' ? '名称' : 'Name',
    lblLang: lang === 'zh' ? '语言' : 'Language',
    lblStars: lang === 'zh' ? '星标' : 'Stars',
    lblForks: lang === 'zh' ? '分支' : 'Forks',
    lblDisplayName: lang === 'zh' ? '显示名称' : 'Display Name',
    lblDownloadUrl: lang === 'zh' ? '下载链接' : 'Download URL',
    lblFileName: lang === 'zh' ? '文件名' : 'File Name',
    lblFileSize: lang === 'zh' ? '文件大小(字节)' : 'File Size (bytes)',
    lblMimeType: lang === 'zh' ? 'MIME 类型' : 'MIME Type',
  };

  // === Helpers ===
  function toast(msg, type = 'success') {
    const c = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `adm-toast adm-toast-${type}`;
    t.innerHTML = `<i class="fa-solid fa-${type === 'success' ? 'check' : 'triangle-exclamation'}"></i> ${msg}`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
  }

  async function api(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  }

  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  // === Tab Navigation ===
  document.querySelectorAll('.adm-nav-item[data-tab]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.adm-nav-item[data-tab]').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.adm-panel').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      const panel = document.getElementById('panel-' + item.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });

  // === Modal ===
  const overlay = document.getElementById('modalOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const modalBody = document.getElementById('modalBody');
  const modalSave = document.getElementById('modalSave');
  let onModalSave = null;

  function openModal(title, html, onSave) {
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    onModalSave = onSave;
    overlay.style.display = 'flex';
  }

  function closeModal() {
    overlay.style.display = 'none';
    onModalSave = null;
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  modalSave.addEventListener('click', () => { if (onModalSave) onModalSave(); });

  // === Profile ===
  document.getElementById('saveProfile').addEventListener('click', async () => {
    const data = {
      name: document.getElementById('pf-name').value,
      tagline: document.getElementById('pf-tagline').value,
      avatar: document.getElementById('pf-avatar').value,
      bio: document.getElementById('pf-bio').value,
      location: document.getElementById('pf-location').value,
      email: document.getElementById('pf-email').value,
      status: document.getElementById('pf-status').value,
      currentlyReading: document.getElementById('pf-reading').value,
      quote: document.getElementById('pf-quote').value,
      quoteAuthor: document.getElementById('pf-quoteAuthor').value,
      socials: {
        github: document.getElementById('pf-github').value,
        twitter: document.getElementById('pf-twitter').value,
      }
    };
    try {
      await api('/admin/api/profile', data);
      toast(i.profileSaved);
    } catch (e) { toast(e.message, 'error'); }
  });

  // === Websites CRUD ===
  const ICON_OPTIONS = [
    'fa-solid fa-globe', 'fa-solid fa-cloud', 'fa-solid fa-code', 'fa-solid fa-wand-magic-sparkles',
    'fa-solid fa-camera-retro', 'fa-solid fa-palette', 'fa-solid fa-rocket', 'fa-solid fa-bolt',
    'fa-solid fa-cube', 'fa-solid fa-chart-line', 'fa-solid fa-shield-halved', 'fa-solid fa-store',
    'fa-solid fa-music', 'fa-solid fa-gamepad', 'fa-solid fa-robot', 'fa-solid fa-book',
  ];

  function websiteFormHTML(w = {}) {
    const iconOpts = ICON_OPTIONS.map(ic => `<option value="${ic}" ${ic === (w.icon || 'fa-solid fa-globe') ? 'selected' : ''}>${ic.split(' ').pop()}</option>`).join('');
    return `<div class="adm-form-grid">
      <div class="adm-field"><label>${i.lblTitle}</label><input id="mf-title" value="${esc(w.title || '')}" /></div>
      <div class="adm-field"><label>${i.lblUrl}</label><input id="mf-url" value="${esc(w.url || '')}" /></div>
      <div class="adm-field adm-field-full"><label>${i.lblDesc}</label><textarea id="mf-desc" rows="2">${esc(w.description || '')}</textarea></div>
      <div class="adm-field"><label>${i.lblTags}</label><input id="mf-tags" value="${esc(w.tags || '')}" /></div>
      <div class="adm-field"><label>${i.lblColor}</label><input id="mf-color" type="color" value="${w.color || '#E8A838'}" /></div>
      <div class="adm-field"><label>${i.lblIcon}</label><select id="mf-icon">${iconOpts}</select></div>
    </div>`;
  }

  function getWebsiteFromModal() {
    return {
      title: document.getElementById('mf-title').value,
      url: document.getElementById('mf-url').value,
      description: document.getElementById('mf-desc').value,
      tags: document.getElementById('mf-tags').value,
      color: document.getElementById('mf-color').value,
      icon: document.getElementById('mf-icon').value,
    };
  }

  async function saveWebsites() {
    try {
      await api('/admin/api/websites', websites);
      toast(i.websitesSaved);
      renderWebsites();
      closeModal();
    } catch (e) { toast(e.message, 'error'); }
  }

  function renderWebsites() {
    const list = document.getElementById('websitesList');
    list.innerHTML = websites.map(w => `
      <div class="adm-item" data-id="${w.id}">
        <div class="adm-item-icon" style="color:${w.color || '#E8A838'}"><i class="${w.icon || 'fa-solid fa-globe'}"></i></div>
        <div class="adm-item-body"><strong>${esc(w.title)}</strong><span class="adm-item-sub">${esc(w.description)}</span></div>
        <div class="adm-item-actions">
          <button class="adm-btn-icon edit-website" title="${i.editWebsite}"><i class="fa-solid fa-pen"></i></button>
          <button class="adm-btn-icon adm-btn-icon-danger delete-website" title="${lang === 'zh' ? '删除' : 'Delete'}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('');
    bindWebsiteEvents();
  }

  function bindWebsiteEvents() {
    document.querySelectorAll('.edit-website').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.adm-item').dataset.id;
        const w = websites.find(x => x.id === id);
        if (!w) return;
        openModal(i.editWebsite, websiteFormHTML(w), () => {
          Object.assign(w, getWebsiteFromModal());
          saveWebsites();
        });
      });
    });
    document.querySelectorAll('.delete-website').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.adm-item').dataset.id;
        if (!confirm(i.deleteWebsite)) return;
        websites = websites.filter(x => x.id !== id);
        saveWebsites();
      });
    });
  }

  document.getElementById('addWebsite').addEventListener('click', () => {
    openModal(i.addWebsite, websiteFormHTML(), () => {
      websites.push({ id: uid(), ...getWebsiteFromModal() });
      saveWebsites();
    });
  });
  bindWebsiteEvents();

  // === Repos CRUD ===
  function repoFormHTML(r = {}) {
    return `<div class="adm-form-grid">
      <div class="adm-field"><label>${i.lblName}</label><input id="mr-name" value="${esc(r.name || '')}" /></div>
      <div class="adm-field"><label>${i.lblUrl}</label><input id="mr-url" value="${esc(r.url || '')}" /></div>
      <div class="adm-field adm-field-full"><label>${i.lblDesc}</label><textarea id="mr-desc" rows="2">${esc(r.description || '')}</textarea></div>
      <div class="adm-field"><label>${i.lblLang}</label><input id="mr-lang" value="${esc(r.language || '')}" /></div>
      <div class="adm-field"><label>${i.lblStars}</label><input id="mr-stars" type="number" value="${r.stars || 0}" /></div>
      <div class="adm-field"><label>${i.lblForks}</label><input id="mr-forks" type="number" value="${r.forks || 0}" /></div>
    </div>`;
  }

  function getRepoFromModal() {
    return {
      name: document.getElementById('mr-name').value,
      url: document.getElementById('mr-url').value,
      description: document.getElementById('mr-desc').value,
      language: document.getElementById('mr-lang').value,
      stars: parseInt(document.getElementById('mr-stars').value) || 0,
      forks: parseInt(document.getElementById('mr-forks').value) || 0,
    };
  }

  async function saveRepos() {
    try {
      await api('/admin/api/repos', repos);
      toast(i.reposSaved);
      renderRepos();
      closeModal();
    } catch (e) { toast(e.message, 'error'); }
  }

  function renderRepos() {
    const list = document.getElementById('reposList');
    list.innerHTML = repos.map(r => `
      <div class="adm-item" data-id="${r.id}">
        <div class="adm-item-icon"><i class="fa-solid fa-book-bookmark"></i></div>
        <div class="adm-item-body"><strong>${esc(r.name)}</strong><span class="adm-item-sub">${esc(r.description)}</span></div>
        <div class="adm-item-actions">
          <button class="adm-btn-icon edit-repo" title="${i.editRepo}"><i class="fa-solid fa-pen"></i></button>
          <button class="adm-btn-icon adm-btn-icon-danger delete-repo" title="${lang === 'zh' ? '删除' : 'Delete'}"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>`).join('');
    bindRepoEvents();
  }

  function bindRepoEvents() {
    document.querySelectorAll('.edit-repo').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.adm-item').dataset.id;
        const r = repos.find(x => x.id === id);
        if (!r) return;
        openModal(i.editRepo, repoFormHTML(r), () => {
          Object.assign(r, getRepoFromModal());
          saveRepos();
        });
      });
    });
    document.querySelectorAll('.delete-repo').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.closest('.adm-item').dataset.id;
        if (!confirm(i.deleteRepo)) return;
        repos = repos.filter(x => x.id !== id);
        saveRepos();
      });
    });
  }

  document.getElementById('addRepo').addEventListener('click', () => {
    openModal(i.addRepo, repoFormHTML(), () => {
      repos.push({ id: uid(), ...getRepoFromModal() });
      saveRepos();
    });
  });
  bindRepoEvents();

  // === File Upload (KV mode) ===
  const uploadZone = document.getElementById('uploadZone');
  const fileInput = document.getElementById('fileInput');
  const uploadProgress = document.getElementById('uploadProgress');
  const progressFill = document.getElementById('progressFill');
  const progressText = document.getElementById('progressText');

  if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('drag-over'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault(); uploadZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
    });
  }

  if (fileInput) {
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length) uploadFiles(fileInput.files);
      fileInput.value = '';
    });
  }

  async function uploadFiles(fileList) {
    for (const file of fileList) {
      uploadProgress.style.display = 'block';
      progressFill.style.width = '0%';
      progressText.textContent = `${i.uploading} ${file.name}...`;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('displayName', file.name);

      try {
        let p = 0;
        const iv = setInterval(() => { p = Math.min(p + Math.random() * 15, 85); progressFill.style.width = p + '%'; }, 300);
        const res = await fetch('/admin/api/upload', { method: 'POST', body: formData });
        clearInterval(iv);
        if (!res.ok) { const e = await res.json(); throw new Error(e.error || i.uploadFailed); }
        progressFill.style.width = '100%';
        progressText.textContent = `${file.name} ${i.uploaded}`;
        toast(`${file.name} ${i.uploaded}`);
        setTimeout(() => { uploadProgress.style.display = 'none'; }, 1500);
        setTimeout(() => location.reload(), 1800);
      } catch (e) {
        progressFill.style.width = '0%';
        progressText.textContent = `Error: ${e.message}`;
        toast(e.message, 'error');
      }
    }
  }

  // === Add Link File (External mode) ===
  const addLinkBtn = document.getElementById('addLinkFile');
  if (addLinkBtn) {
    addLinkBtn.addEventListener('click', () => {
      const html = `<div class="adm-form-grid">
        <div class="adm-field adm-field-full"><label>${i.lblDisplayName}</label><input id="lf-name" placeholder="${lang === 'zh' ? '我的简历 2025' : 'My Resume 2025'}" /></div>
        <div class="adm-field adm-field-full"><label>${i.lblDownloadUrl}</label><input id="lf-url" placeholder="https://drive.google.com/..." /></div>
        <div class="adm-field"><label>${i.lblFileName}</label><input id="lf-filename" placeholder="resume.pdf" /></div>
        <div class="adm-field"><label>${i.lblFileSize}</label><input id="lf-size" type="number" placeholder="0" /></div>
        <div class="adm-field adm-field-full"><label>${i.lblMimeType}</label><input id="lf-type" value="application/octet-stream" /></div>
      </div>`;
      openModal(i.addExtLink, html, async () => {
        try {
          await api('/admin/api/add-link', {
            displayName: document.getElementById('lf-name').value,
            originalName: document.getElementById('lf-filename').value,
            externalUrl: document.getElementById('lf-url').value,
            size: parseInt(document.getElementById('lf-size').value) || 0,
            type: document.getElementById('lf-type').value,
          });
          toast(i.linkAdded);
          closeModal();
          setTimeout(() => location.reload(), 800);
        } catch (e) { toast(e.message, 'error'); }
      });
    });
  }

  // === Delete File ===
  document.querySelectorAll('.delete-file').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.closest('.adm-item').dataset.key;
      if (!confirm(i.deleteFile)) return;
      try {
        await api('/admin/api/delete-file', { key });
        toast(i.fileDeleted);
        btn.closest('.adm-item').remove();
      } catch (e) { toast(e.message, 'error'); }
    });
  });

  // === Storage Settings ===
  const radioGroup = document.getElementById('storageModeGroup');
  if (radioGroup) {
    radioGroup.querySelectorAll('input[name="storageMode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        radioGroup.querySelectorAll('.adm-radio-card').forEach(c => c.classList.remove('active'));
        radio.closest('.adm-radio-card').classList.add('active');
      });
    });
  }

  document.getElementById('saveSettings')?.addEventListener('click', async () => {
    const mode = document.querySelector('input[name="storageMode"]:checked')?.value || 'kv';
    try {
      await api('/admin/api/settings', { ...settings, storageMode: mode });
      settings.storageMode = mode;
      toast(i.settingsSaved);
      setTimeout(() => location.reload(), 1000);
    } catch (e) { toast(e.message, 'error'); }
  });

  // === Change Password ===
  document.getElementById('changePw')?.addEventListener('click', async () => {
    const oldPw = document.getElementById('set-oldpw').value;
    const newPw = document.getElementById('set-newpw').value;
    if (!oldPw || !newPw) return toast(i.fillBoth, 'error');
    try {
      await api('/admin/api/password', { oldPassword: oldPw, newPassword: newPw });
      toast(i.pwUpdated);
      document.getElementById('set-oldpw').value = '';
      document.getElementById('set-newpw').value = '';
    } catch (e) { toast(e.message, 'error'); }
  });

})();
