# Especificação de Design: Busca Científica WoRMS

Este documento descreve os tokens de design, diretrizes de acessibilidade, especificações de layout, fluxos de interação e especificações técnicas para a nova página **Busca Científica WoRMS** integrada ao Sistema de Monitoramento de Desembarque Pesqueiro MPA Piauí.

---

## 1. Tokens de Design (Design Tokens)

### 1.1 Paleta de Cores (Color Palette)

A paleta foi selecionada para garantir harmonia com o tema do desembarque pesqueiro, adicionando tons que remetem à sobriedade científica e à biodiversidade marinha:

| Token | Valor Hexadecimal | Nome Funcional | Uso Principal |
| :--- | :--- | :--- | :--- |
| `color-brand-navy` | `#0A3D62` | Azul Marinho Primário | Cabeçalhos, botões principais, destaques estruturais |
| `color-brand-white` | `#FFFFFF` | Branco Puro | Planos de fundo de cartões, áreas de texto |
| `color-brand-teal` | `#00BFA6` | Verde Água / Turquesa | Detalhes ecológicos, status aceito, elementos marinhos |
| `color-brand-orange` | `#FF8A00` | Laranja Alerta | Sinônimos taxonômicos, status provisórios ou inválidos |
| `color-bg-light` | `#F5F6FA` | Cinza Claro de Fundo | Fundo geral da aplicação e recipientes secundários |
| `color-text-muted` | `#6B7280` | Cinza Texto / Slate 500 | Descrições secundárias, legendas e textos auxiliares |
| `color-text-dark` | `#0F172A` | Slate 900 (Contraste Alto)| Textos principais de leitura e cabeçalhos |

### 1.2 Tipografia (Typography)

Foco total em legibilidade científica e precisão na exibição de termos em latim:

- **Família Tipográfica Principal**: `Inter, system-ui, sans-serif`
- **Tamanhos e Pesos**:
  - **H1 (Título da Página)**: `30px` (Semibold / `font-semibold`), leading `1.2`
  - **H2 (Seções Secundárias)**: `20px` a `24px` (Semibold / `font-semibold`)
  - **Body (Texto de Leitura)**: `15px` (Regular / `font-normal`), leading `1.6`
  - **Small (Metadados e Legendas)**: `12px` (Medium ou Regular)
  - **Nomes Científicos (Regra Taxonômica)**: *Itálico obrigatório* com peso destacado para a espécie e gênero (ex: *Ucides cordatus*).

### 1.3 Bordas, Sombras e Espaçamentos (Borders, Shadows & Spacing)

- **Bordas arredondadas (Border Radius)**:
  - `radius-card`: `8px` para cartões de táxons e painéis informativos.
  - `radius-image`: `12px` para fotografias e mídias científicas.
  - `radius-input`: `12px` para barra de pesquisa e botões.
- **Sombras (Shadows)**:
  - `shadow-scientific`: `0 6px 18px rgba(10, 61, 98, 0.08)` (Proporciona uma sensação de elevação suave sobre o fundo cinza sem carregar o design).
- **Espaçamento Base (Grid Spacing)**:
  - Base de `8px` (`0.5rem`).
  - Margens internas de cartões: `16px` (`2rem`) ou `24px` (`3rem`) para manter amplo espaço negativo (respiro).

---

## 2. Layout da Interface

O layout foi desenhado de forma responsiva para se adaptar perfeitamente a Desktops (1920px), Tablets (768px) e Dispositivos Móveis (375px):

### 2.1 Cabeçalho Sticky (Sticky Header)
- **Visual**: Cor `#0A3D62` (azul-marinho) sólida de fundo, título principal em branco e descrição secundária em azul claro/cinza.
- **Lado Direito**: Texto informativo sobre a fonte dos dados conectada e um ícone de Globo (`Globe`) giratório sutil.

### 2.2 Barra de Busca Central (Search Bar)
- Entrada de texto expansível com ícone de lupa (`Search`) à esquerda e um botão robusto escrito **"CONSULTAR"** em azul marinho com texto em maiúsculas à direita.
- Integração de autocomplete que dispara conforme o usuário digita nomes de gêneros ou famílias.

