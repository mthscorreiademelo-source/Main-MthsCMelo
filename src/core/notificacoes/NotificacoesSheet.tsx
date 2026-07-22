import { useEffect, useState } from 'react'
import { ModalCentral } from '../components/ModalCentral'
import { PREFERENCIAS_PADRAO, type PreferenciasLembrete } from './config'
import {
  atualizarPreferencias,
  desligar,
  enviarTeste,
  estadoAtual,
  ligar,
  lerPreferencias,
  type EstadoPush,
} from './push'

function Alternador({ ligado, onToggle, rotulo }: { ligado: boolean; onToggle: () => void; rotulo: string }) {
  return (
    <button onClick={onToggle} className="flex w-full items-center justify-between py-1.5 text-left">
      <span className="text-[13.5px]">{rotulo}</span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${ligado ? 'bg-accent' : 'bg-hover'}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-surface shadow transition-all ${ligado ? 'left-4' : 'left-0.5'}`} />
      </span>
    </button>
  )
}

export function NotificacoesSheet({ onFechar }: { onFechar: () => void }) {
  const [estado, setEstado] = useState<EstadoPush | null>(null)
  const [prefs, setPrefs] = useState<PreferenciasLembrete>(PREFERENCIAS_PADRAO)
  const [ocupado, setOcupado] = useState(false)
  const [aviso, setAviso] = useState('')

  useEffect(() => {
    estadoAtual().then(setEstado)
    lerPreferencias().then(setPrefs)
  }, [])

  function flash(msg: string) {
    setAviso(msg)
    setTimeout(() => setAviso(''), 4000)
  }

  async function ativar() {
    setOcupado(true)
    const novo = await ligar(prefs)
    setEstado(novo)
    setOcupado(false)
    if (novo === 'negado') flash('Permissão negada. Libere as notificações do site nas configurações do navegador.')
    else if (novo === 'ligado') flash('Notificações ligadas! 🔔')
  }

  async function desativar() {
    setOcupado(true)
    setEstado(await desligar())
    setOcupado(false)
  }

  async function salvar(p: PreferenciasLembrete) {
    setPrefs(p)
    if (estado === 'ligado') await atualizarPreferencias(p)
  }

  async function testar() {
    setOcupado(true)
    const r = await enviarTeste()
    setOcupado(false)
    flash(r.mensagem ?? (r.ok ? 'Enviado!' : 'Falhou.'))
  }

  return (
    <ModalCentral titulo="Notificações" onFechar={onFechar}>
      {estado === 'indisponivel' ? (
        <p className="text-[13px] text-muted">
          Este navegador/dispositivo não suporta notificações push, ou a nuvem não está ligada. Entre na sua conta e use
          o app instalado (tela de início) para receber lembretes.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-[13px] text-muted">
            Receba lembretes no celular — e o seu relógio espelha automaticamente. Um resumo do dia com o que está por
            fazer.
          </p>

          {estado === 'ligado' ? (
            <button
              onClick={desativar}
              disabled={ocupado}
              className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line text-[13px] font-medium text-muted transition-colors hover:text-danger disabled:opacity-50"
            >
              Desligar notificações
            </button>
          ) : (
            <button
              onClick={ativar}
              disabled={ocupado}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-50"
            >
              🔔 Ligar notificações
            </button>
          )}

          {estado === 'negado' && (
            <p className="rounded-xl bg-danger/[0.08] px-3 py-2 text-[12px] text-danger">
              As notificações estão bloqueadas para este site. Libere nas permissões do navegador e tente de novo.
            </p>
          )}

          {estado === 'ligado' && (
            <>
              <div className="rounded-2xl border border-line bg-surface/50 p-3">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">Resumo do dia</span>
                <Alternador
                  rotulo="Enviar um resumo de manhã"
                  ligado={prefs.resumoDiario}
                  onToggle={() => salvar({ ...prefs, resumoDiario: !prefs.resumoDiario })}
                />
                {prefs.resumoDiario && (
                  <>
                    <label className="mt-1 flex items-center justify-between py-1.5 text-[13.5px]">
                      <span>Horário</span>
                      <input
                        type="time"
                        value={prefs.hora}
                        onChange={(e) => salvar({ ...prefs, hora: e.target.value })}
                        className="rounded-lg border border-line bg-surface px-2 py-1 text-[13px] tabular-nums outline-none focus:border-muted/50"
                      />
                    </label>
                    <div className="mt-1 border-t border-line pt-1">
                      <Alternador rotulo="Tarefas com prazo hoje" ligado={prefs.tarefas} onToggle={() => salvar({ ...prefs, tarefas: !prefs.tarefas })} />
                      <Alternador rotulo="Eventos de hoje" ligado={prefs.eventos} onToggle={() => salvar({ ...prefs, eventos: !prefs.eventos })} />
                      <Alternador rotulo="Hábitos pendentes" ligado={prefs.habitos} onToggle={() => salvar({ ...prefs, habitos: !prefs.habitos })} />
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={testar}
                disabled={ocupado}
                className="flex min-h-10 items-center justify-center gap-2 rounded-xl border border-line text-[13px] font-medium text-accent transition-colors hover:bg-hover/50 disabled:opacity-50"
              >
                Enviar notificação de teste
              </button>
            </>
          )}

          {aviso && <p className="text-[12px] text-muted">{aviso}</p>}
        </div>
      )}
    </ModalCentral>
  )
}
