const express = require('express');
const Firebird = require('node-firebird');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const STORAGE_DIR = process.env.STORAGE_DIR || __dirname;
const DB_FILE = path.join(STORAGE_DIR, 'settings.sqlite');

// Estado para detectar finalização de venda
let lastKnownSale = { id: null, active: false };

// MOCK_MODE: Defina como false para usar o banco de dados Firebird real
const MOCK_MODE = false;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Serve arquivos enviados pelo usuário primeiro, depois faz fallback pros originais estáticos
app.use(express.static(path.join(STORAGE_DIR, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

// Configuração do Multer para uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const type = req.params.type;
        const dir = type === 'promo' ? path.join(STORAGE_DIR, 'public', 'promocoes') : path.join(STORAGE_DIR, 'public');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const type = req.params.type;
        if (type === 'logo') {
            cb(null, 'logo.png'); // Sobrescreve o logo atual
        } else {
            cb(null, `promo_${Date.now()}${path.extname(file.originalname)}`);
        }
    }
});
const upload = multer({ storage });

// Helper para ler configurações
const dbSettings = new sqlite3.Database(DB_FILE);

let currentConfig = {
    db: {
        host: 'localhost', port: 3050, database: '', user: 'SYSDBA', password: 'masterkey', store_name: 'MINHA EMPRESA'
    },
    colors: {
        primary: '#1e293b', secondary: '#334155', accent: '#3b82f6', text: '#ffffff', bg_app: '#020617', bg_list: '#0f172a', bg_side: '#020617', text_total: '#ffffff'
    }
};

dbSettings.serialize(() => {
    dbSettings.run(`CREATE TABLE IF NOT EXISTS app_config (id INTEGER PRIMARY KEY CHECK (id = 1), config_data TEXT)`);
    dbSettings.get(`SELECT config_data FROM app_config WHERE id = 1`, (err, row) => {
        if (row && row.config_data) {
            try {
                const saved = JSON.parse(row.config_data);
                console.log('[CONFIG] Configurações carregadas do banco SQLite.');
                currentConfig.db = { ...currentConfig.db, ...(saved.database ? {
                    host: saved.host, port: saved.port, database: saved.database, user: saved.user, password: saved.password, store_name: saved.store_name
                } : (saved.db || {})) };
                currentConfig.colors = { ...currentConfig.colors, ...(saved.colors || {}) };
            } catch (e) {
                console.error('[CONFIG] Erro ao analisar config do SQLite:', e.message);
            }
        } else {
            dbSettings.run(`INSERT INTO app_config (id, config_data) VALUES (1, ?)`, [JSON.stringify(currentConfig)]);
        }
    });
});

function getConfig() {
    return currentConfig;
}

