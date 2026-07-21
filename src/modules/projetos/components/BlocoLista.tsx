import { useState } from 'react'
import { IconCheck, IconMais } from '../../../core/components/Icons'
import { criarItem, excluirItem, atualizarItem } from '../db'
import { useItensProjeto } from '../hooks'

interface CfgModulo {
  placeholder: string
  temUrl?: boolean
  temCheck?: boolean
  vazio: string
}
const CFG: Record<string, CfgModulo> = {
  ideias: { placeholder: 'Nova ideia…', vazio: 'Guarde aqui as ideias do projeto.' },
  links: { placeholder: 'Cole um link (site, GitHub, Figma…)', temUrl: true, vazio: 'Reúna sites e referências do projeto.' },
  pessoas: { placeholder: 'Nome (cliente, parceiro, equipe…)', vazio: 'Clientes, parceiros, equipe, contatos.' },
  aprendizados: { placeholder: 'Uma lição, um erro, uma boa prática…', vazio: 'Registre o que você aprendeu.' },
  checklist: { placeholder: 'Novo item…', temCheck: true, vazio: 'Uma lista simples para marcar.' },
}

function ehUrl(s: string) {
  return /^https?:\/\//i.test(s.trim())
}

export function BlocoLista({ projetoId, modulo }: { projetoId: string; modulo: string }) {
  const itens = useItensProjeto(projetoId, modulo)
  const [texto, setTexto] = useState('')
  const cfg = CFG[modulo] ?? { placeholder: 'Novo item…', vazio: 'Vazio.' }

  const ordenados = [...(itens ?? [])].sort((a, b) => a.ordem - b.ordem)

  async function adicionar() {
    const t = texto.trim()
    if (!t) return
    if (cfg.temUrl && ehUrl(t)) await criarItem({ projetoId, modulo, url: t, titulo: t.replace(/^https?:\/\//, '').split('/')[0] })
    else await criarItem({ projetoId, modulo, texto: t })
    setTexto('')
  }

  return (
    <div className="flex flex-col gap-2">
      {ordenados.length === 0 && <p className="text-[13px] text-muted">{cfg.vazio}</p>}
      <ul className="flex flex-col gap-1">
        {ordenados.map((it) => (
          <li key={it.id} className="group flex items-center gap-2 text-[14px]">
            {cfg.temCheck && (
              <button
                onClick={() => atualizarItem(it.id, { concluido: !it.concluido })}
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${it.concluido ? 'border-accent bg-accent text-surface' : 'border-line text-transparent hover:border-muted'}`}
              >
                <IconCheck width={12} height={12} />
              </button>
            )}
            {it.url ? (
              <a href={it.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-accent hover:underline">
                🔗 {it.titulo ?? it.url}
              </a>
            ) : (
              <span className={`min-w-0 flex-1 ${it.concluido ? 'text-muted line-through' : ''}`}>{it.texto ?? it.titulo}</span>
            )}
            <button onClick={() => excluirItem(it.id)} className="shrink-0 text-[15px] leading-none text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100" title="Remover">×</button>
          </li>
        ))}
      </ul>
      <div className="mt-1 flex items-center gap-1.5">
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && adicionar()}
          placeholder={cfg.placeholder}
          className="min-h-9 flex-1 rounded-lg border border-line bg-transparent px-2.5 text-[13.5px] outline-none focus:border-muted/50"
        />
        <button onClick={adicionar} className="flex size-9 items-center justify-center rounded-lg bg-ink text-bg" aria-label="Adicionar"><IconMais width={16} height={16} /></button>
      </div>
    </div>
  )
}
