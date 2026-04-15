let currentState = 'standby';
let promoImages = [];
let currentPromoIndex = 0;
let carouselInterval = null;
let lastItemsCount = 0;
let thankYouTimer = null;
let avaliacaoConfig = null;
let currentSaleData = { cod_pdv: null, seq_caixa: null, sequencial: null, cod_operador: null };

// Configurações de cores via Root
function applyColors(colors) {
    const root = document.documentElement;
    root.style.setProperty('--primary', colors.primary || '#1e293b');
    root.style.setProperty('--secondary', colors.secondary || '#334155');
    root.style.setProperty('--accent', colors.accent || '#3b82f6');
    root.style.setProperty('--text', colors.text || '#ffffff');
    root.style.setProperty('--bg-app', colors.bg_app || '#020617');
    root.style.setProperty('--bg-list', colors.bg_list || '#0f172a');
    root.style.setProperty('--bg-side', colors.bg_side || '#020617');
    root.style.setProperty('--text-total', colors.text_total || '#ffffff');

    document.body.style.backgroundColor = 'var(--bg-app)';
}

// Troca de Telas
function showScreen(screenId) {
    // Se estiver no modo agradecimento, não mudar para outras até o timer acabar
    if (currentState === 'obrigado' && screenId !== 'obrigado') return;
    if (currentState === screenId) return;

    console.log(`Estado: ${currentState} -> ${screenId}`);

    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(`screen-${screenId}`);
    if (target) target.classList.remove('hidden');

    currentState = screenId;

    // Resetar tela de obrigado quando sair dela
    if (screenId !== 'obrigado') {
        document.getElementById('thanks-section').classList.remove('hidden');
        document.getElementById('avaliacao-section').classList.add('hidden');
        document.getElementById('avaliacao-estrelas').classList.add('hidden');
        document.getElementById('avaliacao-qrcode').classList.add('hidden');
        document.getElementById('avaliacao-estrelas').innerHTML = `
            <p class="text-white text-5xl font-black mb-8">Como foi sua experiência?</p>
            <div class="flex justify-center gap-6">
                <button onclick="rateEstrela(1)" class="text-9xl transition-all hover:scale-125 cursor-pointer">⭐</button>
                <button onclick="rateEstrela(2)" class="text-9xl transition-all hover:scale-125 cursor-pointer">⭐</button>
                <button onclick="rateEstrela(3)" class="text-9xl transition-all hover:scale-125 cursor-pointer">⭐</button>
                <button onclick="rateEstrela(4)" class="text-9xl transition-all hover:scale-125 cursor-pointer">⭐</button>
                <button onclick="rateEstrela(5)" class="text-9xl transition-all hover:scale-125 cursor-pointer">⭐</button>
            </div>
        `;
    }

    if (screenId === 'standby') startCarousel();
    else stopCarousel();
}

// Polling de Status
async function pollStatus() {
    try {
        const res = await fetch('/api/status-venda');
        const data = await res.json();

        if (!data.success) {
            if (data.message && data.message.includes('não configurado')) showScreen('config');
            return;
        }

        if (data.venda_ativa) {
            // Extrai o nome da operadora do primeiro item (todos têm o mesmo)
            const operadora = data.itens && data.itens.length > 0 ? data.itens[0].operadora : null;
            
            // Armazenar dados da venda para avaliação
            if (data.itens && data.itens.length > 0) {
                // Dados virão do backend - as chaves vêm em minúsculo por causa de lowercase_keys
                currentSaleData = {
                    cod_pdv: data.venda_id?.split('|')[0] || null,
                    seq_caixa: data.venda_id?.split('|')[1] || null,
                    sequencial: data.venda_id?.split('|')[2] || null,
                    cod_operador: data.itens[0].cod_operador || null
                };
            }
            
            renderVendaAtiva(data.itens, data.total, operadora);
            showScreen('venda');
        } else if (data.concluida) {
            triggerThankYou();
        } else {
            if (currentState !== 'obrigado') showScreen('standby');
        }
    } catch (err) {
        console.error('Erro de conexão:', err);
        // Fallback: Manter standby em erro de conexão
        if (currentState !== 'venda') showScreen('standby');
    }
}

