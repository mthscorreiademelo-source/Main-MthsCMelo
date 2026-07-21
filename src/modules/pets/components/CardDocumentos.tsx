import { useRef, useState } from 'react'
import { format } from 'date-fns'
import { IconMais } from '../../../core/components/Icons'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { CartaoModulo, Vazio, type ControleCartao } from './CartaoModulo'
import { adicionarDocumento, CATEGORIAS_DOC, obterPetArquivo, removerDocumento } from '../db'
import { useDocumentos } from '../hooks'
import type { CategoriaDoc, Pet } from '../types'

function tamanhoLegivel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function CardDocumentos({ pet, controle }: { pet: Pet; controle: ControleCartao }) {
  const docs = useDocumentos(pet.id)
  const ref = useRef<HTMLInputElement>(null)
  const [pendente, setPendente] = useState<File | null>(null)
  const [cat, setCat] = useState<CategoriaDoc>('outro')

  function escolher(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) setPendente(f)
    e.target.value = ''
  }
  async function confirmar() {
    if (!pendente) return
    await adicionarDocumento(pet.id, pendente, pendente.name, cat)
    setPendente(null); setCat('outro')
  }
  async function abrir(id: string, nome: string) {
    const blob = await obterPetArquivo(id)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = nome; a.target = '_blank'
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  const ord = [...(docs ?? [])].sort((a, b) => b.criadoEm - a.criadoEm)

  return (
    <CartaoModulo
      titulo="Documentos"
      emoji="📄"
      acao={
        <button onClick={() => ref.current?.click()} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Anexar documento">
          <IconMais width={16} height={16} />
        </button>
      }
      {...controle}
    >
      <input ref={ref} type="file" className="hidden" onChange={escolher} />
      {ord.length === 0 ? (
        <Vazio>Nenhum documento anexado. Vacinação, receitas, exames, pedigree…</Vazio>
      ) : (
        <ul className="divide-y divide-line">
          {ord.map((d) => (
            <li key={d.id} className="group flex items-center gap-3 py-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-danger/10 text-[13px]">📄</span>
              <button onClick={() => abrir(d.id, d.nome)} className="min-w-0 flex-1 text-left">
                <div className="truncate text-[13px] font-medium">{d.nome}</div>
                <div className="text-[11px] text-muted">
                  {CATEGORIAS_DOC.find((c) => c.valor === d.categoria)?.nome ?? 'Documento'} · {tamanhoLegivel(d.tamanho)} · {format(d.criadoEm, 'dd/MM/yy')}
                </div>
              </button>
              <button onClick={() => removerDocumento(d.id)} className="text-[16px] leading-none text-muted hover:text-danger" title="Remover">×</button>
            </li>
          ))}
        </ul>
      )}

      {pendente && (
        <FolhaInferior titulo="Anexar documento" onFechar={() => setPendente(null)}>
          <div className="flex flex-col gap-3">
            <div className="rounded-xl border border-line bg-surface px-3 py-2 text-[13px]">
              <span className="font-medium">{pendente.name}</span>
              <span className="text-muted"> · {tamanhoLegivel(pendente.size)}</span>
            </div>
            <span className="text-[12px] font-medium text-muted">Categoria</span>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIAS_DOC.map((c) => (
                <button key={c.valor} onClick={() => setCat(c.valor)} className={`rounded-full border px-2.5 py-1.5 text-[12.5px] font-medium ${cat === c.valor ? 'border-ink bg-ink text-surface' : 'border-line text-muted'}`}>{c.nome}</button>
              ))}
            </div>
            <p className="text-[12px] text-muted">Fica guardado localmente e disponível também na aba Documentos.</p>
            <button onClick={confirmar} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface">Anexar</button>
          </div>
        </FolhaInferior>
      )}
    </CartaoModulo>
  )
}
