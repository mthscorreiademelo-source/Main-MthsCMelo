import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconButton } from '../../../core/components/Button'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { RecorteImagem } from '../../../core/components/RecorteImagem'
import { IconLapis, IconMais, IconSetaEsquerda } from '../../../core/components/Icons'
import { useTheme } from '../../../core/theme/useTheme'
import {
  adicionarModulo,
  alternarFavoritoProjeto,
  atualizarProjetoWS,
  COR_STATUS,
  excluirProjetoWS,
  modulosDoProjeto,
  moverModulo,
  removerModulo,
  ROTULO_STATUS,
} from '../db'
import { defModulo, MODULOS_PROJETO } from '../modulos'
import { BlocoAgenda } from './BlocoAgenda'
import { BlocoFinanceiro } from './BlocoFinanceiro'
import { BlocoLista } from './BlocoLista'
import { BlocoNotas } from './BlocoNotas'
import { BlocoTarefas } from './BlocoTarefas'
import { VisaoGeralProjeto } from './VisaoGeralProjeto'
import type { Projeto, StatusProjeto } from '../../tarefas/types'

const STATUS: StatusProjeto[] = ['ideia', 'andamento', 'pausado', 'concluido']

function dataUrlParaTexto(u: string) { return u } // capa fica como dataURL direto

function Conteudo({ modulo, projeto, onAba }: { modulo: string; projeto: Projeto; onAba: (id: string) => void }) {
  switch (modulo) {
    case 'visao': return <VisaoGeralProjeto projeto={projeto} onAba={onAba} />
    case 'tarefas': return <div className="mx-auto max-w-2xl"><BlocoTarefas projetoId={projeto.id} /></div>
    case 'agenda': return <div className="mx-auto max-w-2xl"><BlocoAgenda projetoId={projeto.id} /></div>
    case 'financeiro': return <div className="mx-auto max-w-2xl"><BlocoFinanceiro projetoId={projeto.id} /></div>
    case 'notas': return <div className="mx-auto max-w-2xl"><BlocoNotas projetoId={projeto.id} /></div>
    case 'base': return <p className="mx-auto max-w-2xl text-[13px] text-muted">A base de dados personalizada chega na próxima fase.</p>
    default: return <div className="mx-auto max-w-2xl"><BlocoLista projetoId={projeto.id} modulo={modulo} /></div>
  }
}

