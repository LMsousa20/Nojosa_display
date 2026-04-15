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

// Listener para formulário de avaliação e evento de mudança de tipo
const avaliacaoConfigForm = document.getElementById('avaliacao-config-form');
if (avaliacaoConfigForm) {
    avaliacaoConfigForm.addEventListener('submit', saveAvaliacaoConfig);
}

const configTipo = document.getElementById('config-tipo');
if (configTipo) {
    configTipo.addEventListener('change', (e) => {
        const container = document.getElementById('url-qr-container');
        const urlInput = document.getElementById('config-url-qr');
        
        if (e.target.value === 'QRCODE') {
            container.classList.remove('hidden');
            if (urlInput.value) {
                generateQRCodePreview(urlInput.value);
            }
        } else {
            container.classList.add('hidden');
        }
    });
}

const urlQRInput = document.getElementById('config-url-qr');
if (urlQRInput) {
    urlQRInput.addEventListener('input', (e) => {
        if (e.target.value) {
            generateQRCodePreview(e.target.value);
        }
    });
}

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
    
    // Carregar avaliações ao abrir a aba
    if (tab === 'avaliacoes') {
        loadAvaliacoes();
        loadAvaliacaoConfig();
    }
}

// ====== FUNÇÕES DE AVALIAÇÃO ======
async function loadAvaliacaoConfig() {
    try {
        const res = await fetch('/api/avaliacao-config');
        const data = await res.json();
        if (data.success && data.config) {
            const config = data.config;
            document.getElementById('config-ativa').value = config.ativa ? 'true' : 'false';
            document.getElementById('config-tipo').value = config.tipo || 'ESTRELA';
            document.getElementById('config-url-qr').value = config.url_qr_code || '';
            
            // Mostrar/ocultar campo de URL baseado no tipo
            if (config.tipo === 'QRCODE') {
                document.getElementById('url-qr-container').classList.remove('hidden');
                if (config.url_qr_code) generateQRCodePreview(config.url_qr_code);
            } else {
                document.getElementById('url-qr-container').classList.add('hidden');
            }
        }
    } catch (err) {
        console.error('Erro ao carregar configuração:', err);
    }
}

async function saveAvaliacaoConfig(e) {
    e.preventDefault();
    const ativa = document.getElementById('config-ativa').value === 'true';
    const tipo = document.getElementById('config-tipo').value;
    const url_qr_code = document.getElementById('config-url-qr').value;

    const res = await fetch('/api/avaliacao-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ativa, tipo, url_qr_code })
    });

    if (res.ok) {
        alert('Configuração de avaliação salva!');
    }
}

function generateQRCodePreview(url) {
    const container = document.getElementById('qr-preview');
    container.innerHTML = '';
    if (!url) return;
    
    new QRCode(container, {
        text: url,
        width: 128,
        height: 128,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

async function loadAvaliacoes() {
    const dataInicio = document.getElementById('filter-data-inicio').value;
    const dataFim = document.getElementById('filter-data-fim').value;
    const operadorId = document.getElementById('filter-operador').value;

    const params = new URLSearchParams();
    if (dataInicio) params.append('dataInicio', dataInicio);
    if (dataFim) params.append('dataFim', dataFim);
    if (operadorId) params.append('operadorId', operadorId);

    try {
        const res = await fetch(`/api/avaliacoes?${params}`);
        const data = await res.json();
        
        const list = document.getElementById('avaliacoes-list');
        if (!data.success || !data.avaliacoes || data.avaliacoes.length === 0) {
            list.innerHTML = '<p class="text-gray-500">Nenhuma avaliação encontrada</p>';
            return;
        }

        list.innerHTML = data.avaliacoes.map(av => `
            <div class="p-3 bg-black/40 rounded-corp border border-white/10 flex justify-between items-center">
                <div>
                    <p class="text-white font-bold">Venda: ${av.venda_id}</p>
                    <p class="text-gray-400 text-sm">Op: ${av.operador_id} | Caixa: ${av.caixa_id}</p>
                    <p class="text-gray-300 text-xs">${av.data} ${av.hora}</p>
                </div>
                <div class="text-right">
                    <p class="text-yellow-400 font-bold">${av.tipo}</p>
                    ${av.nota ? `<p class="text-white">⭐ ${av.nota}/5</p>` : '<p class="text-gray-500">-</p>'}
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Erro ao carregar avaliações:', err);
        document.getElementById('avaliacoes-list').innerHTML = '<p class="text-red-500">Erro ao carregar</p>';
    }
}

function openQRModal() {
    const urlQR = document.getElementById('config-url-qr').value;
    if (!urlQR) {
        alert('Configure uma URL para o QR Code primeiro');
        return;
    }
    
    const container = document.getElementById('qr-modal-display');
    container.innerHTML = '';
    new QRCode(container, {
        text: urlQR,
        width: 400,
        height: 400,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
    
    document.getElementById('qr-modal').classList.remove('hidden');
}

function closeQRModal() {
    document.getElementById('qr-modal').classList.add('hidden');
}

async function exportAvaliacoesCSV() {
    try {
        const res = await fetch('/api/avaliacoes');
        const data = await res.json();
        
        if (!data.success || !data.avaliacoes || data.avaliacoes.length === 0) {
            alert('Nenhuma avaliação para exportar');
            return;
        }

        // Preparar cabeçalho CSV
        const headers = ['ID Venda', 'Caixa', 'Operador', 'Nota', 'Tipo', 'Data', 'Hora'];
        const rows = data.avaliacoes.map(av => [
            av.venda_id,
            av.caixa_id,
            av.operador_id,
            av.nota || '-',
            av.tipo,
            av.data,
            av.hora
        ]);

        // Criar CSV
        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `avaliacoes_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (err) {
        console.error('Erro ao exportar CSV:', err);
        alert('Erro ao exportar avaliações');
    }
}

init();
window.switchTab = switchTab;
window.prepareCrop = prepareCrop;
window.deletePromo = deletePromo;
window.closeCropper = closeCropper;
window.loadAvaliacoes = loadAvaliacoes;
window.saveAvaliacaoConfig = saveAvaliacaoConfig;
window.openOrRefreshDisplay = function() {
    // Tenta abrir ou focar a janela existente do display
    const displayWindow = window.open('/', 'display-window', 'width=1920,height=1080');
    if (displayWindow) {
        displayWindow.location.reload();
        displayWindow.focus();
    }
};
window.openQRModal = openQRModal;
window.closeQRModal = closeQRModal;
window.exportAvaliacoesCSV = exportAvaliacoesCSV;
