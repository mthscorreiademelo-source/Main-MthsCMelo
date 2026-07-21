import { useEffect, useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { CATEGORIAS, criarDespensa, criarItemCompra } from '../db'
import { buscarProdutoOFF } from '../openfoodfacts'
import { useListas } from '../hooks'

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50'
const ROT = 'text-[12px] font-medium text-muted'

/** Após ler um EAN: busca na Open Food Facts, mostra para revisão e salva. */
export function ConfirmarProduto({ ean, onFechar }: { ean: string; onFechar: () => void }) {
  const listas = useListas()
  const [carregando, setCarregando] = useState(true)
  const [achou, setAchou] = useState(false)
  const [nome, setNome] = useState('')
  const [marca, setMarca] = useState('')
  const [categoria, setCategoria] = useState('outros')
  const [unidade, setUnidade] = useState('un')
  const [imagem, setImagem] = useState<string | undefined>(undefined)
  const [destino, setDestino] = useState<'despensa' | 'lista'>('despensa')
  const [listaId, setListaId] = useState('')

  useEffect(() => {
    let vivo = true
    buscarProdutoOFF(ean).then((p) => {
      if (!vivo) return
      if (p) {
        setAchou(true)
        setNome(p.nome ?? '')
        setMarca(p.marca ?? '')
        setCategoria(p.categoria)
        setImagem(p.imagem)
      }
      setCarregando(false)
    })
    return () => { vivo = false }
  }, [ean])

  useEffect(() => {
    if (!listaId && listas && listas.length > 0) setListaId(listas[0].id)
  }, [listas, listaId])

  async function salvar() {
    if (!nome.trim()) return
    if (destino === 'despensa') {
      await criarDespensa({ nome: nome.trim(), marca: marca.trim() || undefined, categoria, unidade, ean, quantidadeFechados: 1 })
    } else if (listaId) {
      await criarItemCompra({ listaId, nome: nome.trim(), marca: marca.trim() || undefined, categoria, unidade, origem: 'notafiscal' })
    }
    onFechar()
  }

  return (
    <FolhaInferior titulo="Produto escaneado" onFechar={onFechar}>
      {carregando ? (
        <p className="py-6 text-center text-[14px] text-muted">Buscando o produto pelo código {ean}…</p>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 rounded-xl bg-hover/50 p-2.5">
            {imagem ? <img src={imagem} alt="" className="size-12 rounded-lg object-contain" /> : <span className="flex size-12 items-center justify-center rounded-lg bg-surface text-[20px]">🏷️</span>}
            <div className="min-w-0">
              <p className="text-[12px] text-muted">Código {ean}</p>
              <p className="text-[12.5px]">{achou ? 'Encontrado na Open Food Facts — confira e ajuste.' : 'Não encontrado. Preencha os dados manualmente.'}</p>
            </div>
          </div>

          <label className="block"><span className={ROT}>Nome</span><input autoFocus className={`${CAMPO} mt-1`} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do produto" /></label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className={ROT}>Marca</span><input className={`${CAMPO} mt-1`} value={marca} onChange={(e) => setMarca(e.target.value)} placeholder="Opcional" /></label>
            <label className="block"><span className={ROT}>Unidade</span><input className={`${CAMPO} mt-1`} value={unidade} onChange={(e) => setUnidade(e.target.value)} /></label>
          </div>
          <div>
            <span className={ROT}>Categoria</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {CATEGORIAS.map((c) => (
                <button key={c.valor} onClick={() => setCategoria(c.valor)} className={`flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-medium ${categoria === c.valor ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>
                  <span aria-hidden>{c.icone}</span> {c.nome}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className={ROT}>Adicionar a</span>
            <div className="mt-1.5 flex gap-1.5">
              <button onClick={() => setDestino('despensa')} className={`flex-1 rounded-xl border px-2 py-2 text-[13px] font-medium ${destino === 'despensa' ? 'border-ink bg-hover text-ink' : 'border-line text-muted'}`}>Despensa</button>
              <button onClick={() => setDestino('lista')} className={`flex-1 rounded-xl border px-2 py-2 text-[13px] font-medium ${destino === 'lista' ? 'border-ink bg-hover text-ink' : 'border-line text-muted'}`}>Lista de compras</button>
            </div>
            {destino === 'lista' && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {(listas ?? []).map((l) => (
                  <button key={l.id} onClick={() => setListaId(l.id)} className={`rounded-full border px-2.5 py-1 text-[12px] font-medium ${listaId === l.id ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>{l.icone} {l.nome}</button>
                ))}
              </div>
            )}
          </div>

          <button onClick={salvar} disabled={!nome.trim()} className="mt-1 min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">Adicionar</button>
        </div>
      )}
    </FolhaInferior>
  )
}