export function ProjetoWorkspace({ projeto }: { projeto: Projeto }) {
  const navigate = useNavigate()
  const { tema } = useTheme()
  const [aba, setAba] = useState('visao')
  const [modAberto, setModAberto] = useState(false)
  const [recorteCapa, setRecorteCapa] = useState<File | null>(null)
  const [confirmExcluir, setConfirmExcluir] = useState(false)

  const modulos = useMemo(() => modulosDoProjeto(projeto).filter((m) => m.visivel), [projeto])
  const capa = tema === 'dark' ? (projeto.capaDark ?? projeto.capa) : projeto.capa
  const disponiveis = MODULOS_PROJETO.filter((m) => !(projeto.modulos ?? []).some((x) => x.id === m.id && x.visivel))

  const abas = [{ id: 'visao', nome: 'Visão geral', emoji: '◱' }, ...modulos.map((m) => ({ id: m.id, nome: defModulo(m.id)?.nome ?? m.id, emoji: defModulo(m.id)?.emoji ?? '📦' }))]

  return (
    <div className="flex flex-col gap-4">
      {/* Cabeçalho */}
      <section className="overflow-hidden rounded-2xl border border-line bg-surface/50">
        <div
          className="group relative h-28 w-full bg-bg sm:h-36"
          style={capa ? { backgroundImage: `url(${capa})`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: `linear-gradient(120deg, color-mix(in srgb, ${projeto.cor} 42%, transparent), color-mix(in srgb, ${projeto.cor} 6%, transparent))` }}
        >
          <div className="flex items-center justify-between p-3">
            <IconButton onClick={() => navigate('/projetos')} aria-label="Voltar" className="lg:!hidden"><IconSetaEsquerda /></IconButton>
            <span className="lg:hidden" />
            <div className="ml-auto flex items-center gap-1.5">
              <label className="flex cursor-pointer items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur hover:bg-black/45">
                <IconLapis width={11} height={11} /> Capa
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setRecorteCapa(f); e.target.value = '' }} />
              </label>
              <button onClick={() => alternarFavoritoProjeto(projeto)} className="flex size-7 items-center justify-center rounded-full bg-black/30 text-[13px] text-white backdrop-blur hover:bg-black/45">{projeto.favorito ? '⭐' : '☆'}</button>
            </div>
          </div>
        </div>

        <div className="px-4 pb-3">
          <div className="-mt-7 flex items-end gap-3">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-line text-[26px] shadow-sm" style={{ backgroundColor: `color-mix(in srgb, ${projeto.cor} 14%, var(--vida-surface))` }}>{projeto.icone ?? '📁'}</span>
            <div className="mb-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <input value={projeto.nome} onChange={(e) => atualizarProjetoWS(projeto.id, { nome: e.target.value })} className="min-w-0 flex-1 truncate bg-transparent text-[20px] font-bold leading-tight outline-none" />
              </div>
              <input value={projeto.descricao ?? ''} onChange={(e) => atualizarProjetoWS(projeto.id, { descricao: e.target.value || undefined })} placeholder="Adicionar descrição…" className="w-full truncate bg-transparent text-[12.5px] text-muted outline-none placeholder:text-muted/50" />
            </div>
            <button onClick={() => setModAberto(true)} className="mb-1 hidden min-h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-medium text-muted hover:text-ink sm:flex">
              <IconLapis width={13} height={13} /> Personalizar
            </button>
          </div>

          {/* Pills de status */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11.5px]">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-hover px-2.5 py-1 font-medium">
              <span className="size-1.5 rounded-full" style={{ backgroundColor: COR_STATUS[projeto.status ?? 'andamento'] }} />
              <select value={projeto.status ?? 'andamento'} onChange={(e) => atualizarProjetoWS(projeto.id, { status: e.target.value as StatusProjeto })} className="bg-transparent outline-none">
                {STATUS.map((s) => <option key={s} value={s}>{ROTULO_STATUS[s]}</option>)}
              </select>
            </span>
            <span className="rounded-full bg-hover px-2.5 py-1 text-muted">Iniciado em {format(new Date(projeto.criadoEm), "dd/MM/yyyy", { locale: ptBR })}</span>
            {projeto.categoria && <span className="rounded-full bg-hover px-2.5 py-1 text-muted">{projeto.categoria}</span>}
          </div>
        </div>

        {/* Barra de abas */}
        <div className="flex items-center gap-1 overflow-x-auto border-t border-line px-2 py-1.5">
          {abas.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${aba === a.id ? 'bg-hover text-ink' : 'text-muted hover:bg-hover/60'}`}
            >
              <span className="text-[13px]">{a.emoji}</span> {a.nome}
            </button>
          ))}
          <button onClick={() => setModAberto(true)} className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-hover/60" title="Adicionar módulo"><IconMais width={16} height={16} /></button>
        </div>
      </section>

      {/* Conteúdo da aba */}
      <Conteudo modulo={aba} projeto={projeto} onAba={setAba} />

      {/* Recorte de capa (proporção larga) */}
      {recorteCapa && (
        <RecorteImagem
          arquivo={recorteCapa}
          aspecto={40 / 11}
          saidaLargura={1280}
          onConfirmar={(url) => { atualizarProjetoWS(projeto.id, { capa: dataUrlParaTexto(url) }); setRecorteCapa(null) }}
          onCancelar={() => setRecorteCapa(null)}
        />
      )}

      {/* Gerenciar módulos */}
      {modAberto && (
        <FolhaInferior titulo="Módulos do projeto" onFechar={() => setModAberto(false)}>
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">No projeto</span>
              <ul className="mt-2 flex flex-col gap-1.5">
                {modulos.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 rounded-xl border border-line px-3 py-2">
                    <span className="text-[16px]">{defModulo(m.id)?.emoji}</span>
                    <span className="flex-1 text-[14px] font-medium">{defModulo(m.id)?.nome}</span>
                    <button onClick={() => moverModulo(projeto, m.id, -1)} className="flex size-7 items-center justify-center rounded-lg text-muted hover:bg-hover">↑</button>
                    <button onClick={() => moverModulo(projeto, m.id, 1)} className="flex size-7 items-center justify-center rounded-lg text-muted hover:bg-hover">↓</button>
                    <button onClick={() => { removerModulo(projeto, m.id); if (aba === m.id) setAba('visao') }} className="flex size-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-danger">×</button>
                  </li>
                ))}
              </ul>
            </div>
            {disponiveis.length > 0 && (
              <div>
                <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Adicionar</span>
                <ul className="mt-2 flex flex-col gap-1.5">
                  {disponiveis.map((m) => (
                    <li key={m.id}>
                      <button onClick={() => { adicionarModulo(projeto, m.id); setAba(m.id); setModAberto(false) }} className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-left hover:bg-hover/60">
                        <span className="text-[18px]">{m.emoji}</span>
                        <span className="min-w-0 flex-1"><span className="block text-[14px] font-medium">{m.nome}</span><span className="block text-[11.5px] text-muted">{m.descricao}</span></span>
                        {m.tipo === 'integrado' && <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">integrado</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <button onClick={() => setConfirmExcluir(true)} className="self-center text-[12.5px] text-muted hover:text-danger">Excluir projeto</button>
          </div>
        </FolhaInferior>
      )}

      {confirmExcluir && (
        <FolhaInferior titulo="Excluir projeto" onFechar={() => setConfirmExcluir(false)}>
          <div className="flex flex-col gap-3">
            <p className="text-[13.5px] text-muted">Isto remove o projeto e seus itens locais. Tarefas, eventos, notas e movimentos são apenas <b>desvinculados</b> — continuam nas suas abas.</p>
            <button onClick={() => { excluirProjetoWS(projeto.id); navigate('/projetos') }} className="flex min-h-11 items-center justify-center rounded-full bg-danger text-[14px] font-semibold text-white">Excluir definitivamente</button>
          </div>
        </FolhaInferior>
      )}
    </div>
  )
}
