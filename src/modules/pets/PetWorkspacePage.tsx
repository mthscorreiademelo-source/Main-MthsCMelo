import type { ComponentType } from 'react'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { IconSetaEsquerda } from '../../core/components/Icons'
import { CabecalhoPet } from './components/CabecalhoPet'
import { CardAlimentacao } from './components/CardAlimentacao'
import { CardCompromissos } from './components/CardCompromissos'
import { CardCuidados } from './components/CardCuidados'
import { CardDocumentos } from './components/CardDocumentos'
import { CardFotos } from './components/CardFotos'
import { CardGastos } from './components/CardGastos'
import { CardHabitos } from './components/CardHabitos'
import { CardHistorico } from './components/CardHistorico'
import { CardInsights } from './components/CardInsights'
import { CardSaude } from './components/CardSaude'
import { CardVacinacao } from './components/CardVacinacao'
import type { ControleCartao } from './components/CartaoModulo'
import { CARDS_WORKSPACE, modulosDoPet, salvarModulos } from './db'
import { usePet } from './hooks'
import type { ModuloWorkspace, Pet } from './types'

const REGISTRO: Record<string, ComponentType<{ pet: Pet; controle: ControleCartao }>> = {
  cuidados: CardCuidados,
  habitos: CardHabitos,
  compromissos: CardCompromissos,
  vacinacao: CardVacinacao,
  historico: CardHistorico,
  alimentacao: CardAlimentacao,
  saude: CardSaude,
  documentos: CardDocumentos,
  gastos: CardGastos,
  fotos: CardFotos,
  insights: CardInsights,
}

function nomeCard(id: string): string {
  return CARDS_WORKSPACE.find((c) => c.id === id)?.nome ?? id
}
function emojiCard(id: string): string {
  return CARDS_WORKSPACE.find((c) => c.id === id)?.emoji ?? '📦'
}

export function PetWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const pet = usePet(id)
  const [personalizando, setPersonalizando] = useState(false)

  if (pet === undefined) return <p className="py-16 text-center text-[14px] text-muted">Carregando…</p>
  if (!pet) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-[15px] font-medium">Pet não encontrado</p>
        <Link to="/pets" className="mt-2 inline-block text-[13px] text-accent">← Voltar para os pets</Link>
      </div>
    )
  }

  const modulos = modulosDoPet(pet)
  const visiveis = modulos.filter((m) => m.visivel)
  const ocultos = modulos.filter((m) => !m.visivel)

  function persistir(novo: ModuloWorkspace[]) {
    salvarModulos(pet!.id, novo.map((m, i) => ({ ...m, ordem: i })))
  }
  function mover(cardId: string, dir: -1 | 1) {
    const vis = modulos.filter((m) => m.visivel)
    const i = vis.findIndex((m) => m.id === cardId)
    const j = i + dir
    if (i < 0 || j < 0 || j >= vis.length) return
    ;[vis[i], vis[j]] = [vis[j], vis[i]]
    persistir([...vis, ...modulos.filter((m) => !m.visivel)])
  }
  function definirVisivel(cardId: string, visivel: boolean) {
    persistir(modulos.map((m) => (m.id === cardId ? { ...m, visivel } : m)))
  }
  function alternarRecolhido(cardId: string) {
    persistir(modulos.map((m) => (m.id === cardId ? { ...m, recolhido: !m.recolhido } : m)))
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-2">
        <Link to="/pets" className="flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
          <IconSetaEsquerda width={16} height={16} /> Pets
        </Link>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => alert('Compartilhamento temporário com veterinário, hotel ou família chega numa próxima versão.')}
            className="min-h-8 rounded-full border border-line px-3 text-[13px] font-medium text-muted hover:text-ink"
          >
            Compartilhar
          </button>
          <button
            onClick={() => setPersonalizando((v) => !v)}
            className={`min-h-8 rounded-full px-3 text-[13px] font-medium ${personalizando ? 'bg-ink text-surface' : 'border border-line text-muted hover:text-ink'}`}
          >
            {personalizando ? 'Concluir' : 'Personalizar'}
          </button>
        </div>
      </div>

      <CabecalhoPet pet={pet} />

      {/* Bandeja de cards ocultos (modo personalizar) */}
      {personalizando && ocultos.length > 0 && (
        <div className="rounded-2xl border border-dashed border-line p-3">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Cards ocultos</span>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {ocultos.map((m) => (
              <button
                key={m.id}
                onClick={() => definirVisivel(m.id, true)}
                className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-medium text-muted hover:text-ink"
              >
                <span aria-hidden>{emojiCard(m.id)}</span> {nomeCard(m.id)} +
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grade modular (masonry) */}
      <div className="gap-4 [column-fill:balance] sm:columns-2 [&>*]:mb-4">
        {visiveis.map((m) => {
          const Card = REGISTRO[m.id]
          if (!Card) return null
          const controle: ControleCartao = {
            recolhido: m.recolhido,
            onRecolher: () => alternarRecolhido(m.id),
            personalizando,
            onSubir: () => mover(m.id, -1),
            onDescer: () => mover(m.id, 1),
            onOcultar: () => definirVisivel(m.id, false),
          }
          return <Card key={m.id} pet={pet} controle={controle} />
        })}
      </div>

      <button
        onClick={() => setPersonalizando((v) => !v)}
        className="mx-auto mb-2 flex items-center gap-2 rounded-full border border-line px-4 py-2 text-[12.5px] font-medium text-muted hover:text-ink"
      >
        ⚙️ {personalizando ? 'Concluir personalização' : 'Personalizar workspace'}
      </button>
    </div>
  )
}
