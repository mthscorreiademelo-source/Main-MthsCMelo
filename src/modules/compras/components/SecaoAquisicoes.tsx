import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IconMais } from '../../../core/components/Icons'
import { formatarBRL } from '../../financas/db'
import { CartaoSecao, Vazio, type ControleSecao } from './CartaoSecao'
import { EditorAquisicao } from './EditorAquisicao'
import { STATUS_AQUISICAO } from '../db'
import { useAquisicoes } from '../hooks'
import type { StatusAquisicao } from '../types'

function statusInfo(s: StatusAquisicao) {
  return STATUS_AQUISICAO.find((x) => x.valor === s) ?? STATUS_AQUISICAO[0]
}

export function SecaoAquisicoes({ controle }: { controle: ControleSecao }) {
  const aquisicoes = useAquisicoes()
  const [add, setAdd] = useState(false)

  const ativas = (aquisicoes ?? []).filter((a) => a.status !== 'cancelado' && a.status !== 'comprado')

  return (
    <CartaoSecao
      titulo="Aquisições planejadas"
      emoji="🎯"
      acao={<button onClick={() => setAdd(true)} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Nova aquisição"><IconMais width={16} height={16} /></button>}
      {...controle}
    >
      {aquisicoes === undefined ? null : ativas.length === 0 ? (
        <Vazio>Itens maiores que exigem pesquisa (notebook, eletrodoméstico, viagem…) ficam aqui, com orçamento e comparação de preços.</Vazio>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {ativas.map((a) => {
            const si = statusInfo(a.status)
            return (
              <Link key={a.id} to={`/compras/aquisicao/${a.id}`} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2.5 hover:border-muted/40">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-hover text-[16px]">🎯</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{a.nome}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="rounded-full px-1.5 py-0.5 text-[9.5px] font-medium" style={{ backgroundColor: `${si.cor}22`, color: si.cor }}>{si.nome}</span>
                    {a.valorEsperadoCentavos ? <span className="text-[11.5px] text-muted">{formatarBRL(a.valorEsperadoCentavos)}</span> : null}
                  </div>
                </div>
              </Link>
            )
          })}
        </ul>
      )}
      {add && <EditorAquisicao onFechar={() => setAdd(false)} />}
    </CartaoSecao>
  )
}
