/**
 * Cliente da Open Food Facts — base pública e gratuita de produtos por código
 * de barras (sem chave de API). Usado para preencher nome/marca/categoria a
 * partir de um EAN lido pela câmera. A busca roda no aparelho do usuário; se a
 * rede falhar ou o produto não existir, o usuário completa manualmente.
 */

export interface ProdutoOFF {
  ean: string
  nome?: string
  marca?: string
  categoria: string
  imagem?: string
  quantidade?: string
}

/** Mapeia as tags de categoria da OFF para as categorias do Lume. */
function mapearCategoria(tags: string[] = [], nome = ''): string {
  const t = (tags.join(' ') + ' ' + nome).toLowerCase()
  const regras: [RegExp, string][] = [
    [/beverage|drink|water|juice|soda|coffee|tea|bebida|refrigerante|suco|caf[eé]|\bch[aá]\b/, 'bebidas'],
    [/dairy|milk|cheese|yogurt|latic[ií]nio|leite|queijo|iogurte/, 'laticinios'],
    [/pasta|noodle|macarr[aã]o|massa/, 'massas'],
    [/rice|bean|grain|cereal|arroz|feij[aã]o|gr[aã]o|farinha/, 'graos'],
    [/frozen|congelad/, 'congelados'],
    [/fruit|vegetable|produce|hortifr[uú]ti|fruta|legume|verdura/, 'hortifruti'],
    [/cleaning|detergent|limpeza|sab[aã]o|desinfetante/, 'limpeza'],
    [/hygiene|shampoo|soap|toothpaste|higiene|sabonete|creme dental/, 'higiene'],
    [/pet|dog|cat|ra[cç][aã]o/, 'pet'],
    [/pharma|medic|vitamin|rem[eé]dio|farm[aá]cia|vitamina/, 'farmacia'],
  ]
  for (const [re, cat] of regras) if (re.test(t)) return cat
  return 'outros'
}

/** Busca um produto pelo código de barras. Retorna null se não encontrado. */
export async function buscarProdutoOFF(ean: string): Promise<ProdutoOFF | null> {
  const limpo = ean.replace(/\D/g, '')
  if (limpo.length < 8) return null
  const url = `https://world.openfoodfacts.org/api/v2/product/${limpo}.json?fields=product_name,product_name_pt,brands,categories_tags,image_front_small_url,quantity`
  try {
    const resp = await fetch(url, { headers: { Accept: 'application/json' } })
    if (!resp.ok) return null
    const j = (await resp.json()) as {
      status?: number
      product?: {
        product_name?: string
        product_name_pt?: string
        brands?: string
        categories_tags?: string[]
        image_front_small_url?: string
        quantity?: string
      }
    }
    if (j.status !== 1 || !j.product) return null
    const p = j.product
    const nome = p.product_name_pt || p.product_name || undefined
    return {
      ean: limpo,
      nome,
      marca: p.brands ? p.brands.split(',')[0].trim() : undefined,
      categoria: mapearCategoria(p.categories_tags, nome),
      imagem: p.image_front_small_url,
      quantidade: p.quantity,
    }
  } catch {
    return null
  }
}

/** O navegador tem leitor de código de barras nativo? */
export function temLeitorNativo(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window
}
