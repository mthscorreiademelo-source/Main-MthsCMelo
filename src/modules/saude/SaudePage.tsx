import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconEngrenagem, IconMais, IconUpload } from '../../core/components/Icons'
import { hojeISO } from '../../core/dates'
import { noAppAndroid, ouvirSaude } from '../../core/ponteAndroid'
import { EditorDia } from './components/EditorDia'
import { ImportarSaude } from './components/ImportarSaude'
import { VisaoGeralSaude } from './components/VisaoGeralSaude'
import {
  AbaAlimentacao,
  AbaConsultas,
  AbaDoacao,
  AbaExames,
  AbaLinhaTempo,
  AbaMedicamentos,
  AbaMedidas,
  AbaMetricas,
  AbaTreinos,
  AbaVacinas,
  AjustesSaude,
} from './components/AbasSaude'
import { semearSaudeSePreciso } from './db'
import { useSaudeDia } from './hooks'
import { getUrlPlanilha, sincronizarPlanilha } from './planilha'

export type AbaSaude =
  | 'geral'
  | 'metricas'
  | 'alimentacao'
  | 'treinos'
  | 'exames'
  | 'consultas'
  | 'medicamentos'
  | 'vacinas'
  | 'doacao'
  | 'medidas'
  | 'linha'

const ABAS: { id: AbaSaude; rotulo: string }[] = [
  { id: 'geral', rotulo: 'Visão geral' },
  { id: 'metricas', rotulo: 'Métricas' },
  { id: 'alimentacao', rotulo: 'Alimentação' },
  { id: 'treinos', rotulo: 'Treinos' },
  { id: 'exames', rotulo: 'Exames' },
  { id: 'consultas', rotulo: 'Consultas' },
  { id: 'medicamentos', rotulo: 'Medicamentos' },
  { id: 'vacinas', rotulo: 'Vacinas' },
  { id: 'doacao', rotulo: 'Doação' },
  { id: 'medidas', rotulo: 'Medidas' },
  { id: 'linha', rotulo: 'Linha do tempo' },
]

export function SaudePage() {
  const [aba, setAba] = useState<AbaSaude>('geral')
  const [editando, setEditando] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const [ajustes, setAjustes] = useState(false)
  const [statusApp, setStatusApp] = useState<string | null>(null)
  const jaSincronizou = useRef(false)
  const emApp = noAppAndroid()
  const diaEditado = useSaudeDia(editando ?? '')

  useEffect(() => {
    semearSaudeSePreciso()
  }, [])

  useEffect(() => {
    if (!emApp) return
    return ouvirSaude((e) => setStatusApp(e.mensagem))
  }, [emApp])

  useEffect(() => {
    if (jaSincronizou.current || !getUrlPlanilha()) return
    jaSincronizou.current = true
    sincronizarPlanilha().catch(() => {})
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      {/* Cabeçalho */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-[22px] font-bold">Saúde</h1>
          <p className="text-[12px] capitalize text-muted">{format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setEditando(hojeISO())} className="flex min-h-9 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[14px] font-medium text-surface">
            <IconMais width={16} height={16} /> Registrar dia
          </button>
          <button onClick={() => setImportando(true)} aria-label="Importar" className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink">
            <IconUpload width={17} height={17} />
          </button>
          <button onClick={() => setAjustes(true)} aria-label="Ajustes de Saúde" className="flex size-9 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink">
            <IconEngrenagem width={18} height={18} />
          </button>
        </div>
      </div>

      {statusApp && <p className="text-[12px] text-muted">{statusApp}</p>}

      {/* Abas */}
      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${aba === a.id ? 'bg-ink text-surface' : 'text-muted hover:bg-hover hover:text-ink'}`}
          >
            {a.rotulo}
          </button>
        ))}
      </div>

      {aba === 'geral' && <VisaoGeralSaude onIrAba={setAba} onEditarDia={() => setEditando(hojeISO())} />}
      {aba === 'metricas' && <AbaMetricas emApp={emApp} onEditarDia={setEditando} />}
      {aba === 'alimentacao' && <AbaAlimentacao />}
      {aba === 'treinos' && <AbaTreinos />}
      {aba === 'exames' && <AbaExames />}
      {aba === 'consultas' && <AbaConsultas />}
      {aba === 'medicamentos' && <AbaMedicamentos />}
      {aba === 'vacinas' && <AbaVacinas />}
      {aba === 'doacao' && <AbaDoacao />}
      {aba === 'medidas' && <AbaMedidas />}
      {aba === 'linha' && <AbaLinhaTempo />}

      {editando && <EditorDia data={editando} dia={diaEditado} onFechar={() => setEditando(null)} />}
      {importando && <ImportarSaude onFechar={() => setImportando(false)} />}
      {ajustes && <AjustesSaude onFechar={() => setAjustes(false)} />}
    </div>
  )
}