// Rota de Status da Venda (Polling 1s)
app.get('/api/status-venda', (req, res) => {
    const settings = getConfig();

    if (MOCK_MODE) {
        console.log('[DEBUG] Mock Mode Ativo: Retornando dados simulados.');
        return res.json({
            success: true,
            venda_ativa: true,
            concluida: false,
            total: 125.80,
            itens: [
                { cod_produto: 1, descricao: 'GASOLINA COMUM', quantidade: 20, valor_unitario: 5.89, subtotal: 117.80, operadora: 'JOÃO SILVA' },
                { cod_produto: 2, descricao: 'ADITIVO STP', quantidade: 1, valor_unitario: 8.00, subtotal: 8.00, operadora: 'JOÃO SILVA' }
            ]
        });
    }

    if (!settings.db.database) {
        return res.status(400).json({ success: false, message: 'Banco de dados não configurado' });
    }

    console.log(`[FIREBIRD] Tentando conexão: ${settings.db.host}:${settings.db.database}`);
    const connectionOptions = { ...settings.db, lowercase_keys: true };
    Firebird.attach(connectionOptions, (err, db) => {
        if (err) {
            console.error('[FIREBIRD] Erro de Conexão:', err.message);
            return res.status(500).json({ success: false, message: 'Erro de conexão: ' + err.message });
        }

        const queryAtiva = `
            SELECT 
                v.COD_PDV, v.SEQ_CAIXA, v.SEQUENCIAL, v.COD_OPERADOR,
                i.COD_PRODUTO, p.DESCRICAO, i.QUANTIDADE, i.PRECO_NF as VALOR_UNITARIO, i.VALOR_NF as SUBTOTAL,
                v.VALOR_NF as VALOR_TOTAL, i.CANCELADO, f.APELIDO as OPERADORA
            FROM VENDAS v
            INNER JOIN ITENS_VENDA i ON v.COD_PDV = i.COD_PDV AND v.SEQ_CAIXA = i.SEQ_CAIXA AND v.SEQUENCIAL = i.SEQ_VENDA
            INNER JOIN PRODUTOS p ON i.COD_PRODUTO = p.CODIGO
            INNER JOIN FUNCIONARIOS f ON f.CODIGO = v.COD_OPERADOR
            WHERE v.CONCLUIDA = 'N' AND v.CANCELADA = 'N'
            ORDER BY i.NUMERO ASC
        `;

        db.query(queryAtiva, (err, result) => {
            if (err) {
                console.error('[QUERY] Erro na busca de venda ativa:', err.message);
                db.detach();
                return res.status(500).json({ success: false, message: 'Erro na query: ' + err.message });
            }

            if (result && result.length > 0) {
                // Como lowercase_keys está true, usamos chaves minúsculas
                const firstItem = result[0];
                const saleId = `${firstItem.cod_pdv}|${firstItem.seq_caixa}|${firstItem.sequencial}`;
                
                console.log(`[VENDA] Ativa Detectada ID: ${saleId} (${result.length} itens)`);
                console.log('[DEBUG] Primeiro item da venda:', JSON.stringify(firstItem));
                
                lastKnownSale = { id: saleId, active: true };
                
                // Calcula o total se não vier direto da venda
                const totalVenda = firstItem.valor_total || result.reduce((acc, it) => acc + (it.subtotal || 0), 0);
                
                db.detach();
                return res.json({
                    success: true,
                    venda_ativa: true,
                    concluida: false,
                    venda_id: saleId,
                    itens: result,
                    total: totalVenda
                });
            }

            // Se não há venda ativa, verifica se a última que conhecíamos foi concluída agora
            if (lastKnownSale.active) {
                const [pdv, caixa, seq] = lastKnownSale.id.split('|');
                console.log(`[STATUS] Venda ${lastKnownSale.id} saiu do modo ativo. Verificando conclusão...`);
                
                const queryCheckConcluido = `SELECT CONCLUIDA FROM VENDAS WHERE COD_PDV = ? AND SEQ_CAIXA = ? AND SEQUENCIAL = ?`;
                
                db.query(queryCheckConcluido, [pdv, caixa, seq], (err, rows) => {
                    db.detach();
                    if (!err && rows && rows[0]) {
                        // O retorno do campo também virá em minúsculo se lowercase_keys estiver true
                        const status = rows[0].concluida;
                        if (status === 'S') {
                            console.log(`[CHECKOUT] Venda ${lastKnownSale.id} CONCLUÍDA com sucesso!`);
                            lastKnownSale.active = false;
                            return res.json({ success: true, venda_ativa: false, concluida: true });
                        }
                    }
                    console.log(`[STATUS] Venda ${lastKnownSale.id} não consta como concluída 'S'.`);
                    lastKnownSale.active = false;
                    res.json({ success: true, venda_ativa: false, concluida: false });
                });
            } else {
                db.detach();
                res.json({ success: true, venda_ativa: false, concluida: false });
            }
        });
    });
});

// Inicializar tabela de avaliações (SQLite)
dbSettings.serialize(() => {
    dbSettings.run(`
        CREATE TABLE IF NOT EXISTS avaliacao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            venda_id TEXT NOT NULL,
            caixa_id INTEGER,
            operador_id INTEGER,
            nota INTEGER,
            tipo TEXT DEFAULT 'ESTRELA',
            data TEXT,
            hora TEXT,
            UNIQUE(venda_id)
        )
    `);
    dbSettings.run(`CREATE TABLE IF NOT EXISTS avaliacao_config (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        ativa BOOLEAN DEFAULT 0,
        tipo TEXT DEFAULT 'ESTRELA',
        url_qr_code TEXT
    )`, () => {
        // Se não existir config, criar padrão
        dbSettings.get(`SELECT * FROM avaliacao_config WHERE id = 1`, (err, row) => {
            if (!row) {
                dbSettings.run(`INSERT INTO avaliacao_config (id, ativa, tipo) VALUES (1, 0, 'ESTRELA')`);
            }
        });
    });
});

// Rotas de Configuração
app.get('/api/settings', (req, res) => res.json({ success: true, settings: getConfig() }));

