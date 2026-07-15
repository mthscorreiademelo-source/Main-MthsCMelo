import { useEffect, useMemo, useState } from 'react'
import { addMonths, format, parseISO } from 'date-fns'
import { EmptyState } from '../../core/components/EmptyState'
import { IconButton } from '../../core/components/Button'
import { IconHumor, IconLixeira, IconSetaEsquerda } from '../../core/components/Icons'
import { hojeISO, rotuloData, rotuloMes } from '../../core/dates'
import { CalendarioHumor } from './components/CalendarioHumor'
import { SeletorHumor } from './components/SeletorHumor'
import {
  contagemPorNivel,
  definirNota,
  excluirHumor,
  HUMORES,
  humorDe,
  mediaHumor,
  registrarHumor,
} from './humor'
import { mapaPorData, useHumores } from './hooks'
import type { NivelHumor } from './types'

export function HumorPage() {
  const registros = useHumores()
  const [mes, setMes] = useState(() => format(new Date(), 'yyyy-MM'))
  const [dataSel, setDataSel] = useState(() => hojeISO())
  const [nota, setNota] = useState('')

  const mapa = useMemo(() => mapaPorData(registros ?? []), [registros])
  const regSel = mapa.get(dataSel)

  const doMes = useMemo(
    () => (registros ?? []).filter((r) => r.data.startsWith(`${mes}-`)),
    [registros, mes],
  )
  const media = mediaHumor(doMes)
  const contagem = contagemPorNivel(doMes)

  // sincroniza o campo de nota com o dia selecionado
  useEffect(() => {
    setNota(regSel?.nota ?? '')
  }, [dataSel, regSel?.nota])

  // salva a nota com debounce (só se o dia já tem humor registrado)
  useEffect(() => {
    if (!regSel) return
    if ((regSel.nota ?? '') === nota) return
    const t = setTimeout(() => definirNota(dataSel, nota), 400)
    return () => clearTimeout(t)
  }, [nota, dataSel, regSel])

  function mudarMes(delta: number) {
    setMes(format(addMonths(parseISO(`${mes}-01`), delta), 'yyyy-MM'))
  }

  const rotuloDia = dataSel === hojeISO() ? 'Hoje' : rotuloData(dataSel)

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {/* Registro do dia */}
      <section className="flex flex-col gap-3 rounded-xl border border-line p-4">
        <h2 className="text-[15px] font-semibold">
          Como foi <span className="text-muted">{rotuloDia.toLowerCase()}</span>?
        </h2>
        <SeletorHumor
          valor={regSel?.nivel}
          onEscolher={(nivel: NivelHumor) => registrarHumor(dataSel, nivel)}
        />
        {regSel && (
          <div className="flex flex-col gap-2">
            <textarea
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              rows={2}
              placeholder="Uma nota sobre o dia (opcional)…"
              className="w-full resize-none rounded-lg border border-line bg-surface/60 px-3 py-2 text-[14px] outline-none transition-colors focus:border-muted/50 placeholder:text-muted/60"
            />
            <button
              onClick={() => excluirHumor(dataSel)}
              className="flex cursor-pointer items-center gap-1 self-start rounded-lg px-1 text-[13px] text-muted transition-colors hover:text-danger"
            >
              <IconLixeira width={14} height={14} />
              Remover registro
            </button>
          </div>
        )}
      </section>

      {/* Navegação de mês */}
      <div className="flex items-center justify-between">
        <IconButton onClick={() => mudarMes(-1)} aria-label="Mês anterior">
          <IconSetaEsquerda width={18} height={18} />
        </IconButton>
        <h2 className="text-[15px] font-semibold">{rotuloMes(mes)}</h2>
        <IconButton onClick={() => mudarMes(1)} aria-label="Próximo mês">
          <IconSetaEsquerda width={18} height={18} className="rotate-180" />
        </IconButton>
      </div>

      <CalendarioHumor
        mes={mes}
        registros={mapa}
        dataSel={dataSel}
        onSelecionar={setDataSel}
      />

      {/* Resumo do mês */}
      {doMes.length === 0 ? (
        <EmptyState
          icone={<IconHumor />}
          titulo="Nenhum registro neste mês"
          descricao="Toque num rosto acima para marcar como foi o seu dia."
        />
      ) : (
        <section className="flex flex-col gap-3 rounded-xl border border-line p-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[12px] text-muted">Humor médio</p>
              <p className="text-[15px] font-semibold">
                {media.toFixed(1)} · {humorDe(Math.round(media) as NivelHumor).rotulo}
              </p>
            </div>
            <p className="text-[13px] text-muted">
              {doMes.length} {doMes.length === 1 ? 'dia registrado' : 'dias registrados'}
            </p>
          </div>

          {/* Barra de distribuição por humor */}
          <div className="flex h-2.5 overflow-hidden rounded-full bg-hover">
            {HUMORES.map((h) => {
              const qtd = contagem[h.nivel - 1]
              if (!qtd) return null
              return (
                <span
                  key={h.nivel}
                  title={`${h.rotulo}: ${qtd}`}
                  style={{ backgroundColor: h.cor, width: `${(qtd / doMes.length) * 100}%` }}
                />
              )
            })}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {HUMORES.map((h) => (
              <span key={h.nivel} className="flex items-center gap-1.5 text-[12px] text-muted">
                <span className="size-2.5 rounded-full" style={{ backgroundColor: h.cor }} />
                {h.rotulo} · {contagem[h.nivel - 1]}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
