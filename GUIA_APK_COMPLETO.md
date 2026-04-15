# 🚀 Guia Completo - APK Android para CFD PDV

## 📋 Checklist de Pré-requisitos

### 1️⃣ **Node.js**
- ✅ Já instalado no seu PC
- Versão necessária: v16+
- Verifica com: `node --version`

### 2️⃣ **Java JDK** (Obrigatório)
```
📥 Baixar: https://www.oracle.com/java/technologies/downloads/
   - Para Windows x64
   - Versão 11 ou 17 (recomendado)
```

**Como verificar se está instalado:**
```powershell
java -version
```

**Se não tiver, após instalar:**
- Reinicie o terminal/PowerShell
- Execute o instalador e siga as instruções

---

### 3️⃣ **Android Studio + SDK**
```
📥 Baixar: https://developer.android.com/studio

Passos de Instalação:
1. Execute o instalador
2. Selecione "Standard Installation"
3. Na tela de componentes, deixe selecionado:
   ✅ Android SDK
   ✅ Android SDK Platform
   ✅ Android Virtual Device
4. Aguarde o download dos componentes (pode levar 30-60 min)
5. Finalize a instalação
```

**Após instalar, adicione variáveis de ambiente:**

**Windows 11/10:**
1. Botão direito em "Este Computador" → Propriedades
2. Clique em "Configurações avançadas do sistema"
3. Clique em "Variáveis de Ambiente"
4. Adicione uma nova variável de sistema:
   - Nome: `ANDROID_HOME`
   - Valor: `C:\Users\SEU_USUARIO\AppData\Local\Android\Sdk`
5. Edite a variável `Path` e adicione:
   - `%ANDROID_HOME%\cmdline-tools\latest\bin`
   - `%ANDROID_HOME%\platform-tools`
6. Clique OK e reinicie o terminal

**Verificar se funcionou:**
```powershell
adb --version
```

---

## ✅ Setup do Projeto (Já Feito)

O projeto já foi configurado com:
- ✅ Capacitor instalado
- ✅ Plataforma Android adicionada
- ✅ Arquivo de configuração (`capacitor.config.json`)
- ✅ Assets copiados

---

## 🔨 Como Fazer o Build

### **Opção 1: Via Comando (Recomendado)**

```bash
npm run build:apk
```

Este comando:
1. Sincroniza os arquivos públicos com Android
2. Compila o projeto com Gradle
3. Gera o APK em modo Release

**Tempo esperado:** 5-15 minutos na primeira vez

**Resultado:** `android/app/build/outputs/apk/release/app-release.apk`

---

### **Opção 2: Via Android Studio**

```bash
# 1. Abrir Android Studio
start android/

# 2. Aguarde o Gradle sincronizar (pode levar alguns minutos)

# 3. Menu: Build → Build Bundle(s) / APK(s) → Build APK(s)

# 4. Aguarde a compilação
```

---

## 📲 Instalar APK no Tablet

### **Via USB (Recomendado)**

1. Conecte o tablet via USB ao PC
2. Ative o "Modo de Desenvolvedor" no tablet:
   - Configurações → Sobre → Pressione 7x em "Versão do Build"
3. Ative a "Depuração USB"
4. Execute:
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### **Transferência Manual**

1. Copie o APK para uma pasta compartilhada
2. No tablet, navegue até a pasta
3. Clique para instalar
4. Confirme as permissões

---

## ⚙️ Configuração para Rede

Se o tablet for acessar via rede (não localhost):

**Edite `capacitor.config.json`:**

```json
"server": {
    "url": "http://IP_DO_PC:3000",
    "cleartext": true
}
```

Substitua `IP_DO_PC` pelo endereço IP do seu computador. Exemplo: `192.168.1.100`

**Para achar o IP do seu PC:**
```bash
ipconfig
```

Procure por "Endereço IPv4" (começa com 192.168...)

**Após editar, recompile:**
```bash
npm run build:apk
```

---

## 🐛 Troubleshooting

### "Comando 'gradlew' não encontrado"
```bash
cd android
# Gerar gradlew
gradle wrapper --gradle-version 8.1.1
cd ..
npm run build:apk
```

### "ANDROID_HOME não está configurado"
```bash
# Configure no PowerShell (temporariamente)
$env:ANDROID_HOME = "C:\Users\SEU_USUARIO\AppData\Local\Android\Sdk"
npm run build:apk
```

### "Gradle build falhou"
```bash
# Limpar cache
cd android
gradlew clean
cd ..
npm run build:apk
```

### "APK instalado mas não conecta"
- Verifique se Node.js está rodando: `npm start`
- Verifique se a URL em `capacitor.config.json` está correta
- Teste a conexão de rede entre tablet e PC

---

## 📊 Especificações do APK

- **Tamanho:** ~50-100 MB
- **Min SDK:** Android 7 (API 24)
- **Target SDK:** Android 13 (API 33)
- **Orientação:** Paisagem (ideal para tablet)
- **Permissões:** Rede, Câmera (se usar QR Code)

---

## 🎯 Próximos Passos

1. ✅ Instale os pré-requisitos (Java + Android Studio)
2. ✅ Execute: `npm run build:apk`
3. ✅ Instale no tablet
4. ✅ Teste a funcionalidade
5. ✅ Se quiser distribuir, publique na Play Store (contate para assinatura)

---

## 📞 Dúvidas?

Qualquer problema, execute:
```bash
setup-android.bat
```

Este script verifica se tudo está instalado corretamente.

---

**Última atualização:** 14/04/2026
**Versão:** 1.0.0
