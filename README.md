# 🏢 Aplicativo para Android: vistoriaApp

O **vistoriaApp** é uma solução móvel de alta performance para vistorias prediais. Desenvolvido para funcionar em ambientes com conectividade nula ou instável (subsolos e áreas técnicas), ele utiliza uma estratégia **Offline-First** com sincronização bidirecional.

---

## 🚀 Funcionalidades Principais

- **⚡ Checklists Inteligentes:** Interface rápida para marcação de conformidade (OK, NÃO OK, ND) com campo de observações.

- **📶 100% Offline:** Persistência local em SQLite garantindo que nenhum dado seja perdido sem internet.

- **🔄 Sync Service:** Sistema automatizado de sincronização com backend PHP/MySQL.

- **📊 Gestão Completa:** Cadastro e edição de condomínios, grupos e itens de vistoria e síndicos diretamente no app.

- **🔍 Histórico Local:** Consulta rápida de vistorias anteriores por data e período.

---

## 🛠️ Stack Tecnológica

- **Mobile:** Expo & React Native (Router baseado em arquivos).

- **Banco Local:** SQLite (expo-sqlite) para persistência offline.

- **Backend de Sync:** PHP com API REST.

- **Banco Remoto:** MySQL.

- **Linguagem:** TypeScript para maior segurança de código.

---

## 📂 Estrutura do Projeto

A arquitetura foi desenhada para separar claramente a interface da lógica de dados:

```text
📦vistoriaApp
 ┣ 📂app/                  # Rotas e Telas (Expo Router)
 ┃ ┣ 📂auth/               # Login e Cadastro
 ┃ ┣ 📂configuracoes/      # CRUD de Condomínios, Itens e Grupos
 ┃ ┣ 📂dashboard/          # Tela principal de seleção
 ┃ ┗ 📂vistoria/           # Execução e Histórico de vistorias
 ┣ 📂src/
 ┃ ┣ 📂api/                # Serviço de Sincronização (sync.service.ts)
 ┃ ┣ 📂database/           # SQLite Config e Scripts de Seed
 ┃ ┣ 📂services/           # Regras de negócio (Vistorias e Itens)
 ┃ ┗ 📂utils/              # Helpers como geradores de UUID
 ┣ 📂backend/              # API em PHP para recebimento dos dados
 ┗ 📂components/           # UI Components customizados

```

---

## ⚙️ Configuração e Instalação

### Mobile (Frontend)

1. Instale as dependências:

```bash
npm install

```

2. Inicie o ambiente Expo:

```bash
npx expo start

```

### Backend (Sincronização)

1. Certifique-se de que o servidor PHP (Apache/Nginx) está rodando.
2. Configure o banco de dados utilizando o script SQL localizado em `assets/bd/vistoria_check.sql`.

3. Ajuste a URL base no `sync.service.ts` para apontar para o seu servidor local.

---

## 📋 Como Funciona a Vistoria

1.  **Início:** O administrador seleciona o condomínio no Dashboard.

2.  **Execução:** Preenchimento dos itens divididos por categorias (Segurança, Limpeza, Estrutura).

3.  **Registro:** Se houver falha, o app solicita detalhes (ex: "Muita sujeira" no estacionamento).

4.  **Finalização:** Os dados são salvos no SQLite local com status "pendente".

5.  **Sincronização:** Assim que o sinal é restaurado, o `sync.service.ts` envia os pacotes para o backend PHP.

---

> **Desenvolvido com foco em eficiência operacional e confiabilidade de dados.**