// Lógica de Venda
function renderVendaAtiva(itens, total, operadora) {
    const list = document.getElementById('items-list');
    const totalEl = document.getElementById('total-venda');
    const operadoraEl = document.getElementById('operadora-nome');

    if (itens.length === 0) return;

    // Exibir operadora uma única vez
    if (operadora) {
        operadoraEl.innerText = operadora;
    } else {
        operadoraEl.innerText = '---';
    }

    // Criar uma assinatura do estado atual para detectar mudanças instantâneas (incluindo cancelados)
    const currentStateSignature = JSON.stringify(itens);

    if (currentStateSignature !== lastItemsCount) {
        list.innerHTML = itens.map(item => {
            const isCancelado = item.cancelado === 'S';
            const statusClass = isCancelado ? 'line-through text-red-500 opacity-60' : 'text-white';

            return `
                <div class="item-row w-full px-8 py-6 border-b border-white/5 animate-pulse-once flex justify-between items-center ${isCancelado ? 'bg-red-500/10' : ''}">
                    <div class="w-1/2 overflow-hidden">
                        <p class="text-2xl font-black uppercase tracking-tight truncate ${statusClass}">${item.descricao}</p>
                        <p class="text-sm ${isCancelado ? 'text-red-400' : 'text-slate-500'} font-bold mt-1">CÓD: ${String(item.cod_produto).padStart(6, '0')}</p>
                    </div>
                    <div class="w-1/6 text-center font-black ${isCancelado ? 'text-red-400' : 'text-slate-200'} text-2xl">${item.quantidade}</div>
                    <div class="w-1/6 text-right font-bold ${isCancelado ? 'text-red-400' : 'text-slate-400'} text-xl">${formatCurrency(item.valor_unitario)}</div>
                    <div class="w-1/6 text-right font-black text-3xl ${statusClass}">${formatCurrency(item.subtotal)}</div>
                </div>
            `;
        }).join('');

        list.scrollTop = list.scrollHeight;
        lastItemsCount = currentStateSignature;
    }

    totalEl.innerText = formatCurrency(total);
}

// Lógica de Agradecimento
function triggerThankYou() {
    if (currentState === 'obrigado') return;

    showScreen('obrigado');
    lastItemsCount = 0; // Reset para próxima venda

    if (thankYouTimer) clearTimeout(thankYouTimer);
    
    // Mostrar avaliação se ativada
    if (avaliacaoConfig && avaliacaoConfig.ativa) {
        // Esperar 3 segundos antes de mostrar avaliação
        setTimeout(() => {
            document.getElementById('thanks-section').classList.add('hidden');
            document.getElementById('avaliacao-section').classList.remove('hidden');
            
            if (avaliacaoConfig.tipo === 'ESTRELA') {
                document.getElementById('avaliacao-estrelas').classList.remove('hidden');
                document.getElementById('avaliacao-qrcode').classList.add('hidden');
            } else if (avaliacaoConfig.tipo === 'QRCODE') {
                document.getElementById('avaliacao-estrelas').classList.add('hidden');
                document.getElementById('avaliacao-qrcode').classList.remove('hidden');
                displayQRCode(avaliacaoConfig.url_qr_code);
            }
        }, 5000);
        
        // Total de 10 segundos (3 de agradecimento + 7 de avaliação)
        thankYouTimer = setTimeout(() => {
            currentState = 'transition';
            showScreen('standby');
            pollStatus();
        }, 30000);
    } else {
        // Apenas 5 segundos se avaliação desativada
        thankYouTimer = setTimeout(() => {
            currentState = 'transition';
            showScreen('standby');
            pollStatus();
        }, 5000);
    }
}

