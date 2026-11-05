# Advocacia Monteiro: protótipo

Abra `index.html` no navegador (funciona direto, sem servidor).

## Estrutura
- `index.html`, `css/style.css`, `js/app.js`: o site pronto.
- `img/`: imagens 3D geradas por código (substituíveis por fotos reais, mesmo nome e proporção).
- `src/` e `build.mjs`: código-fonte. Para alterar: `npm install` e depois `node build.mjs`.
- `render/`: cenas 3D que geram as imagens (`node render/run.mjs`).

## Atenção (dados de exemplo)
Telefone, e-mail, endereços, nomes, "Desde 1998", números do painel e gráficos são ilustrativos. O formulário não envia nada ainda. Revisar o rodapé (Provimento 205/2021) com o escritório.

## Publicação na Locaweb
O workflow do GitHub Actions em `.github/workflows/deploy.yml` compila e publica o site na pasta `public_html/advocacia` a cada push. Configure no repositório os secrets `HOST`, `USER` e `PASS` com os dados do FTP da Locaweb.


## Identidade visual atualizada
Paleta revisada para azul-marinho profundo (#111E33), dourado (#C1A16B), marfim (#F5F2EB) e grafite. Foram preservadas as seções, interações, animações e cenas 3D existentes. O arquivo `css/style.css` contém os ajustes de tema; as cores de destaque das cenas 3D também foram alinhadas ao dourado.
