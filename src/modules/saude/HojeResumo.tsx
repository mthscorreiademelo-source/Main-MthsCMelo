import { TileResumo } from '../../core/components/TileResumo'
import { IconeFator } from '../../core/components/icones'
import { hojeISO } from '../../core/dates'
import { exibir, METRICAS } from './db'
import { useSaude } from './hooks'

const PASSOS = METRICAS.find((m) => m.chave === 'passos')!
const SONO = METRICAS.find((m) => m.chave === 'sonoMin')!

/** Tile do cockpit: passos (ou sono) de hoje, se houver. */
export function HojeResumo() {
  const dias = useSaude()
  if (dias === undefined) return null
  const hoje = dias.find((d) => d.data === hojeISO())
  if (!hoje) return null

  const metrica = hoje.passos != null ? PASSOS : hoje.sonoMin != null ? SONO : null
  if (!metrica) return null
  return (
    <TileResumo
      to="/saude"
      cor={metrica.cor}
      icone={<IconeFator nome={metrica.icone} width={18} height={18} style={{ color: metrica.cor }} />}
      valor={exibir(metrica.chave, hoje[metrica.chave])}
      rotulo={metrica.nome}
    />
  )
}
