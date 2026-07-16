import { useRef, useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconDownload, IconNuvem, IconUpload } from '../../../core/components/Icons'
import { importarSaude, type ResultadoImport } from '../importar'
import { getUrlPlanilha, setUrlPlanilha, sincronizarPlanilha } from '../planilha'

const MODELO = `data,sono,passos,calorias,fc_repouso,exercicio
2026-07-14,7.5,8200,540,58,35
2026-07-15,6,10450,610,60,0`

export function ImportarSaude({ onFechar }: { onFechar: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [res, setRes] = useState<ResultadoImport | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [urlPlan, setUrlPlan] = useState(getUrlPlanilha())

  async function conectarPlanilha() {
    setUrlPlanilha(urlPlan)
    if (!urlPlan.trim()) return
    setOcupado(true)
    setErro(null)
    setRes(null)
    try {
      setRes(await sincronizarPlanilha())
    } catch (e) {
      setErro((e as Error)?.message ?? 'Não foi possível ler a planilha.')
    } finally {
      setOcupado(false)
    }
  }

  async function importar(arquivo: File) {
    setOcupado(true)
    setErro(null)
    setRes(null)
    try {
      const texto = await arquivo.text()
      setRes(await importarSaude(texto))
    } catch (e) {
      setErro((e as Error)?.message ?? 'Não foi possível ler o arquivo.')
    } finally {
      setOcupado(false)
    }
  }

  function baixarModelo() {
    const url = URL.createObjectURL(new Blob([MODELO], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo-saude-lume.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 2000)
  }

  return (
    <FolhaInferior titulo="Importar dados de saúde" onFechar={onFechar}>
      <p className="text-[13px] leading-relaxed text-muted">
        Envie um arquivo <strong>CSV</strong> ou <strong>JSON</strong> com uma linha por dia. O Lume
        reconhece colunas como <code>data</code>, <code>sono</code> (horas), <code>passos</code>,{' '}
        <code>calorias</code>, <code>fc_repouso</code> e <code>exercicio</code> (minutos) — em
        português ou inglês.
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => input.current?.click()}
          disabled={ocupado}
          className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-ink text-[15px] font-semibold text-bg disabled:opacity-50"
        >
          <IconUpload width={18} height={18} />
          {ocupado ? 'Importando…' : 'Escolher arquivo'}
        </button>
        <button
          onClick={baixarModelo}
          className="flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line px-4 text-[14px] font-medium text-muted transition-colors hover:text-ink"
        >
          <IconDownload width={16} height={16} />
          Modelo
        </button>
      </div>

      <input
        ref={input}
        type="file"
        accept=".csv,.json,.txt,text/csv,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) importar(f)
          e.target.value = ''
        }}
      />

      {res && (
        <div className="rounded-xl border border-line bg-surface/60 p-3 text-[13px]">
          <p className="font-semibold text-ink">
            {res.dias} dia(s) importado(s).
            {res.ignoradas > 0 && (
              <span className="font-normal text-muted"> {res.ignoradas} linha(s) ignorada(s).</span>
            )}
          </p>
          {res.colunas.length > 0 ? (
            <p className="mt-1 text-muted">Colunas reconhecidas: {res.colunas.join(', ')}.</p>
          ) : (
            <p className="mt-1 text-danger">
              Nenhuma coluna reconhecida — confira os nomes das colunas ou use o modelo.
            </p>
          )}
        </div>
      )}
      {erro && <p className="text-[13px] text-danger">{erro}</p>}

      {/* Conectar planilha do Google (importação recorrente) */}
      <div className="mt-1 flex flex-col gap-2 border-t border-line pt-4">
        <p className="flex items-center gap-1.5 text-[14px] font-semibold">
          <IconNuvem width={16} height={16} className="text-accent" />
          Conectar planilha do Google
        </p>
        <p className="text-[12px] leading-relaxed text-muted">
          Cole o link de uma Planilha Google com os mesmos tipos de coluna. Publique-a em{' '}
          <strong>Arquivo → Compartilhar → Publicar na web → CSV</strong>. O Lume relê e importa a
          cada vez que você abre a Saúde.
        </p>
        <input
          value={urlPlan}
          onChange={(e) => setUrlPlan(e.target.value)}
          placeholder="https://docs.google.com/spreadsheets/…"
          className="w-full rounded-xl border border-line bg-surface/60 px-3 py-2.5 text-[13px] outline-none transition-colors focus:border-muted/50 placeholder:text-muted/50"
        />
        <button
          onClick={conectarPlanilha}
          disabled={ocupado}
          className="flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-line text-[14px] font-medium text-muted transition-colors hover:text-ink disabled:opacity-50"
        >
          {ocupado ? 'Lendo…' : getUrlPlanilha() ? 'Salvar e sincronizar' : 'Conectar e sincronizar'}
        </button>
      </div>

      <p className="text-[12px] text-muted/80">
        Dica: um app-ponte no Android (que leva os dados do Amazfit/Health Connect para uma
        Planilha) deixa isso quase automático. Se as colunas não baterem, me diga quais aparecem
        que eu ajusto o reconhecimento.
      </p>
    </FolhaInferior>
  )
}
