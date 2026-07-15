import { dataPorExtenso, saudacao } from '../../core/dates'
import { MODULOS } from '../../core/modules'

/**
 * Dashboard "Hoje" — o cérebro do app. Não conhece nenhum módulo pelo nome:
 * compõe as contribuições (SecaoHoje) que cada módulo registra. Módulo novo
 * com SecaoHoje aparece aqui automaticamente, sem tocar neste arquivo.
 */
export function HojePage() {
  const secoes = MODULOS.filter((m) => m.SecaoHoje)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <header className="pt-2">
        <h1 className="text-2xl font-bold tracking-tight">{saudacao()}</h1>
        <p className="mt-1 text-sm text-muted">{dataPorExtenso()}</p>
      </header>

      {secoes.map((m) => {
        const Secao = m.SecaoHoje!
        return <Secao key={m.id} />
      })}
    </div>
  )
}
