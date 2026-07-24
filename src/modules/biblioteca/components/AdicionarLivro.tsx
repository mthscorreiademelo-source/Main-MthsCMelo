import { useRef, useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconLivro, IconMais, IconUpload } from '../../../core/components/Icons'
import { guardarArquivo, novoLivro, salvarLivro, STATUS, TIPOS } from '../db'
import { detectarFormato, extrairMetadados, gerarMiniatura } from '../importar'
import type { FormatoArquivo, StatusLeitura, TipoObra } from '../types'
import { CapaImg } from './CapaImg'
import { EditorTags } from './EditorTags'
import { EntradaLinkCapa } from './EntradaLinkCapa'

const CAMPO =
  'min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-[15px] outline-none focus:border-muted/60'

export function AdicionarLivro({
  onFechar,
  compiladoAlvo,
}: {
  onFechar: () => void
  /** Quando presente, adiciona um VOLUME a este compilado (tipo fixo). */
  compiladoAlvo?: { id: string; tipo: TipoObra; titulo: string }
}) {
  const inputArquivo = useRef<HTMLInputElement>(null)
  const inputCapa = useRef<HTMLInputElement>(null)
  const inputTitulo = useRef<HTMLInputElement>(null)
  const [titulo, setTitulo] = useState('')
  const [autores, setAutores] = useState<string[]>([])
  const [tipo, setTipo] = useState<TipoObra>(compiladoAlvo?.tipo ?? 'livro')
  const [modoCompilado, setModoCompilado] = useState(false)
  const [status, setStatus] = useState<StatusLeitura>('quero_ler')
  const [colecao, setColecao] = useState('')
  const [numero, setNumero] = useState('')
  const [generos, setGeneros] = useState<string[]>([])
  const [capa, setCapa] = useState<string | undefined>()
  const [paginas, setPaginas] = useState<number | undefined>()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [formato, setFormato] = useState<FormatoArquivo | undefined>()
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const souVolume = !!compiladoAlvo
  const podeCompilar = !souVolume && (tipo === 'quadrinho' || tipo === 'manga')
  const ehComp = podeCompilar && modoCompilado

  async function escolher(file: File) {
    setErro(null)
    const fmt = detectarFormato(file)
    if (!fmt) {
      setErro('Formato não suportado. Use EPUB, PDF ou CBZ.')
      return
    }
    setLendo(true)
    setArquivo(file)
    setFormato(fmt)
    try {
      const meta = await extrairMetadados(file)
      if (meta) {
        setTitulo((t) => t || meta.titulo)
        if (meta.autor) setAutores((a) => (a.length ? a : [meta.autor!]))
        setTipo(meta.tipo)
        setCapa(meta.capa)
        setPaginas(meta.paginasTotais)
      }
    } finally {
      setLendo(false)
    }
  }

  async function escolherCapa(file: File) {
    setErro(null)
    const mini = await gerarMiniatura(file, 400)
    if (mini) setCapa(mini)
    else setErro('Não consegui ler essa imagem.')
  }

  async function salvar() {
    if (!titulo.trim()) {
      setErro('Dê um título ao livro para adicionar.')
      inputTitulo.current?.focus()
      inputTitulo.current?.scrollIntoView({ block: 'center' })
      return
    }
    const livro = novoLivro({
      titulo: titulo.trim(),
      autores: autores.length ? autores : undefined,
      tipo: compiladoAlvo ? compiladoAlvo.tipo : tipo,
      status,
      colecao: !ehComp && !souVolume ? colecao.trim() || undefined : undefined,
      numero: !ehComp && numero.trim() ? Number(numero) : undefined,
      generos: generos.length ? generos : undefined,
      capa,
      paginasTotais: ehComp ? undefined : paginas,
      ehCompilado: ehComp || undefined,
      compiladoId: compiladoAlvo?.id,
      temArquivo: !ehComp && !!arquivo,
      formato: ehComp ? undefined : formato,
      arquivoNome: ehComp ? undefined : arquivo?.name,
      arquivoTamanho: ehComp ? undefined : arquivo?.size,
    })
    try {
      await salvarLivro(livro)
      if (!ehComp && arquivo && formato) await guardarArquivo(livro.id, arquivo, formato, arquivo.name)
    } catch (e) {
      setErro('Não consegui salvar: ' + (e as Error).message)
      return
    }
    onFechar()
  }

  const semCapaMini = (
    <span className="flex flex-col items-center gap-1 text-muted">
      <IconMais width={18} height={18} />
      <span className="text-[11px]">Capa</span>
    </span>
  )

  const tituloFolha = souVolume
    ? `Novo volume · ${compiladoAlvo!.titulo}`
    : ehComp
      ? 'Novo compilado'
      : 'Adicionar à biblioteca'

  return (
    <FolhaInferior titulo={tituloFolha} onFechar={onFechar}>
      <div className="flex gap-3">
        {/* Capa (imagem) — pode ser definida mesmo sem o arquivo do livro */}
        <div className="flex w-24 shrink-0 flex-col gap-1">
          <button
            onClick={() => inputCapa.current?.click()}
            className="flex aspect-[2/3] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-line bg-surface transition-colors hover:border-muted/50"
            aria-label="Escolher capa"
          >
            {capa ? (
              <CapaImg src={capa} className="h-full w-full object-cover" fallback={semCapaMini} />
            ) : (
              semCapaMini
            )}
          </button>
          <EntradaLinkCapa onLink={setCapa} />
        </div>

        {/* Arquivo do livro (compilado não tem arquivo próprio) */}
        <div className="flex flex-1 flex-col justify-center gap-2">
          {ehComp ? (
            <p className="rounded-xl border border-dashed border-line bg-surface/60 px-3 py-4 text-center text-[12px] text-muted">
              Um compilado agrupa volumes. Crie-o e depois adicione os volumes (cada um com seu arquivo) dentro dele.
            </p>
          ) : (
            <button
              onClick={() => inputArquivo.current?.click()}
              className="flex min-h-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line bg-surface/60 px-3 text-center text-muted transition-colors hover:border-muted/50 hover:text-ink"
            >
              {lendo ? (
                <span className="text-[13px]">Lendo o arquivo…</span>
              ) : arquivo ? (
                <>
                  <span className="max-w-full truncate text-[13px] font-medium text-ink">{arquivo.name}</span>
                  <span className="text-[11px] text-muted/70">{formato?.toUpperCase()}</span>
                </>
              ) : (
                <>
                  <IconUpload width={18} height={18} />
                  <span className="text-[13px] font-medium">Arquivo do livro</span>
                  <span className="text-[11px] text-muted/70">EPUB · PDF · CBZ (opcional)</span>
                </>
              )}
            </button>
          )}
          {capa && (
            <button
              onClick={() => setCapa(undefined)}
              className="self-start text-[12px] text-muted transition-colors hover:text-ink"
            >
              remover capa
            </button>
          )}
        </div>
      </div>
      <input
        ref={inputArquivo}
        type="file"
        accept=".epub,.pdf,.cbz,.zip,.mobi,.azw,.azw3,application/epub+zip,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) escolher(f)
          e.target.value = ''
        }}
      />
      <input
        ref={inputCapa}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) escolherCapa(f)
          e.target.value = ''
        }}
      />

      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted">Título</span>
        <input
          ref={inputTitulo}
          className={CAMPO}
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder={ehComp ? 'Nome da série (ex.: One Piece)' : 'Nome do livro'}
        />
      </label>
      {!ehComp && (
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-muted">Autores</span>
          <EditorTags
            tags={autores}
            onChange={setAutores}
            rotulo="Autores"
            placeholder="ex.: Nome do autor (Enter para adicionar)"
          />
        </div>
      )}

      {/* Tipo (some quando é volume de um compilado — herda o tipo) */}
      <div className="flex gap-3">
        {!souVolume && (
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-[13px] font-medium text-muted">Tipo</span>
            <select
              className={CAMPO}
              value={tipo}
              onChange={(e) => {
                setTipo(e.target.value as TipoObra)
                if (!(e.target.value === 'quadrinho' || e.target.value === 'manga')) setModoCompilado(false)
              }}
            >
              {TIPOS.map((t) => (
                <option key={t.valor} value={t.valor}>
                  {t.rotulo}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[13px] font-medium text-muted">Estante</span>
          <select
            className={CAMPO}
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusLeitura)}
          >
            {STATUS.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Volume avulso × Compilado (só quadrinho/mangá) */}
      {podeCompilar && (
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-medium text-muted">Como adicionar</span>
          <div className="flex overflow-hidden rounded-lg border border-line">
            <button
              onClick={() => setModoCompilado(false)}
              aria-pressed={!modoCompilado}
              className={`min-h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${!modoCompilado ? 'bg-hover text-ink' : 'text-muted hover:bg-hover/60'}`}
            >
              Volume avulso
            </button>
            <button
              onClick={() => setModoCompilado(true)}
              aria-pressed={modoCompilado}
              className={`min-h-10 flex-1 cursor-pointer text-sm font-medium transition-colors ${modoCompilado ? 'bg-hover text-ink' : 'text-muted hover:bg-hover/60'}`}
            >
              Compilado (série)
            </button>
          </div>
        </div>
      )}

      {/* Coleção (livros avulsos) / Nº do volume */}
      {!ehComp && (
        <div className="flex gap-3">
          {!souVolume && (
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-[13px] font-medium text-muted">Coleção / série</span>
              <input
                className={CAMPO}
                value={colecao}
                onChange={(e) => setColecao(e.target.value)}
                placeholder="ex.: Senhor dos Anéis"
              />
            </label>
          )}
          <label className={`flex flex-col gap-1 ${souVolume ? 'flex-1' : 'w-20'}`}>
            <span className="text-[13px] font-medium text-muted">{souVolume ? 'Volume nº' : 'Nº'}</span>
            <input
              className={CAMPO}
              type="number"
              min={1}
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="1"
            />
          </label>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted">Gêneros / tags</span>
        <EditorTags tags={generos} onChange={setGeneros} rotulo="Gêneros" placeholder="ex.: ficção, fantasia" />
      </div>

      {erro && <p className="text-[13px] text-red-500">{erro}</p>}

      <button
        onClick={salvar}
        disabled={lendo}
        className="flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-ink text-[15px] font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <IconLivro width={18} height={18} />
        {ehComp ? 'Criar compilado' : souVolume ? 'Adicionar volume' : 'Adicionar'}
      </button>
    </FolhaInferior>
  )
}
