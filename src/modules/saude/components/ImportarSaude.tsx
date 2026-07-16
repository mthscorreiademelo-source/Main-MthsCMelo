import { useRef, useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconDownload, IconUpload } from '../../../core/components/Icons'
import { importarSaude, type ResultadoImport } from '../importar'

const MODELO = `data,sono,passos,calorias,fc_repouso,exercicio
2026-07-14,7.5,8200,540,58,35
2026-07-15,6,10450,610,60,0`

export function ImportarSaude({ onFechar }: { onFechar: () => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [res, setRes] = useState<ResultadoImport | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

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

      <p className="text-[12px] text-muted/80">
        Dica: no app Zepp dá para exportar seus dados; se as colunas não baterem, me diga quais
        aparecem no seu arquivo que eu ajusto o reconhecimento.
      </p>
    </FolhaInferior>
  )
}
