import { ModalCentral } from '../../../core/components/ModalCentral'

export type ModoRecorrencia = 'so-esta' | 'proximas' | 'todas'

/**
 * Diálogo de 3 opções (estilo Google Agenda) mostrado sempre que o Matheus
 * edita um campo pelo formulário ou exclui uma ocorrência de um evento
 * recorrente. Arrastar uma ocorrência NUNCA passa por aqui — é sempre
 * "só esta" direto, sem perguntar (ver `destacarOcorrencia` em `db.ts`).
 */
export function DialogoRecorrencia({
  acao,
  onEscolher,
  onCancelar,
}: {
  acao: 'editar' | 'excluir'
  onEscolher: (modo: ModoRecorrencia) => void
  onCancelar: () => void
}) {
  const excluir = acao === 'excluir'
  const opcoes: { modo: ModoRecorrencia; rotulo: string; desc: string }[] = [
    { modo: 'so-esta', rotulo: 'Só esta', desc: excluir ? 'Remove só esta ocorrência' : 'A mudança vale só para esta vez' },
    { modo: 'proximas', rotulo: 'Esta e as próximas', desc: excluir ? 'Remove esta e as seguintes' : 'Vale a partir de agora' },
    { modo: 'todas', rotulo: 'Todas', desc: excluir ? 'Remove a série inteira' : 'Vale para a série inteira' },
  ]

  return (
    <ModalCentral titulo={excluir ? 'Excluir evento recorrente' : 'Editar evento recorrente'} onFechar={onCancelar} larguraMax="max-w-sm">
      <p className="mb-3 text-[13px] text-muted">Este evento faz parte de uma série. O que você quer {excluir ? 'excluir' : 'alterar'}?</p>
      <div className="flex flex-col gap-2">
        {opcoes.map((o) => (
          <button
            key={o.modo}
            onClick={() => onEscolher(o.modo)}
            className={`flex flex-col items-start rounded-xl border border-line px-3.5 py-2.5 text-left transition-colors ${
              excluir ? 'hover:border-red-400 hover:bg-red-500/5' : 'hover:border-accent hover:bg-accent/5'
            }`}
          >
            <span className="text-[14px] font-semibold">{o.rotulo}</span>
            <span className="text-[12px] text-muted">{o.desc}</span>
          </button>
        ))}
      </div>
      <button onClick={onCancelar} className="mt-3 self-center text-[13px] text-muted hover:text-ink">
        Cancelar
      </button>
    </ModalCentral>
  )
}
