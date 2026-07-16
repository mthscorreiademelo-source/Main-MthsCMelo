import { useRef, useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { IconLivro, IconUpload } from '../../../core/components/Icons'
import { guardarArquivo, novoLivro, salvarLivro, STATUS, TIPOS } from '../db'
import { detectarFormato, extrairMetadados } from '../importar'
import type { FormatoArquivo, StatusLeitura, TipoObra } from '../types'

const CAMPO =
  'min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-[15px] outline-none focus:border-muted/60'

export function AdicionarLivro({ onFechar }: { onFechar: () => void }) {
  const inputArquivo = useRef<HTMLInputElement>(null)
  const [titulo, setTitulo] = useState('')
  const [autor, setAutor] = useState('')
  const [tipo, setTipo] = useState<TipoObra>('livro')
  const [status, setStatus] = useState<StatusLeitura>('quero_ler')
  const [capa, setCapa] = useState<string | undefined>()
  const [paginas, setPaginas] = useState<number | undefined>()
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [formato, setFormato] = useState<FormatoArquivo | undefined>()
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

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
        if (meta.autor) setAutor((a) => a || meta.autor!)
        setTipo(meta.tipo)
        setCapa(meta.capa)
        setPaginas(meta.paginasTotais)
      }
    } finally {
      setLendo(false)
    }
  }

  async function salvar() {
    if (!titulo.trim()) {
      setErro('Dê um título ao livro.')
      return
    }
    const livro = novoLivro({
      titulo: titulo.trim(),
      autor: autor.trim() || undefined,
      tipo,
      status,
      capa,
      paginasTotais: paginas,
      temArquivo: !!arquivo,
      formato,
      arquivoNome: arquivo?.name,
      arquivoTamanho: arquivo?.size,
    })
    try {
      await salvarLivro(livro)
      if (arquivo && formato) await guardarArquivo(livro.id, arquivo, formato, arquivo.name)
    } catch (e) {
      setErro('Não consegui salvar: ' + (e as Error).message)
      return
    }
    onFechar()
  }

  return (
    <FolhaInferior titulo="Adicionar à biblioteca" onFechar={onFechar}>
      <button
        onClick={() => inputArquivo.current?.click()}
        className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-surface/60 px-4 text-center text-muted transition-colors hover:border-muted/50 hover:text-ink"
      >
        {capa ? (
          <img src={capa} alt="" className="h-20 rounded shadow-sm" />
        ) : lendo ? (
          <span className="text-[14px]">Lendo o arquivo…</span>
        ) : (
          <>
            <IconUpload width={20} height={20} />
            <span className="text-[14px] font-medium">Escolher arquivo</span>
            <span className="text-[12px] text-muted/70">EPUB · PDF · CBZ (ou adicione só o registro)</span>
          </>
        )}
      </button>
      <input
        ref={inputArquivo}
        type="file"
        accept=".epub,.pdf,.cbz,.zip,application/epub+zip,application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) escolher(f)
          e.target.value = ''
        }}
      />

      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted">Título</span>
        <input className={CAMPO} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[13px] font-medium text-muted">Autor</span>
        <input className={CAMPO} value={autor} onChange={(e) => setAutor(e.target.value)} />
      </label>

      <div className="flex gap-3">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-[13px] font-medium text-muted">Tipo</span>
          <select className={CAMPO} value={tipo} onChange={(e) => setTipo(e.target.value as TipoObra)}>
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.rotulo}
              </option>
            ))}
          </select>
        </label>
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

      {erro && <p className="text-[13px] text-red-500">{erro}</p>}

      <button
        onClick={salvar}
        disabled={lendo}
        className="flex min-h-12 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-ink text-[15px] font-medium text-surface transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <IconLivro width={18} height={18} />
        Adicionar
      </button>
    </FolhaInferior>
  )
}
