import { useState } from 'react'
import { FolhaInferior } from '../components/FolhaInferior'
import {
  getPapel,
  PADRAO_DARK,
  PADRAO_LIGHT,
  PRESETS_DARK,
  PRESETS_LIGHT,
  setPapel,
  type Tema,
} from './papel'

function Secao({
  titulo,
  presets,
  atual,
  ehEscuro,
  onEscolher,
}: {
  titulo: string
  presets: { nome: string; cor: string }[]
  atual: string
  ehEscuro: boolean
  onEscolher: (cor: string) => void
}) {
  return (
    <div>
      <span className="text-[12px] font-medium text-muted">{titulo}</span>
      <div className="mt-1.5 flex flex-wrap items-center gap-2">
        {presets.map((p) => {
          const sel = p.cor.toLowerCase() === atual.toLowerCase()
          return (
            <button
              key={p.cor}
              onClick={() => onEscolher(p.cor)}
              title={p.nome}
              className={`size-8 rounded-full border transition-transform ${sel ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg' : 'border-line hover:scale-110'}`}
              style={{ backgroundColor: p.cor, borderColor: ehEscuro ? '#ffffff22' : '#00000018' }}
            />
          )
        })}
        <label className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-line text-[13px] text-muted" title="Cor personalizada">
          🎨
          <input type="color" value={atual} onChange={(e) => onEscolher(e.target.value)} className="sr-only" />
        </label>
        <span className="text-[11px] tabular-nums text-muted">{atual}</span>
      </div>
    </div>
  )
}

/** Escolha do "papel" (fundo) do app para os modos claro e escuro. */
export function AparenciaSheet({ tema, alternar, onFechar }: { tema: Tema; alternar: () => void; onFechar: () => void }) {
  const [light, setLight] = useState(getPapel('light'))
  const [dark, setDark] = useState(getPapel('dark'))

  function escolher(t: Tema, cor: string) {
    if (t === 'light') setLight(cor)
    else setDark(cor)
    setPapel(t, cor, tema)
  }
  function restaurar() {
    escolher('light', PADRAO_LIGHT)
    escolher('dark', PADRAO_DARK)
  }

  return (
    <FolhaInferior titulo="Aparência — papel do app" onFechar={onFechar}>
      <div className="flex flex-col gap-4">
        <p className="text-[13px] leading-snug text-muted">
          Escolha o tom exato de fundo — do branco ao amarelado no claro, do preto ao cinza no escuro. As superfícies e linhas se ajustam sozinhas para o app parecer um caderno.
        </p>

        <div className="flex items-center justify-between rounded-xl border border-line px-3 py-2">
          <span className="text-[13px] font-medium">Editando/pré-visualizando: {tema === 'dark' ? 'Modo escuro' : 'Modo claro'}</span>
          <button onClick={alternar} className="rounded-full border border-line px-2.5 py-1 text-[12px] font-medium text-muted hover:text-ink">
            Trocar para {tema === 'dark' ? 'claro' : 'escuro'}
          </button>
        </div>

        <Secao titulo="Papel — modo claro" presets={PRESETS_LIGHT} atual={light} ehEscuro={false} onEscolher={(c) => escolher('light', c)} />
        <Secao titulo="Papel — modo escuro" presets={PRESETS_DARK} atual={dark} ehEscuro onEscolher={(c) => escolher('dark', c)} />

        <button onClick={restaurar} className="min-h-10 rounded-xl border border-line text-[13px] font-medium text-muted hover:text-ink">
          Restaurar padrão
        </button>
      </div>
    </FolhaInferior>
  )
}
