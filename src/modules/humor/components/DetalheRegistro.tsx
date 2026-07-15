import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { rotuloData } from '../../../core/dates'
import { IconLixeira } from '../../../core/components/Icons'
import { excluirRegistro, humorDe, urlDoAnexo } from '../humor'
import type { Fator, HumorTipo, Registro } from '../types'
import { IconeFator } from './icones'
import { RostoHumor } from './RostoHumor'

const INTENSIDADE_ROTULO = ['', 'Leve', 'Médio', 'Forte']

interface Props {
  registro: Registro
  humorTipos: HumorTipo[]
  fatores: Map<string, Fator>
  onFechar: () => void
  onEditar: (r: Registro) => void
}

/** Folha inferior com o detalhe de um registro — ver, editar ou excluir. */
export function DetalheRegistro({ registro, humorTipos, fatores, onFechar, onEditar }: Props) {
  const tipo = humorDe(humorTipos, registro.nivel)
  const [url, setUrl] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)

  useEffect(() => {
    if (!registro.anexoId) return
    let u: string | null = null
    let vivo = true
    urlDoAnexo(registro.anexoId).then((r) => {
      if (vivo && r) {
        u = r
        setUrl(r)
      } else if (r) URL.revokeObjectURL(r)
    })
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onFechar()
    window.addEventListener('keydown', esc)
    return () => {
      vivo = false
      if (u) URL.revokeObjectURL(u)
      window.removeEventListener('keydown', esc)
    }
  }, [registro.anexoId, onFechar])

  const marcados = registro.fatorIds.map((id) => fatores.get(id)).filter(Boolean) as Fator[]

  async function excluir() {
    if (!confirmando) {
      setConfirmando(true)
      return
    }
    await excluirRegistro(registro.id)
    onFechar()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onFechar} />
      <div className="animar-passo relative max-h-[85%] overflow-y-auto rounded-t-3xl bg-bg px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+20px)]">
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-line" />

        <div className="mx-auto flex w-full max-w-md flex-col gap-5">
          <div className="flex items-center gap-3">
            <span
              className="flex size-14 items-center justify-center rounded-full"
              style={{ backgroundColor: `${tipo.cor}20` }}
            >
              <RostoHumor nivel={registro.nivel} width={34} height={34} style={{ color: tipo.cor }} />
            </span>
            <div>
              <p className="text-lg font-bold">{tipo.nome}</p>
              <p className="text-[13px] text-muted">
                {rotuloData(registro.data)} · {format(registro.criadoEm, 'HH:mm')}
                {registro.intensidade && ` · ${INTENSIDADE_ROTULO[registro.intensidade]}`}
              </p>
            </div>
          </div>

          {marcados.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {marcados.map((f) => (
                <span
                  key={f.id}
                  className="flex items-center gap-1.5 rounded-full bg-hover px-2.5 py-1 text-[13px] text-muted"
                >
                  <IconeFator nome={f.icone} width={14} height={14} />
                  {f.nome}
                </span>
              ))}
            </div>
          )}

          {registro.nota && (
            <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{registro.nota}</p>
          )}

          {url && (
            <img src={url} alt="" className="max-h-72 rounded-2xl border border-line object-contain" />
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() => onEditar(registro)}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-full bg-ink text-[14px] font-semibold text-bg"
            >
              Editar
            </button>
            <button
              onClick={excluir}
              className={`flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[14px] font-medium transition-colors ${
                confirmando
                  ? 'border-danger bg-danger/10 text-danger'
                  : 'border-line text-muted hover:text-ink'
              }`}
            >
              <IconLixeira width={16} height={16} />
              {confirmando ? 'Confirmar' : 'Excluir'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
