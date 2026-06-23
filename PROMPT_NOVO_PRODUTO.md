# Como anunciar produtos

Todos os produtos ficam em **um único arquivo**: `src/data/produtos.yaml`.
Você não precisa mexer em nenhuma oração ou biografia.

## Adicionar um produto

Abra `src/data/produtos.yaml` e adicione um bloco assim (logo no começo, na área indicada):

```yaml
- id: livro-imitacao-cristo
  nome: A Imitação de Cristo
  descricao: Clássico da espiritualidade cristã
  categoria: livro
  imagem: /produtos/imitacao-cristo.webp
  link: https://www.amazon.com.br/dp/SEU-CODIGO?tag=SEU-TAG
  paginas: [pai-nosso, ave-maria]
```

### Os campos

| Campo       | Obrigatório | O que é |
|-------------|:-----------:|---------|
| `id`        | sim | Identificador único, sem espaços. |
| `nome`      | sim | Nome que aparece no card. |
| `descricao` | não | Uma linha curta (ex.: material, detalhe). |
| `categoria` | sim | `livro`, `vestuario`, `acessorio`, `arte`, `terco`, `medalha`, `curso` ou `outro`. |
| `imagem`    | não | Imagem local **ou** link de imagem (veja abaixo). Sem imagem, o card mostra só o texto. |
| `link`      | sim | Seu link de afiliado (Amazon, Mercado Livre, qualquer site). |
| `paginas`   | não* | Slugs das páginas onde aparece. Ex.: `[pai-nosso, novena-santo-antonio]`. |
| `santo`     | não* | Aparece em **qualquer** página desse santo. Ex.: `"São Miguel Arcanjo"`. |

\* Use `paginas` **ou** `santo` (ou os dois). Se nada casar com a página, o produto não aparece.

## Imagens (quero miniaturas bem discretas)

Você tem duas opções:

1. **Imagem da própria loja (link):** copie o endereço da foto do produto (Amazon, Mercado Livre…) e cole em `imagem`. Ex.: `imagem: https://m.media-amazon.com/images/I/xxxx.jpg`. Nada para baixar.

2. **Imagem local:** salve o arquivo em `public/produtos/` (ex.: `public/produtos/imitacao-cristo.webp`) e aponte `imagem: /produtos/imitacao-cristo.webp`. O site gera **uma miniatura leve automaticamente** no build — pode mandar uma imagem grande sem problema.

Em ambos os casos a miniatura aparece pequena (mesmo tamanho do calendário de festas), discreta.

## Onde os produtos aparecem

- **No fim de cada oração/biografia relacionada**, numa seção discreta "Produtos relacionados" — só quando há produto para aquela página.
- **Na página `/produtos`** (link no rodapé), com tudo separado por categoria. Só aparecem as categorias que têm produtos.

## Publicar

Depois de editar `produtos.yaml` (e/ou adicionar imagens em `public/produtos/`), é só publicar como sempre: `subir-site.bat` (ou `git add . && git commit && git push`).
