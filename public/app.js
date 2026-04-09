let currentState = null;
let vendaInterval = null;
let carouselInterval = null;
let promoImages = [];
let currentPromoIndex = 0;

const screens = {
    config: document.getElementById('config-screen'),
    sale: document.getElementById('sale-screen'),
    idle: document.getElementById('idle-screen')
};

// Funções de Gerenciamento de Tela
function showScreen(screenKey) {
    if (currentState === screenKey) return;
    
    // Oculta todas
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    
    // Mostra a selecionada
    screens[screenKey].classList.remove('hidden');
    currentState = screenKey;

    // Limpa intervalos se sair do estado correspondente
    if (screenKey !== 'idle') {
        clearInterval(carouselInterval);
    }
}

// Lógica de Venda
async function checkVenda() {
    try {
        const response = await fetch('/api/venda-atual');
        const data = await response.json();

        if (!data.success) {
            if (data.message.includes('não configurado')) {
                showScreen('config');
            }
            return;
        }

        if (data.venda_ativa) {
            renderVenda(data.itens, data.total);
            showScreen('sale');
        } else {
            if (currentState !== 'idle') {
                await loadPromocoes();
                showScreen('idle');
            }
        }
    } catch (err) {
        console.error('Erro ao consultar venda:', err);
    }
}

function renderVenda(itens, total) {
    const list = document.getElementById('items-list');
    const totalEl = document.getElementById('total-value');
    const countEl = document.getElementById('item-count');

    list.innerHTML = itens.map(item => `
        <div class="flex justify-between items-center bg-gray-50 p-4 rounded-xl border border-gray-200 animate-slide-in">
            <div class="flex-1">
                <p class="text-xl font-bold text-gray-800">${item.descricao}</p>
                <p class="text-gray-500 font-medium">${item.quantidade}x ${formatCurrency(item.valor_unitario)}</p>
            </div>
            <div class="text-2xl font-black text-blue-600">
                ${formatCurrency(item.subtotal)}
            </div>
        </div>
    `).join('');

    totalEl.innerText = formatCurrency(total);
    countEl.innerText = `${itens.length} ${itens.length === 1 ? 'item' : 'itens'}`;
}

// Lógica de Promoções
async function loadPromocoes() {
    try {
        const response = await fetch('/api/promocoes');
        const data = await response.json();
        promoImages = data.images;

        if (promoImages.length === 0) {
            document.getElementById('promo-carousel').innerHTML = `
                <div class="h-full w-full flex items-center justify-center text-white text-3xl font-bold text-center p-10 bg-slate-900">
                    <div>
                        <p>Bem-vindo!</p>
                        <p class="text-lg font-normal opacity-50 mt-4">Adicione imagens na pasta /public/promocoes</p>
                    </div>
                </div>
            `;
            return;
        }

        renderCarousel();
        startCarouselTimer();
    } catch (err) {
        console.error('Erro ao carregar promoções:', err);
    }
}

function renderCarousel() {
    const container = document.getElementById('promo-carousel');
    container.innerHTML = promoImages.map((img, idx) => `
        <div class="absolute inset-0 transition-opacity duration-1000 ${idx === 0 ? 'opacity-100' : 'opacity-0'}" id="promo-${idx}">
            <img src="${img}" class="w-full h-full object-cover">
        </div>
    `).join('');
}

function startCarouselTimer() {
    clearInterval(carouselInterval);
    if (promoImages.length <= 1) return;

    carouselInterval = setInterval(() => {
        const prev = document.getElementById(`promo-${currentPromoIndex}`);
        currentPromoIndex = (currentPromoIndex + 1) % promoImages.length;
        const next = document.getElementById(`promo-${currentPromoIndex}`);

        if (prev) prev.classList.replace('opacity-100', 'opacity-0');
        if (next) next.classList.replace('opacity-0', 'opacity-100');
    }, 4000);
}

// Configuração
document.getElementById('config-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const config = {
        host: document.getElementById('db-host').value,
        database: document.getElementById('db-path').value,
        user: document.getElementById('db-user').value,
        pass: document.getElementById('db-pass').value
    };

    try {
        const response = await fetch('/api/config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const data = await response.json();
        
        alert(data.message);
        if (data.success) {
            checkVenda();
        }
    } catch (err) {
        alert('Erro ao salvar configuração: ' + err.message);
    }
});

// Helpers
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

// Inicialização
function init() {
    checkVenda();
    vendaInterval = setInterval(checkVenda, 1000);
}

init();
