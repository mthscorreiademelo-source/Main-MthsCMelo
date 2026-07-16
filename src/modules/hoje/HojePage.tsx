import { dataPorExtenso, saudacao } from '../../core/dates'
import { MODULOS } from '../../core/modules'

/**
 * Dashboard "Hoje" — o cérebro do app. Não conhece nenhum módulo pelo nome:
 * compõe as contribuições que cada módulo registra.
 *  - HojeResumo → mini-tiles do "cockpit" (visão rápida no topo).
 *  - SecaoHoje  → cartões numa grade masonry (2 colunas em telas largas).
 * Módulo novo com essas peças aparece aqui automaticamente.
 */
export function HojePage() {
  const resumos = MODULOS.filter((m) => m.HojeResumo)
  // Cartões: destaque primeiro (ancoram o topo das colunas), depois compactos.
  const secoes = MODULOS.filter((m) => m.SecaoHoje).sort(
    (a, b) => (a.hojeTamanho === 'destaque' ? 0 : 1) - (b.hojeTamanho === 'destaque' ? 0 : 1),
  )

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">{saudacao()}</h1>
        <p className="mt-1 text-sm text-muted">{dataPorExtenso()}</p>
      </header>

      {resumos.length > 0 && (
        <div className="flex flex-wrap gap-2.5">
          {resumos.map((m) => {
            const Resumo = m.HojeResumo!
            return <Resumo key={m.id} />
          })}
        </div>
      )}

      <div className="gap-4 md:columns-2">
        {secoes.map((m) => {
          const Secao = m.SecaoHoje!
          return <Secao key={m.id} />
        })}
      </div>
    </div>
  )
}
