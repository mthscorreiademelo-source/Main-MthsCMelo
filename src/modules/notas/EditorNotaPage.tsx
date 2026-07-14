import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, IconButton } from '../../core/components/Button'
import { IconLixeira, IconSetaEsquerda } from '../../core/components/Icons'
import { db } from '../../core/db/db'
import { BlocoEditor } from './components/BlocoEditor'
import { excluirPagina, novoBloco, salvarPagina } from './db'
import type { Pagina, TipoBloco } from './types'

export function EditorNotaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [pagina, setPagina] = useState<Pagina | null>(null)
  const [focoEm, setFocoEm] = useState<string | null>(null)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const carregouEm = useRef(0)
  const tituloRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (!id) return
    db.paginas.get(id).then((p) => {
      if (p) {
        carregouEm.current = Date.now()
        setPagina(p)
      } else {
        navigate('/notas', { replace: true })
      }
    })
  }, [id, navigate])

  // Salvamento automático com debounce (ignora o set inicial do carregamento)
  useEffect(() => {
    if (!pagina || Date.now() - carregouEm.current < 100) return
    const t = setTimeout(() => salvarPagina(pagina), 300)
    return () => clearTimeout(t)
  }, [pagina])

  if (!pagina) return null

  function mudarBlocos(transforma: (p: Pagina) => Pagina) {
    setPagina((atual) => (atual ? transforma(atual) : atual))
  }

  function atualizarBloco(blocoId: string, mudancas: Partial<Pagina['blocos'][number]>) {
    mudarBlocos((p) => ({
      ...p,
      blocos: p.blocos.map((b) => (b.id === blocoId ? { ...b, ...mudancas } : b)),
    }))
  }

  function inserirDepois(blocoId: string) {
    const bloco = novoBloco()
    mudarBlocos((p) => {
      const i = p.blocos.findIndex((b) => b.id === blocoId)
      const blocos = [...p.blocos]
      blocos.splice(i + 1, 0, bloco)
      return { ...p, blocos }
    })
    setFocoEm(bloco.id)
  }

  function removerBloco(blocoId: string) {
    if (!pagina) return
    if (pagina.blocos.length === 1) {
      // nunca deixa a página sem blocos; só reseta o tipo
      atualizarBloco(blocoId, { tipo: 'paragrafo' as TipoBloco, texto: '' })
      return
    }
    const i = pagina.blocos.findIndex((b) => b.id === blocoId)
    const anterior = pagina.blocos[Math.max(0, i - 1)]
    setFocoEm(anterior.id)
    mudarBlocos((p) => ({ ...p, blocos: p.blocos.filter((b) => b.id !== blocoId) }))
  }

  async function aoExcluirPagina() {
    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true)
      return
    }
    await excluirPagina(pagina!.id)
    navigate('/notas')
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <div className="flex items-center justify-between pb-2">
        <IconButton onClick={() => navigate('/notas')} aria-label="Voltar para Notas">
          <IconSetaEsquerda />
        </IconButton>
        <Button variante="perigo" onClick={aoExcluirPagina}>
          <IconLixeira width={16} height={16} />
          {confirmandoExclusao ? 'Confirmar exclusão' : 'Excluir'}
        </Button>
      </div>

      <textarea
        ref={tituloRef}
        rows={1}
        value={pagina.titulo}
        onChange={(e) => {
          const titulo = e.target.value.replace(/\n/g, '')
          setPagina((p) => (p ? { ...p, titulo } : p))
          e.target.style.height = 'auto'
          e.target.style.height = `${e.target.scrollHeight}px`
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            setFocoEm(pagina.blocos[0]?.id ?? null)
          }
        }}
        placeholder="Sem título"
        className="w-full resize-none overflow-hidden bg-transparent pb-3 text-3xl font-bold tracking-tight outline-none placeholder:text-muted/40"
      />

      <div className="flex flex-col">
        {pagina.blocos.map((bloco) => (
          <BlocoEditor
            key={bloco.id}
            bloco={bloco}
            focar={focoEm === bloco.id}
            onMudar={(texto) => atualizarBloco(bloco.id, { texto })}
            onTransformar={(tipo) => atualizarBloco(bloco.id, { tipo, texto: '' })}
            onEnter={() => inserirDepois(bloco.id)}
            onApagarVazio={() => removerBloco(bloco.id)}
            onAlternarFeito={() => atualizarBloco(bloco.id, { feito: !bloco.feito })}
            onDesfocar={() => setFocoEm((f) => (f === bloco.id ? null : f))}
          />
        ))}
      </div>

      {/* Área clicável abaixo do conteúdo: adiciona bloco no fim (gesto Notion) */}
      <div
        className="min-h-32 flex-1 cursor-text"
        onClick={() => {
          const ultimo = pagina.blocos[pagina.blocos.length - 1]
          if (ultimo && ultimo.texto === '' && ultimo.tipo === 'paragrafo') {
            setFocoEm(ultimo.id)
          } else {
            inserirDepois(ultimo.id)
          }
        }}
      />

      <p className="pb-2 text-xs text-muted/60">
        Dicas: <code># </code> título · <code>- </code> lista · <code>[] </code> to-do
      </p>
    </div>
  )
}
