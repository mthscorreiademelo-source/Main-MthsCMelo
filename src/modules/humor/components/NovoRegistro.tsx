import { useMemo, useRef, useState } from 'react'
import {
  IconCaneta,
  IconFechar,
  IconImagem,
  IconLixeira,
  IconSetaEsquerda,
} from '../../../core/components/Icons'
import { rotuloData } from '../../../core/dates'
import { atualizarRegistro, criarRegistro, humorDe, salvarAnexo } from '../humor'
import type { Categoria, Fator, HumorTipo, Intensidade, NivelHumor, Registro } from '../types'
import { DiscoHumor } from './RostoHumor'
import { IconeFator } from './icones'
import { SketchPad } from './SketchPad'

interface Props {
  data: string
  humorTipos: HumorTipo[]
  categorias: Categoria[]
  fatores: Fator[]
  registro?: Registro
  onFechar: () => void
  onSalvo: () => void
}

const INTENSIDADES: { valor: Intensidade; rotulo: string }[] = [
  { valor: 1, rotulo: 'Leve' },
  { valor: 2, rotulo: 'Médio' },
  { valor: 3, rotulo: 'Forte' },
]

const TOTAL_PASSOS = 5

export function NovoRegistro({
  data,
  humorTipos,
  categorias,
  fatores,
  registro,
  onFechar,
  onSalvo,
}: Props) {
  const [passo, setPasso] = useState(0)
  const [nivel, setNivel] = useState<NivelHumor | null>(registro?.nivel ?? null)
  const [intensidade, setIntensidade] = useState<Intensidade | undefined>(registro?.intensidade)
  const [fatorIds, setFatorIds] = useState<Set<string>>(new Set(registro?.fatorIds ?? []))
  const [nota, setNota] = useState(registro?.nota ?? '')
  const [anexo, setAnexo] = useState<{ blob: Blob; tipo: 'foto' | 'desenho'; url: string } | null>(
    null,
  )
  const [modoDesenho, setModoDesenho] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const inputFoto = useRef<HTMLInputElement>(null)

  const emocoes = useMemo(
    () => fatores.filter((f) => f.categoriaId === 'cat-emocoes' && !f.arquivado),
    [fatores],
  )
  const categoriasAtividade = useMemo(
    () => categorias.filter((c) => c.id !== 'cat-emocoes'),
    [categorias],
  )

  function alternarFator(id: string) {
    setFatorIds((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  function definirFoto(file: File) {
    if (anexo) URL.revokeObjectURL(anexo.url)
    setAnexo({ blob: file, tipo: 'foto', url: URL.createObjectURL(file) })
    setModoDesenho(false)
  }

  function definirDesenho(blob: Blob | null) {
    if (anexo?.tipo === 'desenho') URL.revokeObjectURL(anexo.url)
    if (blob) setAnexo({ blob, tipo: 'desenho', url: URL.createObjectURL(blob) })
    else if (anexo?.tipo === 'desenho') setAnexo(null)
  }

  function removerAnexo() {
    if (anexo) URL.revokeObjectURL(anexo.url)
    setAnexo(null)
    setModoDesenho(false)
  }

  async function salvar() {
    if (!nivel) return
    setSalvando(true)
    let anexoId = registro?.anexoId
    let anexoTipo = registro?.anexoTipo
    if (anexo) {
      anexoId = await salvarAnexo(anexo.blob, anexo.tipo === 'foto' ? 'foto.png' : 'desenho.png')
      anexoTipo = anexo.tipo
    }
    if (registro) {
      await atualizarRegistro(registro.id, {
        nivel,
        intensidade,
        fatorIds: [...fatorIds],
        nota: nota.trim() || undefined,
        anexoId,
        anexoTipo,
      })
    } else {
      await criarRegistro({
        data,
        nivel,
        intensidade,
        fatorIds: [...fatorIds],
        nota,
        anexoId,
        anexoTipo,
      })
    }
    onSalvo()
  }

  const tipoSel = nivel ? humorDe(humorTipos, nivel) : null
  const ultimo = passo === TOTAL_PASSOS - 1

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg">
      {/* Cabeçalho: progresso + fechar */}
      <header className="flex items-center gap-3 px-5 pt-[calc(env(safe-area-inset-top)+14px)] pb-3">
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: TOTAL_PASSOS }, (_, i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-full transition-colors duration-300"
              style={{
                backgroundColor:
                  i <= passo ? (tipoSel?.cor ?? 'var(--vida-ink)') : 'var(--vida-line)',
              }}
            />
          ))}
        </div>
        <button
          onClick={onFechar}
          aria-label="Fechar"
          className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-hover"
        >
          <IconFechar width={20} height={20} />
        </button>
      </header>

      {/* Conteúdo do passo */}
      <div key={passo} className="animar-passo flex-1 overflow-y-auto px-5">
        <div className="mx-auto flex w-full max-w-md flex-col gap-5 py-4">
          {passo === 0 && (
            <PassoHumor
              data={data}
              humorTipos={humorTipos}
              nivel={nivel}
              onEscolher={setNivel}
            />
          )}
          {passo === 1 && (
            <PassoIntensidade
              cor={tipoSel?.cor ?? '#888'}
              intensidade={intensidade}
              onEscolher={setIntensidade}
            />
          )}
          {passo === 2 && (
            <PassoChips
              titulo="Quais emoções?"
              subtitulo="Marque as que sentiu (opcional)."
              fatores={emocoes}
              selecionados={fatorIds}
              onAlternar={alternarFator}
            />
          )}
          {passo === 3 && (
            <PassoFatores
              categorias={categoriasAtividade}
              fatores={fatores}
              selecionados={fatorIds}
              onAlternar={alternarFator}
            />
          )}
          {passo === 4 && (
            <PassoNota
              nota={nota}
              onNota={setNota}
              anexo={anexo}
              modoDesenho={modoDesenho}
              onAbrirFoto={() => inputFoto.current?.click()}
              onAlternarDesenho={() => setModoDesenho((v) => !v)}
              onDesenho={definirDesenho}
              onRemoverAnexo={removerAnexo}
            />
          )}
        </div>
      </div>

      {/* Rodapé: navegação */}
      <footer className="flex items-center gap-3 px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        {passo > 0 ? (
          <button
            onClick={() => setPasso((p) => p - 1)}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-line text-muted transition-colors hover:bg-hover"
            aria-label="Voltar"
          >
            <IconSetaEsquerda width={18} height={18} />
          </button>
        ) : (
          <span className="w-11" />
        )}

        {!ultimo && passo > 0 && (
          <button
            onClick={() => setPasso((p) => p + 1)}
            className="cursor-pointer px-2 text-[14px] font-medium text-muted transition-colors hover:text-ink"
          >
            Pular
          </button>
        )}

        <div className="flex-1" />

        {ultimo ? (
          <button
            onClick={salvar}
            disabled={!nivel || salvando}
            className="flex min-h-12 cursor-pointer items-center rounded-full bg-ink px-7 text-[15px] font-semibold text-bg transition-opacity disabled:opacity-40"
          >
            {salvando ? 'Salvando…' : registro ? 'Atualizar' : 'Salvar'}
          </button>
        ) : (
          <button
            onClick={() => setPasso((p) => p + 1)}
            disabled={passo === 0 && !nivel}
            className="flex min-h-12 cursor-pointer items-center rounded-full bg-ink px-7 text-[15px] font-semibold text-bg transition-opacity disabled:opacity-40"
          >
            Continuar
          </button>
        )}
      </footer>

      <input
        ref={inputFoto}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) definirFoto(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

// ─── Passos ──────────────────────────────────────────────────────────────────

function PassoHumor({
  data,
  humorTipos,
  nivel,
  onEscolher,
}: {
  data: string
  humorTipos: HumorTipo[]
  nivel: NivelHumor | null
  onEscolher: (n: NivelHumor) => void
}) {
  return (
    <div className="flex flex-col items-center gap-6 pt-4 text-center">
      <div>
        <p className="text-[13px] text-muted">{rotuloData(data)}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight">Como você está?</h2>
      </div>
      <div className="flex w-full items-start justify-between gap-1">
        {humorTipos.map((t) => (
          <DiscoHumor
            key={t.nivel}
            nivel={t.nivel}
            cor={t.cor}
            ativo={nivel === t.nivel}
            rotulo={t.nome}
            tamanho={56}
            onClick={() => onEscolher(t.nivel)}
          />
        ))}
      </div>
    </div>
  )
}

function PassoIntensidade({
  cor,
  intensidade,
  onEscolher,
}: {
  cor: string
  intensidade?: Intensidade
  onEscolher: (i: Intensidade) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Com que intensidade?</h2>
        <p className="mt-1 text-[14px] text-muted">O quão forte foi esse sentimento.</p>
      </div>
      <div className="flex gap-2">
        {INTENSIDADES.map((i) => {
          const ativo = intensidade === i.valor
          return (
            <button
              key={i.valor}
              onClick={() => onEscolher(i.valor)}
              className="flex min-h-14 flex-1 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border transition-all"
              style={{
                borderColor: ativo ? cor : 'var(--vida-line)',
                backgroundColor: ativo ? `${cor}14` : 'transparent',
              }}
            >
              <span className="flex gap-1">
                {[1, 2, 3].map((n) => (
                  <span
                    key={n}
                    className="size-2 rounded-full transition-colors"
                    style={{ backgroundColor: n <= i.valor ? cor : 'var(--vida-line)' }}
                  />
                ))}
              </span>
              <span className={`text-[13px] ${ativo ? 'font-semibold text-ink' : 'text-muted'}`}>
                {i.rotulo}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Chip({
  fator,
  ativo,
  onClick,
}: {
  fator: Fator
  ativo: boolean
  onClick: () => void
}) {
  const cor = fator.cor
  return (
    <button
      onClick={onClick}
      aria-pressed={ativo}
      className="flex min-h-10 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-[13.5px] transition-all"
      style={{
        borderColor: ativo ? (cor ?? 'var(--vida-ink)') : 'var(--vida-line)',
        backgroundColor: ativo ? (cor ? `${cor}1a` : 'var(--vida-hover)') : 'transparent',
        color: ativo ? 'var(--vida-ink)' : 'var(--vida-muted)',
        fontWeight: ativo ? 600 : 400,
      }}
    >
      <IconeFator nome={fator.icone} width={16} height={16} />
      {fator.nome}
    </button>
  )
}

function PassoChips({
  titulo,
  subtitulo,
  fatores,
  selecionados,
  onAlternar,
}: {
  titulo: string
  subtitulo: string
  fatores: Fator[]
  selecionados: Set<string>
  onAlternar: (id: string) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">{titulo}</h2>
        <p className="mt-1 text-[14px] text-muted">{subtitulo}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {fatores.map((f) => (
          <Chip
            key={f.id}
            fator={f}
            ativo={selecionados.has(f.id)}
            onClick={() => onAlternar(f.id)}
          />
        ))}
      </div>
    </div>
  )
}

function PassoFatores({
  categorias,
  fatores,
  selecionados,
  onAlternar,
}: {
  categorias: Categoria[]
  fatores: Fator[]
  selecionados: Set<string>
  onAlternar: (id: string) => void
}) {
  const [recolhidas, setRecolhidas] = useState<Set<string>>(new Set())
  function alternar(id: string) {
    setRecolhidas((s) => {
      const n = new Set(s)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">O que rolou hoje?</h2>
        <p className="mt-1 text-[14px] text-muted">Atividades e fatores do seu dia.</p>
      </div>
      <div className="flex flex-col gap-3">
        {categorias.map((c) => {
          const lista = fatores.filter((f) => f.categoriaId === c.id && !f.arquivado)
          if (lista.length === 0) return null
          const recolhida = recolhidas.has(c.id)
          const marcados = lista.filter((f) => selecionados.has(f.id)).length
          return (
            <section key={c.id} className="rounded-xl border border-line p-3">
              <button
                onClick={() => alternar(c.id)}
                className="flex w-full cursor-pointer items-center gap-2 text-left"
              >
                <IconeFator nome={c.icone} width={17} height={17} className="text-muted" />
                <span className="flex-1 text-[14px] font-semibold">{c.nome}</span>
                {marcados > 0 && (
                  <span className="rounded-full bg-hover px-2 py-0.5 text-[11px] font-semibold text-muted">
                    {marcados}
                  </span>
                )}
                <IconeFator
                  nome="onda"
                  className={`text-muted/50 transition-transform ${recolhida ? '' : 'rotate-180'}`}
                  width={14}
                  height={14}
                />
              </button>
              {!recolhida && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {lista.map((f) => (
                    <Chip
                      key={f.id}
                      fator={f}
                      ativo={selecionados.has(f.id)}
                      onClick={() => onAlternar(f.id)}
                    />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function PassoNota({
  nota,
  onNota,
  anexo,
  modoDesenho,
  onAbrirFoto,
  onAlternarDesenho,
  onDesenho,
  onRemoverAnexo,
}: {
  nota: string
  onNota: (v: string) => void
  anexo: { blob: Blob; tipo: 'foto' | 'desenho'; url: string } | null
  modoDesenho: boolean
  onAbrirFoto: () => void
  onAlternarDesenho: () => void
  onDesenho: (b: Blob | null) => void
  onRemoverAnexo: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Quer registrar algo?</h2>
        <p className="mt-1 text-[14px] text-muted">Uma nota, foto ou desenho — tudo opcional.</p>
      </div>
      <textarea
        value={nota}
        onChange={(e) => onNota(e.target.value)}
        rows={4}
        placeholder="Escreva sobre o seu dia…"
        className="w-full resize-none rounded-xl border border-line bg-surface/60 px-4 py-3 text-[15px] leading-relaxed outline-none transition-colors focus:border-muted/50 placeholder:text-muted/60"
      />

      {anexo ? (
        <div className="relative w-fit">
          <img
            src={anexo.url}
            alt=""
            className="max-h-56 rounded-xl border border-line object-contain"
          />
          <button
            onClick={onRemoverAnexo}
            aria-label="Remover anexo"
            className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white"
          >
            <IconLixeira width={16} height={16} />
          </button>
        </div>
      ) : modoDesenho ? (
        <SketchPad onMudar={onDesenho} />
      ) : (
        <div className="flex gap-2">
          <button
            onClick={onAbrirFoto}
            className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line text-[14px] font-medium text-muted transition-colors hover:border-muted/50 hover:text-ink"
          >
            <IconImagem width={18} height={18} />
            Foto
          </button>
          <button
            onClick={onAlternarDesenho}
            className="flex min-h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line text-[14px] font-medium text-muted transition-colors hover:border-muted/50 hover:text-ink"
          >
            <IconCaneta width={18} height={18} />
            Desenho
          </button>
        </div>
      )}
    </div>
  )
}
