import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { CartaoSecao, Vazio, type ControleSecao } from './CartaoSecao'
import { atualizarDespensa, catInfo, criarItemCompra, feedbackNivel, gerarSugestoes, type Confianca, type Sugestao } from '../db'
import { useDespensa, useHistoricosTodos, useListas } from '../hooks'
import type { NivelAprox } from '../types'

const CORES_CONF: Record<Confianca, string> = { alta: '#299438', moderada: '#eb8909', poucos: '#808080' }
const ROTULO_CONF: Record<Confianca, string> = { alta: 'confiança alta', moderada: 'confiança moderada', poucos: 'poucos dados' }

export function SecaoSugestoes({ controle }: { controle: ControleSecao }) {
  const despensa = useDespensa()
  const historicos = useHistoricosTodos()
  const listas = useListas()
  const [ignorados, setIgnorados] = useState<Set<string>>(new Set())
  const [aindaTenho, setAindaTenho] = useState<Sugestao | null>(null)
  const [adicionar, setAdicionar] = useState<Sugestao | null>(null)

  const sugestoes = despensa && historicos ? gerarSugestoes(despensa, historicos).filter((s) => !ignorados.has(s.item.id)) : []

  async function addNaLista(s: Sugestao, listaId: string) {
    await criarItemCompra({
      listaId,
      nome: s.item.nome,
      marca: s.item.marca,
      categoria: s.item.categoria,
      unidade: s.item.unidade,
      petId: s.item.petId,
      despensaId: s.item.id,
      origem: 'ia',
    })
    setAdicionar(null)
  }
  async function responderNivel(s: Sugestao, nivel: NivelAprox) {
    await feedbackNivel(s.item, nivel)
    setAindaTenho(null)
  }

  return (
    <CartaoSecao titulo="O que provavelmente está acabando?" emoji="✨" {...controle}>
      {despensa === undefined ? null : sugestoes.length === 0 ? (
        <Vazio>Nada parece estar acabando agora. Conforme você registra compras, o Lume aprende seu ritmo e avisa por aqui.</Vazio>
      ) : (
        <ul className="flex flex-col gap-2">
          {sugestoes.map((s) => {
            const cat = catInfo(s.item.categoria)
            return (
              <li key={s.item.id} className="rounded-xl border border-line bg-surface/60 p-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-hover text-[16px]">{cat.icone}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-semibold">{s.item.nome}</span>
                      <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-medium" style={{ backgroundColor: `${CORES_CONF[s.confianca]}22`, color: CORES_CONF[s.confianca] }}>
                        {ROTULO_CONF[s.confianca]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-ink/80">{s.texto}</p>
                    <p className="text-[11px] text-muted">
                      {cat.nome}
                      {s.item.ultimaCompraEm ? ` · última compra ${format(parseISO(s.item.ultimaCompraEm), "d 'de' MMM", { locale: ptBR })}` : ''}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button onClick={() => (listas && listas.length === 1 ? addNaLista(s, listas[0].id) : setAdicionar(s))} className="rounded-full bg-ink px-2.5 py-1 text-[12px] font-medium text-surface">
                    + Adicionar à lista
                  </button>
                  <button onClick={() => setAindaTenho(s)} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-muted hover:text-ink">Ainda tenho</button>
                  <button onClick={() => setIgnorados((p) => new Set(p).add(s.item.id))} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-muted hover:text-ink">Ignorar por enquanto</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {adicionar && listas && (
        <FolhaInferior titulo={`Adicionar “${adicionar.item.nome}” a…`} onFechar={() => setAdicionar(null)}>
          <div className="flex flex-col gap-1.5">
            {listas.map((l) => (
              <button key={l.id} onClick={() => addNaLista(adicionar, l.id)} className="flex items-center gap-2.5 rounded-xl border border-line px-3 py-2.5 text-left text-[14px] font-medium hover:bg-hover">
                <span aria-hidden>{l.icone}</span> {l.nome}
              </button>
            ))}
          </div>
        </FolhaInferior>
      )}

      {aindaTenho && (
        <FolhaInferior titulo={`Quanto ${aindaTenho.item.nome.toLowerCase()} você ainda tem?`} onFechar={() => setAindaTenho(null)}>
          <p className="text-[12.5px] text-muted">Isso ajuda o Lume a corrigir a previsão — não precisa ser exato.</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {([['cheio', 'Ainda tenho bastante'], ['metade', 'Aproximadamente metade'], ['pouco', 'Pouco'], ['quase_vazio', 'Quase acabando']] as [NivelAprox, string][]).map(([v, r]) => (
              <button key={v} onClick={() => responderNivel(aindaTenho, v)} className="rounded-xl border border-line px-3 py-3 text-[13px] font-medium hover:bg-hover">{r}</button>
            ))}
          </div>
          <button onClick={() => { atualizarDespensa(aindaTenho.item.id, { monitorarIA: false }); setAindaTenho(null) }} className="mt-1 text-[12px] text-muted hover:text-ink">
            Prefiro que o Lume pare de monitorar este item
          </button>
        </FolhaInferior>
      )}
    </CartaoSecao>
  )
}
