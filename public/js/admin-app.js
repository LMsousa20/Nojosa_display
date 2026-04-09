let cropper = null;
let currentUploadType = 'promo';
let currentSettings = null;

async function init() {
    await loadSettings();
    await loadPromos();
}

async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.success) {
            currentSettings = data.settings;
            fillForms(data.settings);
        }
    } catch (err) {}
}

function fillForms(settings) {
    const dbForm = document.getElementById('db-form');
    Object.keys(settings.db).forEach(key => {
        const input = dbForm.querySelector(`[name="${key}"]`);
        if (input) input.value = settings.db[key];
    });

    const colorsForm = document.getElementById('colors-form');
    Object.keys(settings.colors).forEach(key => {
        const input = colorsForm.querySelector(`[name="${key}"]`);
        if (input) input.value = settings.colors[key];
    });
}

document.getElementById('db-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    currentSettings.db = Object.fromEntries(formData.entries());
    await saveSettings();
});

document.getElementById('colors-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    currentSettings.colors = Object.fromEntries(formData.entries());
    await saveSettings();
});

async function saveSettings() {
    const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentSettings)
    });
    if (res.ok) alert('Salvo com sucesso!');
}

async function loadPromos() {
    const res = await fetch('/api/promocoes');
    const data = await res.json();
    const list = document.getElementById('promo-list');
    list.innerHTML = data.images.map(img => `
        <div class="relative group bg-black rounded-corp overflow-hidden aspect-video border border-white/10">
            <img src="${img}" class="w-full h-full object-cover">
            <button onclick="deletePromo('${img.split('/').pop()}')" class="absolute inset-0 bg-red-600/80 opacity-0 group-hover:opacity-100 transition-all font-bold">EXCLUIR</button>
        </div>
    `).join('');
}

async function deletePromo(filename) {
    if (!confirm('Deseja excluir?')) return;
    await fetch(`/api/promocoes/${filename}`, { method: 'DELETE' });
    loadPromos();
}

function prepareCrop(input, type) {
    if (input.files && input.files[0]) {
        currentUploadType = type;
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('cropper-modal').classList.remove('hidden');
            const img = document.getElementById('cropper-img');
            img.src = e.target.result;
            if (cropper) cropper.destroy();
            cropper = new Cropper(img, { aspectRatio: type === 'logo' ? NaN : 1.777, viewMode: 1 });
        };
        reader.readAsDataURL(input.files[0]);
    }
}

document.getElementById('save-crop-btn').addEventListener('click', () => {
    const canvas = cropper.getCroppedCanvas({ maxWidth: 1920 });
    canvas.toBlob(async (blob) => {
        const formData = new FormData();
        formData.append('image', blob, 'image.png');
        await fetch(`/api/upload/${currentUploadType}`, { method: 'POST', body: formData });
        closeCropper();
        if (currentUploadType === 'logo') document.getElementById('logo-preview').src = '/logo.png?t=' + Date.now();
        else loadPromos();
    }, 'image/png');
});

function closeCropper() {
    document.getElementById('cropper-modal').classList.add('hidden');
}

function switchTab(tab) {
    document.querySelectorAll('section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`tab-${tab}`).classList.remove('hidden');
    document.querySelectorAll('nav button').forEach(b => {
        b.classList.remove('tab-active');
        b.classList.add('tab-inactive');
    });
    document.getElementById(`btn-${tab}`).classList.replace('tab-inactive', 'tab-active');
}

init();
window.switchTab = switchTab;
window.prepareCrop = prepareCrop;
window.deletePromo = deletePromo;
window.closeCropper = closeCropper;
