import { CartaoModulo, type ControleCartao } from './CartaoModulo'
import { useInsightIA } from '../../../core/ia/insights'
import { ObservacaoIA } from '../../../core/ia/ObservacaoIA'
import { gerarInsights } from '../db'
import { useAlimentos, useConsultas, usePesos, useVacinas } from '../hooks'
import type { Pet } from '../types'

export function CardInsights({ pet, controle }: { pet: Pet; controle: ControleCartao }) {
  const pesos = usePesos(pet.id)
  const vacinas = useVacinas(pet.id)
  const consultas = useConsultas(pet.id)
  const alimentos = useAlimentos(pet.id)

  const pronto = pesos && vacinas && consultas && alimentos
  const insights = pronto ? gerarInsights(pet, { pesos, vacinas, consultas, alimentos }) : []
  const insightPet = useInsightIA({
    chave: `pet-${pet.id}`,
    contexto: `situação do pet ${pet.nome} (ração, vacinas, consultas, peso)`,
    dados: { observacoes: insights.map((i) => i.texto) },
    assinatura: `${pet.id}|${insights.map((i) => i.texto).join('¦')}`,
    heuristico: insights[0]?.texto ?? null,
  })

  return (
    <CartaoModulo titulo="Insights" emoji="✨" {...controle}>
      {insightPet.fonte === 'ia' && insightPet.texto ? (
        <ObservacaoIA resultado={insightPet} />
      ) : (
      <ul className="flex flex-col gap-2">
        {insights.map((i, idx) => (
          <li key={idx} className="flex gap-2.5">
            <span className="text-[15px]" aria-hidden>{i.icone}</span>
            <span className={`flex-1 text-[13px] leading-snug ${i.tom === 'atencao' ? 'text-ink' : 'text-ink/85'}`}>
              {i.texto}
              {i.tom === 'atencao' && <span className="ml-1 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">atenção</span>}
              {i.tom === 'bom' && <span className="ml-1 rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-600">ok</span>}
            </span>
          </li>
        ))}
      </ul>
      )}
      <p className="mt-3 border-t border-line pt-2 text-[11px] leading-snug text-muted">
        Leituras automáticas do que você registrou (datas, pesos, estoque). São observações — nunca um diagnóstico. Na dúvida, consulte o veterinário.
      </p>
    </CartaoModulo>
  )
}
