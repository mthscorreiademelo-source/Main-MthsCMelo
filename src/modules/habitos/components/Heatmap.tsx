import { parseISO } from 'date-fns'
import { hojeISO } from '../../../core/dates'
import { cicloSimNao } from '../db'
import type { DiaHeatmap } from '../progresso'
import type { Habito } from '../types'

const VERMELHO = '#d8695e'
// Mesmo verde de "concluído" do CartaoHabito (par semântico do vermelho).
const VERDE = '#6db56a'

function corCelula(d: DiaHeatmap, corFeito: string, corParcial: string): string {
  if (d.estado === 'feito') return corFeito
  if (d.estado === 'falhou') return VERMELHO
  if (d.estado === 'parcial') return `${corParcial}${Math.round(40 + d.fracao * 120).toString(16).padStart(2, '0')}`
  return 'var(--vida-line)'
}

/**
 * Mapa de calor estilo GitHub: colunas = semanas, linhas = dias da semana.
 *
 * Para hábitos Sim/Não as células viram clicáveis: um toque num dia (nunca no
 * futuro) cicla o estado daquele dia (pendente → feito → não fez → pendente),
 * gravando direto no banco. Como a página lê os registros por live query, a
 * célula muda de cor na hora. Para os demais tipos o mapa segue só como
 * visualização.
 */
export function Heatmap({ dias, cor, habito }: { dias: DiaHeatmap[]; cor: string; habito?: Habito }) {
  if (dias.length === 0) return null
  const offset = parseISO(dias[0].data).getDay()
  const celulas: (DiaHeatmap | null)[] = [...Array(offset).fill(null), ...dias]
  const hoje = hojeISO()
  // Sim/Não é o único tipo com marcação retroativa por clique aqui.
  const clicavel = habito?.tipo === 'sim_nao'
  // No Sim/Não o "feito" é verde fixo; nos outros tipos, a cor do hábito.
  const corFeito = habito?.tipo === 'sim_nao' ? VERDE : cor

  function marcar(dia: string) {
    if (!habito || !clicavel) return
    if (dia > hoje) return // nunca marcar dia futuro
    void cicloSimNao(habito.id, dia)
  }

  return (
    <div className="overflow-x-auto pb-1">
      <div className="grid grid-flow-col gap-[3px]" style={{ gridTemplateRows: 'repeat(7, 1fr)' }}>
        {celulas.map((c, i) => {
          if (!c) return <span key={`b${i}`} className="size-3" />
          const titulo = `${c.data}${c.estado === 'feito' ? ' · feito' : c.estado === 'falhou' ? ' · não feito' : ''}`
          const fundo = { backgroundColor: corCelula(c, corFeito, cor) }
          const futuro = c.data > hoje
          if (clicavel && !futuro) {
            return (
              <button
                key={c.data}
                type="button"
                onClick={() => marcar(c.data)}
                title={`${titulo} · toque para alternar`}
                aria-label={`Alternar ${c.data}`}
                className="size-3 rounded-[3px] transition-transform hover:scale-125 active:scale-90"
                style={fundo}
              />
            )
          }
          return <span key={c.data} title={titulo} className="size-3 rounded-[3px]" style={fundo} />
        })}
      </div>
    </div>
  )
}