// Carrossel
async function loadPromocoes() {
    try {
        const res = await fetch('/api/promocoes');
        const data = await res.json();
        promoImages = data.images;
        renderCarousel();
        // Se estivermos em standby ao carregar, inicia o slide
        if (currentState === 'standby') startCarousel();
    } catch (err) { }
}

function renderCarousel() {
    const container = document.getElementById('carousel-container');
    if (promoImages.length === 0) {
        container.innerHTML = `<div class="flex items-center justify-center h-full text-slate-700 text-3xl font-black">CARREGANDO...</div>`;
        return;
    }

    container.innerHTML = promoImages.map((img, idx) => `
        <img src="${img}" class="absolute inset-0 w-full h-full carousel-img ${idx === 0 ? 'opacity-100' : 'opacity-0'}" id="promo-${idx}">
    `).join('');
}

function startCarousel() {
    if (carouselInterval || promoImages.length < 2) return;
    carouselInterval = setInterval(() => {
        const next = (currentPromoIndex + 1) % promoImages.length;
        document.getElementById(`promo-${currentPromoIndex}`).style.opacity = '0';
        document.getElementById(`promo-${next}`).style.opacity = '1';
        currentPromoIndex = next;
    }, 4000);
}

function stopCarousel() {
    clearInterval(carouselInterval);
    carouselInterval = null;
}

// Configurações e Formatação
async function loadSettings() {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.settings) {
        const s = data.settings;
        applyColors(s.colors);
        if (s.db && s.db.store_name) {
            document.getElementById('store-name').innerText = s.db.store_name;
        }
    }
}

async function loadAvaliacaoConfig() {
    try {
        const res = await fetch('/api/avaliacao-config');
        const data = await res.json();
        if (data.success) {
            avaliacaoConfig = data.config;
        }
    } catch (err) {
        console.error('Erro ao carregar configuração de avaliação:', err);
    }
}

function displayQRCode(url) {
    const container = document.getElementById('qrcode-display');
    container.innerHTML = '';
    if (!url) return;
    
    new QRCode(container, {
        text: url,
        width: 256,
        height: 256,
        colorDark: '#000000',
        colorLight: '#ffffff',
        correctLevel: QRCode.CorrectLevel.H
    });
}

async function rateEstrela(nota) {
    // Desabilitar cliques enquanto salva
    document.querySelectorAll('#avaliacao-estrelas button').forEach(b => b.disabled = true);
    
    try {
        const res = await fetch('/api/avaliacao', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                venda_id: `${currentSaleData.cod_pdv}|${currentSaleData.seq_caixa}|${currentSaleData.sequencial}`,
                caixa_id: currentSaleData.seq_caixa,
                operador_id: currentSaleData.cod_operador,
                nota: nota,
                tipo: 'ESTRELA'
            })
        });

        if (res.ok) {
            // Mostrar feedback visual
            const section = document.getElementById('avaliacao-estrelas');
            section.innerHTML = '<p class="text-green-400 text-2xl font-bold">✓ Avaliação salva!</p>';
            
            // Voltar ao standby em 2 segundos
            setTimeout(() => {
                clearTimeout(thankYouTimer);
                currentState = 'transition';
                showScreen('standby');
                pollStatus();
            }, 2000);
        }
    } catch (err) {
        console.error('Erro ao salvar avaliação:', err);
        alert('Erro ao salvar avaliação');
    }
}

function formatCurrency(v) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// Formulário de Config
document.getElementById('config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const dbPath = document.getElementById('db-path').value;
    const res = await fetch('/api/settings');
    const data = await res.json();
    const settings = data.settings || { db: {}, colors: {} };

    settings.db.database = dbPath;

    const saveRes = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
    });

    if (saveRes.ok) {
        alert('Configuração salva!');
        location.reload();
    }
});

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    await loadSettings();
    await loadPromocoes();
    await loadAvaliacaoConfig();
    pollStatus();
    setInterval(pollStatus, 1000);
});
