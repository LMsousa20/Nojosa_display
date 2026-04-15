# 📱 Build APK - CFD PDV

## ✅ Pré-requisitos Instalados

- ✅ Node.js
- ✅ Capacitor CLI
- ✅ Android Studio (precisa estar instalado)
- ✅ Android SDK (API 33+)
- ✅ Java JDK (11+)

## 📦 Comando para Gerar APK

```bash
npm run build:apk
```

### O que este comando faz:
1. Copia os arquivos públicos para o projeto Android
2. Compila o projeto Android com Gradle
3. Gera o arquivo APK em: `android/app/build/outputs/apk/release/app-release.apk`

## 📲 Alternativa Manual (Se tiver Android Studio)

Se preferir compilar via Android Studio:

```bash
# 1. Copiar arquivos
npx capacitor copy android

# 2. Abrir Android Studio
start android/

# 3. Build > Build Bundle(s) / APK(s) > Build APK(s)
```

## 📍 Localização do APK Gerado

```
c:\ACS\Segunda_tela\android\app\build\outputs\apk\release\app-release.apk
```

## 🔒 Assinatura Digital (Opcional - para Play Store)

Se quiser publicar na Google Play Store, entre em contato para gerar o arquivo de assinatura.

## 📝 Notas Importantes

- O APK se conectará a `http://localhost:3000` por padrão
- Para usar em rede, altere a URL em `capacitor.config.json`
- O app funcionará apenas com o Node.js rodando
- Tamanho esperado do APK: ~50-100MB

---

**Última atualização:** 14/04/2026
