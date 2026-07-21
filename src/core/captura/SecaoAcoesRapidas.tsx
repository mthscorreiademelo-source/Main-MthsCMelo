import { useState } from 'react'
import { FolhaInferior } from '../components/FolhaInferior'
import { IconMais } from '../components/Icons'
import { ACOES, acaoPorId, type IdAcao } from './acoes'
import { abrirLauncher } from './store'
import { alternarAcaoHoje, definirTamanhoAcoes, useConfigAcoes } from './config'

/**
 * Seção "Ações rápidas" do Hoje — atalhos configuráveis para capturar sem
 * navegar. Compacta (ícone + nome) ou expandida (com descrição). "Mais" abre
 * o launcher completo.
 */
export function SecaoAcoesRapidas() {
  const { acoes, tamanho } = useConfigAcoes()
  const [personalizar, setPersonalizar] = useState(false)

  const lista = acoes.map(acaoPorId).filter(Boolean) as ReturnType<typeof acaoPorId>[]
  const expandido = tamanho === 'expandido'

  return (
    <section className="lume-entrada rounded-2xl border border-line bg-surface/50 p-3.5">
      <div className="mb-2.5 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">Ações rápidas</h2>
        <button onClick={() => setPersonalizar(true)} aria-label="Personalizar ações" className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Personalizar">⚙︎</button>
      </div>

      <div className={expandido ? 'flex flex-col gap-1.5' : 'grid grid-cols-3 gap-2 sm:grid-cols-4'}>
        {lista.map((a) => a && (
          <button
            key={a.id}
            onClick={() => abrirLauncher('grade')}
            className={
              expandido
                ? 'flex items-center gap-3 rounded-xl border border-line bg-surface/40 px-3 py-2 text-left transition-colors hover:bg-hover/50'
                : 'flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-surface/40 px-1 py-3 text-center transition-colors hover:bg-hover/50'
            }
          >
            <span className={`flex items-center justify-center rounded-xl ${expandido ? 'size-9 text-[18px]' : 'size-10 text-[20px]'}`} style={{ backgroundColor: `color-mix(in srgb, ${a.cor} 15%, var(--vida-surface))` }}>{a.emoji}</span>
            {expandido ? (
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] font-semibold leading-tight">{a.nome}</span>
                <span className="block truncate text-[11.5px] text-muted">{a.descricao}</span>
              </span>
            ) : (
              <span className="text-[12px] font-medium leading-tight">{a.nome}</span>
            )}
          </button>
        ))}

        <button
          onClick={() => abrirLauncher('grade')}
          className={
            expandido
              ? 'flex items-center gap-3 rounded-xl border border-dashed border-line px-3 py-2 text-left text-muted transition-colors hover:text-ink'
              : 'flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-line px-1 py-3 text-center text-muted transition-colors hover:text-ink'
          }
        >
          <span className={`flex items-center justify-center rounded-xl bg-hover ${expandido ? 'size-9' : 'size-10'}`}><IconMais width={18} height={18} /></span>
          <span className="text-[12px] font-medium leading-tight">Mais</span>
        </button>
      </div>

      {personalizar && (
        <FolhaInferior titulo="Personalizar ações rápidas" onFechar={() => setPersonalizar(false)}>
          <div className="flex flex-col gap-4">
            <div>
              <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Tamanho</span>
              <div className="mt-2 flex overflow-hidden rounded-xl border border-line">
                {(['compacto', 'expandido'] as const).map((t) => (
                  <button key={t} onClick={() => definirTamanhoAcoes(t)} className={`min-h-10 flex-1 text-[13.5px] font-medium capitalize transition-colors ${tamanho === t ? 'bg-hover text-ink' : 'text-muted hover:bg-hover/60'}`}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Ações exibidas</span>
              <ul className="mt-2 flex flex-col gap-1.5">
                {ACOES.map((a) => {
                  const ativa = acoes.includes(a.id as IdAcao)
                  return (
                    <li key={a.id}>
                      <button onClick={() => alternarAcaoHoje(a.id)} className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2 text-left hover:bg-hover/50">
                        <span className="flex size-8 items-center justify-center rounded-lg text-[16px]" style={{ backgroundColor: `color-mix(in srgb, ${a.cor} 15%, var(--vida-surface))` }}>{a.emoji}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] font-medium">{a.nome}</span>
                          <span className="block truncate text-[11.5px] text-muted">{a.descricao}</span>
                        </span>
                        <span className={`flex size-5 items-center justify-center rounded-full text-[12px] ${ativa ? 'bg-accent text-white' : 'border border-line text-transparent'}`}>✓</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>
        </FolhaInferior>
      )}
    </section>
  )
}