### 2.3 Painel Lateral de Resultados (Sidebar - 320px)
- Localizado no lado esquerdo em telas desktop (ou no topo em telas menores).
- Contém uma lista vertical de cartões brancos (`#FFFFFF`) com:
  - Nome científico em destaque e *itálico*.
  - Autor da taxonomia e ano.
  - ID numérico exclusivo do WoRMS (AphiaID).
  - Chip de status: **ACEITO** (Verde `#00BFA6` com texto escuro) ou **NÃO ACEITO / SINÔNIMO** (Laranja `#FF8A00` com texto escuro).
  - Botão de ação rápida **"VISUALIZAR"** no rodapé do cartão.

### 2.4 Área de Detalhes Principal
- Localizada no lado direito (ocupando o espaço restante de 4/5 da tela).
- **Cartão de Metadados Principal**: Detalhes do táxon à esquerda e uma grande imagem de destaque à direita com cantos arredondados (`12px`) e controle de aspect-ratio.
- **Resumo Científico**: Caixa branca de destaque com ícone de livro (`BookOpen`) contendo a descrição ecológica e morfológica da espécie extraída da Wikipédia.
- **Painel de Tabs de Navegação**:
  - **GERAL**: Resumo inicial com árvore taxonômica e ambientes registrados.
  - **FONTES BIBLIOGRÁFICAS**: Fontes de referência catalogadas para o registro científico.
  - **NOTAS**: Observações taxonômicas especiais.
  - **BANCOS EXTERNOS**: Links de integração para NCBI, ITIS, BOLD, IUCN e GBIF.
  - **IMAGENS**: Galeria responsiva (grid de colunas adaptável por breakpoint: 3 colunas em desktop, 2 em tablet, 1 em mobile) com suporte a abertura de lightbox em tela cheia ao clicar.

### 2.5 Rodapé (Footer)
- Rodapé de visual minimalista com créditos oficiais de integração e direitos autorais.

---

## 3. Tratamento de Imagens e Recursos de Mídia

- **Controle de Proporções**:
  - Desktop: Aspect ratio de `4:3` garantindo foco no espécime.
  - Mobile: Aspect ratio de `3:2` para otimização de espaço vertical.
- **Renderização**: Propriedade `object-fit: cover` obrigatória para evitar distorções nas fotos biológicas.
- **Lazy Loading**: Atributo `loading="lazy"` em todas as imagens da galeria.
- **Suporte de Fallback**: Caso a espécie não possua imagens catalogadas, renderiza um lindo placeholder SVG com um ícone de imagem estilizado e o botão funcional **"SUGERIR IMAGEM"** para colaboração comunitária.

---

## 4. Interatividade, Hotspots do Protótipo e Acessibilidade

### 4.1 Transições e Feedbacks Visuais
- **Hover**: Efeito de elevação suave nos cartões (`transform: translateY(-2px)`) com transição de `200ms ease`.
- **Loading State**: Uso de Skeletons em tons de cinza suave para evitar layout shifts durante as buscas de rede.
- **Feedback de Erro/Vazio**: Telas ilustradas e amigáveis quando nenhum resultado é retornado.

### 4.2 Navegação do Protótipo (Hotspots)
O protótipo interativo integrado possui hotspots navegáveis:
1. **Buscar**: Clique no campo e pesquise por espécies reais (ex: *Tainha*, *Caranguejo*, *Lagosta*) ou utilize termos sugeridos de teste rápida.
2. **Abrir Resultado**: Selecione um táxon na barra lateral para carregar instantaneamente seus dados ecológicos e trocar a imagem em destaque.
3. **Trocar Tabs**: Alterne suavemente entre Geral, Fontes, Notas, Bancos e Imagens.
4. **Abrir Lightbox**: Na tab Imagens, clique na foto para abrir uma sobreposição de foco em tela cheia (lightbox) com botão para fechar (`X`).

### 4.3 Acessibilidade (A11y)
- Contraste de cor estritamente calculado para ser superior a `4.5:1` para todos os textos.
- Uso de `aria-labels` em botões apenas com ícones.
- Atributos `alt` descritivos em todas as imagens taxonômicas.
- Navegação completa habilitada via teclado (suporte a foco visível e ativação com `Enter`).
