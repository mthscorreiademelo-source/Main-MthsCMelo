import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FolhaInferior } from '../components/FolhaInferior'
import { aplicarInterpretacao, desfazer } from './fluxos'
import { arquivarCaptura, atualizarCaptura, excluirCaptura, useCaixaEntrada } from './db'
import { mostrarToast } from './store'
import { STATUS_ROTULO, TIPO_INFO } from './rotulos'
import type { Captura } from './types'

export function CaixaEntrada({ onFechar }: { onFechar: () => void }) {
  const itens = useCaixaEntrada()

  async function processar(cap: Captura) {
    if (!cap.interpretacao) return
    const r = await aplicarInterpretacao(cap.interpretacao)
    if (!r) return
    await atualizarCaptura(cap.id, { status: 'concluido', destino: { colecao: r.colecao, id: r.id } })
    mostrarToast(r.confirmacao, async () => {
      await desfazer(r.colecao, r.id)
      await atualizarCaptura(cap.id, { status: 'aguardando', destino: undefined })
    })
  }

  return (
    <FolhaInferior titulo="Caixa de entrada" onFechar={onFechar}>
      <div className="flex flex-col gap-2">
        <p className="-mt-1 text-[12.5px] text-muted">
          Capturas guardadas para revisar depois. Nada é encaminhado sem a sua confirmação.
        </p>
        {itens === undefined ? (
          <p className="py-8 text-center text-[13px] text-muted">Carregando…</p>
        ) : itens.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-10 text-center">
            <span className="text-3xl">📥</span>
            <p className="text-[14px] font-semibold">Caixa de entrada vazia</p>
            <p className="max-w-xs text-[12.5px] text-muted">Tudo o que você capturar e adiar aparece aqui para processar quando quiser.</p>
          </div>
        ) : (
          itens.map((cap) => {
            const info = cap.tipoSugerido ? TIPO_INFO[cap.tipoSugerido] : null
            return (
              <div key={cap.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface/50 p-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-hover text-[16px]">{info?.emoji ?? '📝'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] leading-snug">{cap.textoBruto || 'Sem texto'}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
                      {info && <span>Sugestão: {info.nome}</span>}
                      <span>· {STATUS_ROTULO[cap.status]}</span>
                      <span>· {format(new Date(cap.criadoEm), "d MMM, HH:mm", { locale: ptBR })}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {cap.interpretacao && (
                    <button onClick={() => processar(cap)} className="min-h-8 flex-1 rounded-full bg-ink px-3 text-[12.5px] font-semibold text-surface">
                      Processar como {info?.nome.toLowerCase()}
                    </button>
                  )}
                  <button onClick={() => arquivarCaptura(cap.id)} className="min-h-8 rounded-full border border-line px-3 text-[12.5px] font-medium text-muted hover:text-ink">Arquivar</button>
                  <button onClick={() => excluirCaptura(cap.id)} aria-label="Excluir" className="flex size-8 items-center justify-center rounded-full border border-line text-muted hover:text-danger">×</button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </FolhaInferior>
  )
}
