import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { IconButton } from '../../core/components/Button'
import { FolhaInferior } from '../../core/components/FolhaInferior'
import { IconLapis, IconMais, IconSetaEsquerda } from '../../core/components/Icons'
import { useTheme } from '../../core/theme/useTheme'
import {
  adicionarModulo,
  alternarFavoritoProjeto,
  alternarRecolhido,
  atualizarProjetoWS,
  COR_STATUS,
  excluirProjetoWS,
  modulosDoProjeto,
  moverModulo,
  progressoProjeto,
  removerModulo,
  ROTULO_STATUS,
} from './db'
import { defModulo, MODULOS_PROJETO } from './modulos'
import { useProjetoWS, useTarefasProjeto } from './hooks'
import { CartaoBloco } from './components/CartaoBloco'
import { BlocoAgenda } from './components/BlocoAgenda'
import { BlocoFinanceiro } from './components/BlocoFinanceiro'
import { BlocoLista } from './components/BlocoLista'
import { BlocoNotas } from './components/BlocoNotas'
import { BlocoTarefas } from './components/BlocoTarefas'
import type { StatusProjeto } from '../tarefas/types'

const STATUS: StatusProjeto[] = ['ideia', 'andamento', 'pausado', 'concluido']

function Conteudo({ modulo, projetoId }: { modulo: string; projetoId: string }) {
  switch (modulo) {
    case 'tarefas': return <BlocoTarefas projetoId={projetoId} />
    case 'agenda': return <BlocoAgenda projetoId={projetoId} />
    case 'financeiro': return <BlocoFinanceiro projetoId={projetoId} />
    case 'notas': return <BlocoNotas projetoId={projetoId} />
    case 'base': return <p className="text-[13px] text-muted">A base de dados personalizada chega na próxima fase. Por enquanto, use Ideias ou Checklist.</p>
    default: return <BlocoLista projetoId={projetoId} modulo={modulo} />
  }
}

