const express = require('express');
const Firebird = require('node-firebird');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const CONFIG_FILE = path.join(__dirname, 'config.json');

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper para ler configuração
function getDbConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    return null;
}

// Rota para salvar configuração
app.post('/api/config', (req, res) => {
    const { host, database, user, password, port } = req.body;
    const config = {
        host: host || 'localhost',
        port: parseInt(port) || 3050,
        database: database,
        user: user || 'SYSDBA',
        password: password || 'masterkey',
        lowercase_keys: true,
        role: null,
        pageSize: 4096
    };

    // Testa a conexão antes de salvar
    Firebird.attach(config, (err, db) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao conectar: ' + err.message });
        }
        db.detach();
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
        res.json({ success: true, message: 'Configuração salva e testada com sucesso!' });
    });
});

// Rota para buscar venda atual
app.get('/api/venda-atual', (req, res) => {
    const config = getDbConfig();
    if (!config) {
        return res.status(400).json({ success: false, message: 'Banco de dados não configurado' });
    }

    Firebird.attach(config, (err, db) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro de conexão: ' + err.message });
        }

        const query = `
            SELECT 
                i.cod_produto, 
                p.descricao, 
                i.quantidade, 
                i.valor_unitario, 
                (i.quantidade * i.valor_unitario) as subtotal,
                v.valor_total
            FROM Venda v
            INNER JOIN itens_vendas i ON v.sequencial = i.sequencial AND v.seq_caixa = i.seq_caixa
            INNER JOIN Produtos p ON i.cod_produto = p.cod_produto
            WHERE v.concluido = 'N' AND v.cancelada = 'N'
        `;

        db.query(query, (err, result) => {
            db.detach();
            if (err) {
                return res.status(500).json({ success: false, message: 'Erro na query: ' + err.message });
            }

            if (result.length === 0) {
                return res.json({ success: true, venda_ativa: false });
            }

            const totalVenda = result[0].valor_total || result.reduce((acc, item) => acc + item.subtotal, 0);
            
            res.json({ 
                success: true, 
                venda_ativa: true, 
                itens: result,
                total: totalVenda
            });
        });
    });
});

// Rota para listar promoções
app.get('/api/promocoes', (req, res) => {
    const promoDir = path.join(__dirname, 'public', 'promocoes');
    if (!fs.existsSync(promoDir)) {
        fs.mkdirSync(promoDir, { recursive: true });
    }

    fs.readdir(promoDir, (err, files) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Erro ao ler pasta de promoções' });
        }
        
        const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file))
                            .map(file => `/promocoes/${file}`);
        
        res.json({ success: true, images });
    });
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
