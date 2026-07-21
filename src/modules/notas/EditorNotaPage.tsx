import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, IconButton } from '../../core/components/Button'
import { IconLixeira, IconSetaEsquerda } from '../../core/components/Icons'
import { db } from '../../core/db/db'
import { ArquivosPainel } from './components/ArquivosPainel'
import { BlocoEditor } from './components/BlocoEditor'
import { ChipsRelacao } from './components/RelacoesNota'
import { DesenhoTela } from './components/DesenhoTela'
import { excluirPagina, novoBloco, ordenarGrupos, salvarPagina } from './db'
import { useGrupos } from './hooks'
import type { Pagina, TipoBloco } from './types'

export function EditorNotaPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const grupos = useGrupos()
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

  const rotaVoltar = pagina?.grupoId ? `/notas/grupo/${pagina.grupoId}` : '/notas'

  async function aoExcluirPagina() {
    if (!confirmandoExclusao) {
      setConfirmandoExclusao(true)
      return
    }
    await excluirPagina(pagina!.id)
    navigate(rotaVoltar)
  }

  function moverParaGrupo(grupoId?: string) {
    setPagina((p) => (p ? { ...p, grupoId } : p))
  }

  if (pagina.tipo === 'desenho') {
    return (
      <DesenhoTela
        pagina={pagina}
        grupos={grupos ?? []}
        onMudar={(mudancas) => setPagina((p) => (p ? { ...p, ...mudancas } : p))}
        onVoltar={() => navigate(rotaVoltar)}
        onExcluir={async () => {
          await excluirPagina(pagina.id)
          navigate(rotaVoltar)
        }}
      />
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <div className="flex items-center justify-between pb-2">
        <IconButton onClick={() => navigate(rotaVoltar)} aria-label="Voltar para Notas">
          <IconSetaEsquerda />
        </IconButton>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPagina((p) => (p ? { ...p, favorito: !p.favorito } : p))}
            aria-label={pagina.favorito ? 'Remover favorito' : 'Favoritar'}
            className="flex size-10 items-center justify-center rounded-full text-[18px] text-muted hover:bg-hover"
          >
            {pagina.favorito ? '⭐' : '☆'}
          </button>
          <Button variante="perigo" onClick={aoExcluirPagina}>
          <IconLixeira width={16} height={16} />
          {confirmandoExclusao ? 'Confirmar exclusão' : 'Excluir'}
        </Button>
        </div>
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
            if (pagina.tipo !== 'arquivos') setFocoEm(pagina.blocos[0]?.id ?? null)
          }
        }}
        placeholder="Sem título"
        className="w-full resize-none overflow-hidden bg-transparent pb-3 text-3xl font-bold tracking-tight outline-none placeholder:text-muted/40"
      />

      {pagina.tipo === 'arquivos' ? (
        <ArquivosPainel
          arquivos={pagina.arquivos ?? []}
          onMudar={(arquivos) => setPagina((p) => (p ? { ...p, arquivos } : p))}
        />
      ) : (
        <>
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
        </>
      )}

      <div className="mt-2 border-t border-line pt-3">
        <ChipsRelacao pagina={pagina} onAtualizar={(m) => setPagina((p) => (p ? { ...p, ...m } : p))} />
      </div>

      {(grupos?.length ?? 0) > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto border-t border-line py-3">
          <span className="shrink-0 text-[13px] text-muted">Caderno:</span>
          <button
            onClick={() => moverParaGrupo(undefined)}
            className={`min-h-9 shrink-0 cursor-pointer rounded-full border px-3 text-[13px] font-medium transition-colors ${
              !pagina.grupoId
                ? 'border-ink bg-ink text-bg'
                : 'border-line text-muted hover:bg-hover'
            }`}
          >
            Nenhum
          </button>
          {ordenarGrupos(grupos ?? []).map((g) => (
            <button
              key={g.id}
              onClick={() => moverParaGrupo(g.id)}
              className={`min-h-9 shrink-0 cursor-pointer rounded-full border px-3 text-[13px] font-medium transition-colors ${
                pagina.grupoId === g.id
                  ? 'border-ink bg-ink text-bg'
                  : 'border-line text-muted hover:bg-hover'
              }`}
            >
              {g.nome}
            </button>
          ))}
        </div>
      )}

      {pagina.tipo !== 'arquivos' && (
        <p className="pb-2 text-xs text-muted/60">
          Dicas: <code># </code> título · <code>- </code> lista · <code>[] </code> to-do
        </p>
      )}
    </div>
  )
}