export function ProjetoWorkspacePage() {
  const { id } = useParams<{ id: string }>()
  const projeto = useProjetoWS(id)
  const tarefas = useTarefasProjeto(id)
  const { tema } = useTheme()
  const [personalizando, setPersonalizando] = useState(false)
  const [addAberto, setAddAberto] = useState(false)
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const prog = useMemo(() => progressoProjeto(tarefas ?? []), [tarefas])

  if (projeto === undefined) return <p className="py-16 text-center text-[14px] text-muted">Carregando…</p>
  if (!projeto) return <Navigate to="/projetos" replace />

  const modulos = modulosDoProjeto(projeto).filter((m) => m.visivel)
  const capa = tema === 'dark' ? (projeto.capaDark ?? projeto.capa) : projeto.capa
  const disponiveis = MODULOS_PROJETO.filter((m) => !(projeto.modulos ?? []).some((x) => x.id === m.id && x.visivel))

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      {/* Cabeçalho */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface/50">
        <div
          className="h-24 w-full bg-bg sm:h-28"
          style={capa ? { backgroundImage: `url(${capa})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(135deg, color-mix(in srgb, ${projeto.cor} 40%, transparent), color-mix(in srgb, ${projeto.cor} 8%, transparent))` }}
        >
          <div className="flex items-center justify-between p-3">
            <IconButton onClick={() => history.back()} aria-label="Voltar"><IconSetaEsquerda /></IconButton>
            <button onClick={() => alternarFavoritoProjeto(projeto)} className="flex size-9 items-center justify-center rounded-full bg-black/25 text-[15px] text-white backdrop-blur hover:bg-black/40" title="Favoritar">{projeto.favorito ? '⭐' : '☆'}</button>
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="-mt-7 flex items-end gap-3">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-line text-[28px] shadow-sm" style={{ backgroundColor: `color-mix(in srgb, ${projeto.cor} 14%, var(--vida-surface))` }}>{projeto.icone ?? '📁'}</span>
            <div className="mb-1 min-w-0 flex-1">
              <input
                value={projeto.nome}
                onChange={(e) => atualizarProjetoWS(projeto.id, { nome: e.target.value })}
                className="w-full truncate bg-transparent text-[20px] font-bold leading-tight outline-none"
              />
              <input
                value={projeto.descricao ?? ''}
                onChange={(e) => atualizarProjetoWS(projeto.id, { descricao: e.target.value || undefined })}
                placeholder="Adicionar descrição…"
                className="w-full truncate bg-transparent text-[12.5px] text-muted outline-none placeholder:text-muted/50"
              />
            </div>
          </div>

          {/* Status + progresso */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select
              value={projeto.status ?? 'andamento'}
              onChange={(e) => atualizarProjetoWS(projeto.id, { status: e.target.value as StatusProjeto })}
              className="rounded-full border border-line bg-transparent px-2.5 py-1 text-[12px] font-medium outline-none"
              style={{ color: COR_STATUS[projeto.status ?? 'andamento'] }}
            >
              {STATUS.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}
            </select>
            {projeto.categoria && <span className="rounded-full bg-hover px-2.5 py-1 text-[12px] text-muted">{projeto.categoria}</span>}
            <span className="ml-auto text-[12px] font-semibold">{Math.round(prog * 100)}%</span>
            <button onClick={() => setPersonalizando((v) => !v)} className={`flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-[12.5px] font-medium ${personalizando ? 'border-ink bg-ink text-surface' : 'border-line text-muted hover:text-ink'}`}>
              <IconLapis width={13} height={13} /> {personalizando ? 'Concluir' : 'Personalizar'}
            </button>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hover">
            <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(prog * 100)}%`, backgroundColor: projeto.cor }} />
          </div>
        </div>
      </section>

      {/* Módulos */}
      {modulos.map((m) => {
        const def = defModulo(m.id)
        return (
          <CartaoBloco
            key={m.id}
            emoji={def?.emoji ?? '📦'}
            titulo={def?.nome ?? m.id}
            recolhido={m.recolhido}
            personalizando={personalizando}
            onRecolher={() => alternarRecolhido(projeto, m.id)}
            onSubir={() => moverModulo(projeto, m.id, -1)}
            onDescer={() => moverModulo(projeto, m.id, 1)}
            onRemover={() => removerModulo(projeto, m.id)}
          >
            <Conteudo modulo={m.id} projetoId={projeto.id} />
          </CartaoBloco>
        )
      })}

      {/* Adicionar módulo */}
      <button onClick={() => setAddAberto(true)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line text-[13.5px] font-medium text-muted hover:text-ink">
        <IconMais width={16} height={16} /> Adicionar módulo
      </button>

      {personalizando && (
        <button onClick={() => setConfirmExcluir(true)} className="self-center text-[12.5px] text-muted hover:text-danger">Excluir projeto</button>
      )}

      {addAberto && (
        <FolhaInferior titulo="Adicionar módulo" onFechar={() => setAddAberto(false)}>
          <div className="flex flex-col gap-1.5">
            {disponiveis.length === 0 && <p className="text-[13px] text-muted">Todos os módulos já estão no projeto.</p>}
            {disponiveis.map((m) => (
              <button key={m.id} onClick={() => { adicionarModulo(projeto, m.id); setAddAberto(false) }} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:bg-hover/60">
                <span className="text-[18px]">{m.emoji}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium">{m.nome}</span>
                  <span className="block text-[11.5px] text-muted">{m.descricao}</span>
                </span>
                {m.tipo === 'integrado' && <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">integrado</span>}
              </button>
            ))}
          </div>
        </FolhaInferior>
      )}

      {confirmExcluir && (
        <FolhaInferior titulo="Excluir projeto" onFechar={() => setConfirmExcluir(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-[13.5px] text-muted">Isto remove o projeto e seus itens locais (ideias, links, etc.). Tarefas, eventos, notas e movimentos são apenas <b>desvinculados</b> — continuam nas suas abas.</p>
            <Link to="/projetos" onClick={() => excluirProjetoWS(projeto.id)} className="flex min-h-11 items-center justify-center rounded-full bg-danger text-[14px] font-semibold text-white">
              Excluir definitivamente
            </Link>
          </div>
        </FolhaInferior>
      )}
    </div>
  )
}