app.post('/api/settings', (req, res) => {
    const newConfig = req.body;
    
    currentConfig.db = { ...currentConfig.db, ...(newConfig.db || {}) };
    currentConfig.colors = { ...currentConfig.colors, ...(newConfig.colors || {}) };

    dbSettings.run(
        `REPLACE INTO app_config (id, config_data) VALUES (1, ?)`,
        [JSON.stringify(currentConfig)],
        (err) => {
            if (err) return res.status(500).json({ success: false, message: 'Erro ao salvar no banco.' });
            res.json({ success: true, message: 'Configurações salvas com sucesso no banco!' });
        }
    );
});

// Rotas de Upload
app.post('/api/upload/:type', upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: 'Arquivo ausente.' });
    res.json({ success: true, message: 'Upload OK!', filename: req.file.filename });
});

app.delete('/api/promocoes/:filename', (req, res) => {
    // Permite buscar imagem salva no user data ou no fallback base pra remoção (prioriza user data)
    let filePath = path.join(STORAGE_DIR, 'public', 'promocoes', req.params.filename);
    if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, 'public', 'promocoes', req.params.filename);
    }
    
    if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch(e) {}
        res.json({ success: true, message: 'Removido!' });
    } else {
        res.status(404).json({ success: false });
    }
});

app.get('/api/promocoes', (req, res) => {
    const promoDirBase = path.join(__dirname, 'public', 'promocoes');
    const promoDirUser = path.join(STORAGE_DIR, 'public', 'promocoes');
    
    if (!fs.existsSync(promoDirBase)) fs.mkdirSync(promoDirBase, { recursive: true });
    if (!fs.existsSync(promoDirUser)) fs.mkdirSync(promoDirUser, { recursive: true });
    
    let allFiles = new Set();
    
    try {
        const baseFiles = fs.readdirSync(promoDirBase);
        baseFiles.forEach(f => allFiles.add(f));
    } catch(e) {}
    
    try {
        if (promoDirBase !== promoDirUser) {
            const userFiles = fs.readdirSync(promoDirUser);
            userFiles.forEach(f => allFiles.add(f));
        }
    } catch(e) {}
    
    const images = Array.from(allFiles).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).map(f => `/promocoes/${f}`);
    res.json({ success: true, images });
});

// ====== ROTAS DE AVALIAÇÃO ======
app.get('/api/avaliacao-config', (req, res) => {
    dbSettings.get(`SELECT * FROM avaliacao_config WHERE id = 1`, (err, row) => {
        if (err || !row) return res.json({ success: false });
        res.json({ success: true, config: row });
    });
});

app.post('/api/avaliacao-config', (req, res) => {
    const { ativa, tipo, url_qr_code } = req.body;
    dbSettings.run(
        `UPDATE avaliacao_config SET ativa = ?, tipo = ?, url_qr_code = ? WHERE id = 1`,
        [ativa ? 1 : 0, tipo, url_qr_code || null],
        (err) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, message: 'Configuração salva!' });
        }
    );
});

app.post('/api/avaliacao', (req, res) => {
    const { venda_id, caixa_id, operador_id, nota, tipo } = req.body;
    const agora = new Date();
    const data = agora.toISOString().split('T')[0];
    const hora = agora.toTimeString().split(' ')[0];

    dbSettings.run(
        `INSERT OR IGNORE INTO avaliacao (venda_id, caixa_id, operador_id, nota, tipo, data, hora) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [venda_id, caixa_id, operador_id, nota || null, tipo, data, hora],
        (err) => {
            if (err) return res.status(500).json({ success: false, message: err.message });
            res.json({ success: true, message: 'Avaliação salva!' });
        }
    );
});

app.get('/api/avaliacoes', (req, res) => {
    const { dataInicio, dataFim, operadorId } = req.query;
    let query = `SELECT * FROM avaliacao WHERE 1=1`;
    const params = [];

    if (dataInicio) {
        query += ` AND data >= ?`;
        params.push(dataInicio);
    }
    if (dataFim) {
        query += ` AND data <= ?`;
        params.push(dataFim);
    }
    if (operadorId) {
        query += ` AND operador_id = ?`;
        params.push(operadorId);
    }

    query += ` ORDER BY data DESC, hora DESC`;

    dbSettings.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, avaliacoes: rows || [] });
    });
});

app.listen(PORT, () => {
    console.log(`\nCFD CORPORATIVO RODANDO EM: http://localhost:${PORT}\n`);
});
