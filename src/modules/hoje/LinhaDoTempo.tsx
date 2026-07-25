import { Link } from 'react-router-dom'
import type { Evento } from '../agenda/types'
import { categoriaDe, corEfetiva, iconeEvento } from '../agenda/categorias'
import { hhmmParaMin } from './agora'

/**
 * Linha do tempo do dia — o elemento-assinatura do Hoje. Uma trilha do começo ao
 * fim do dia com BLOCOS rotulados por compromisso (hora + título), a régua de
 * horas, o marcador de "agora" e uma legenda por categoria. Usa as cores e
 * ícones das categorias da Agenda (identidade do LUME).
 */
export function LinhaDoTempo({
  eventos,
  agoraMin,
  horaAgora,
}: {
  /** Eventos do dia COM horário (já filtrados/cronológicos). */
  eventos: Evento[]
  agoraMin: number
  /** "HH:MM" de agora, para a etiqueta do marcador. */
  horaAgora: string
}) {
  const comHora = eventos
    .map((e) => ({ e, i: hhmmParaMin(e.inicio), f: hhmmParaMin(e.fim) }))
    .filter((x): x is { e: Evento; i: number; f: number | null } => x.i != null)
    .sort((a, b) => a.i - b.i)

  const inicios = comHora.map((x) => x.i)
  const fins = comHora.map((x) => x.f ?? x.i + 60)
  const inicioDia = Math.max(0, Math.min(7 * 60, agoraMin, ...inicios))
  const fimDia = Math.min(24 * 60, Math.max(22 * 60, agoraMin + 30, ...fins))
  const vao = Math.max(1, fimDia - inicioDia)
  const pos = (m: number) => Math.max(0, Math.min(100, ((m - inicioDia) / vao) * 100))

  // Marcas de hora (a cada 2h) para a régua.
  const marcas: number[] = []
  const primeira = Math.ceil(inicioDia / 120) * 120
  for (let m = primeira; m <= fimDia; m += 120) marcas.push(m)
  const hh = (m: number) => String(Math.floor(m / 60)).padStart(2, '0')

  // Categorias presentes → legenda.
  const cats = new Map<string, { nome: string; cor: string }>()
  for (const { e } of comHora) {
    const c = categoriaDe(e)
    const chave = c?.id ?? 'outro'
    if (!cats.has(chave)) cats.set(chave, { nome: c?.nome ?? 'Outro', cor: corEfetiva(e) })
  }

  const dentroDoDia = agoraMin >= inicioDia && agoraMin <= fimDia

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-3 flex items-baseline justify-between">
        <span className="text-[13px] font-semibold">Linha do tempo de hoje</span>
        <Link to="/agenda" className="text-[12px] text-muted hover:text-ink">
          Ver agenda
        </Link>
      </div>

      {/* régua de horas */}
      <div className="relative mb-1 h-4">
        {marcas.map((m) => (
          <span
            key={m}
            className="absolute top-0 -translate-x-1/2 text-[10px] tabular-nums text-muted/70"
            style={{ left: `${pos(m)}%` }}
          >
            {hh(m)}
          </span>
        ))}
      </div>

      {/* trilha com blocos */}
      <div className="relative h-16 rounded-xl bg-hover/40">
        {/* linhas verticais suaves nas marcas */}
        {marcas.map((m) => (
          <span
            key={m}
            className="absolute inset-y-0 w-px bg-line/70"
            style={{ left: `${pos(m)}%` }}
          />
        ))}

        {/* blocos dos eventos */}
        {comHora.map(({ e, i, f }) => {
          const fim = f ?? i + 60
          const largura = Math.max(2, pos(fim) - pos(i))
          const cor = corEfetiva(e)
          const cabe = largura >= 12
          return (
            <Link
              key={e.id}
              to="/agenda"
              title={`${e.inicio}–${e.fim} · ${e.titulo}`}
              className="absolute inset-y-1.5 flex flex-col justify-center overflow-hidden rounded-lg px-2 no-underline ring-1 transition-transform hover:z-10 hover:scale-[1.02]"
              style={{
                left: `${pos(i)}%`,
                width: `${largura}%`,
                backgroundColor: `color-mix(in srgb, ${cor} 16%, transparent)`,
                boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${cor} 45%, transparent)`,
              }}
            >
              {cabe ? (
                <>
                  <span className="flex items-center gap-1 truncate text-[12px] font-semibold" style={{ color: cor }}>
                    <span aria-hidden>{iconeEvento(e)}</span>
                    <span className="truncate">{e.titulo}</span>
                  </span>
                  <span className="truncate text-[10px] tabular-nums" style={{ color: cor }}>
                    {e.inicio}–{e.fim}
                  </span>
                </>
              ) : (
                <span className="mx-auto text-[11px]" aria-hidden style={{ color: cor }}>
                  {iconeEvento(e)}
                </span>
              )}
            </Link>
          )
        })}

        {/* marcador de agora */}
        {dentroDoDia && (
          <span className="absolute inset-y-0 z-20 -translate-x-1/2" style={{ left: `${pos(agoraMin)}%` }}>
            <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded bg-danger" />
            <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 -translate-y-full rounded bg-danger px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white">
              {horaAgora}
            </span>
          </span>
        )}

        {comHora.length === 0 && (
          <span className="absolute inset-0 flex items-center justify-center text-[12px] text-muted">
            Nenhum compromisso com horário hoje.
          </span>
        )}
      </div>

      {/* legenda */}
      {cats.size > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          {[...cats.values()].map((c) => (
            <span key={c.nome} className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: c.cor }} />
              {c.nome}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
