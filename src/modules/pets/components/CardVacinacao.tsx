import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconMais } from '../../../core/components/Icons'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { hojeISO } from '../../../core/dates'
import { criarEvento, excluirEvento } from '../../agenda/db'
import { CartaoModulo, Vazio, type ControleCartao } from './CartaoModulo'
import { criarVacina, proximaVacina, removerVacina } from '../db'
import { useVacinas } from '../hooks'
import type { Pet, PetVacina } from '../types'

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50'
const ROT = 'text-[12px] font-medium text-muted'

export function CardVacinacao({ pet, controle }: { pet: Pet; controle: ControleCartao }) {
  const vacinas = useVacinas(pet.id)
  const [add, setAdd] = useState(false)
  const [nome, setNome] = useState('')
  const [data, setData] = useState(hojeISO())
  const [vet, setVet] = useState('')
  const [lote, setLote] = useState('')
  const [proxima, setProxima] = useState('')

  const lista = [...(vacinas ?? [])].sort((a, b) => b.data.localeCompare(a.data))
  const pv = vacinas ? proximaVacina(vacinas) : null

  async function salvar() {
    if (!nome.trim()) return
    let eventoId: string | undefined
    if (proxima) {
      eventoId = await criarEvento({
        titulo: `${pet.nome} · Vacina ${nome.trim()}`,
        data: proxima,
        diaInteiro: true,
        categoria: 'saude',
        local: vet.trim() || undefined,
        petId: pet.id,
      })
    }
    await criarVacina({
      petId: pet.id,
      nome: nome.trim(),
      data,
      veterinario: vet.trim() || undefined,
      lote: lote.trim() || undefined,
      proximaDose: proxima || undefined,
      eventoId,
    })
    setNome(''); setVet(''); setLote(''); setProxima(''); setData(hojeISO()); setAdd(false)
  }

  async function apagar(v: PetVacina) {
    if (v.eventoId) await excluirEvento(v.eventoId)
    await removerVacina(v.id)
  }

  return (
    <CartaoModulo
      titulo="Carteira de vacinação"
      emoji="💉"
      acao={
        <button onClick={() => setAdd(true)} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Registrar vacina">
          <IconMais width={16} height={16} />
        </button>
      }
      {...controle}
    >
      {pv && (
        <div className="mb-2 rounded-xl bg-accent/10 px-3 py-2 text-[12.5px]">
          <span className="font-semibold text-accent">Próxima: {pv.vacina.nome}</span>
          <span className="text-muted"> · em {pv.dias} {pv.dias === 1 ? 'dia' : 'dias'} · agendada na Agenda</span>
        </div>
      )}
      {lista.length === 0 ? (
        <Vazio>Nenhuma vacina registrada.</Vazio>
      ) : (
        <ul className="divide-y divide-line">
          {lista.map((v) => (
            <li key={v.id} className="group flex items-center gap-3 py-2">
              <span className="text-[15px]" aria-hidden>💉</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13.5px] font-medium">{v.nome}</div>
                <div className="truncate text-[11.5px] text-muted">
                  Aplicada em {format(parseISO(v.data), 'dd/MM/yyyy')}
                  {v.veterinario ? ` · ${v.veterinario}` : ''}
                  {v.proximaDose ? ` · próxima ${format(parseISO(v.proximaDose), "d 'de' MMM", { locale: ptBR })}` : ''}
                </div>
              </div>
              <button onClick={() => apagar(v)} className="text-[16px] leading-none text-muted hover:text-danger" title="Remover">×</button>
            </li>
          ))}
        </ul>
      )}

      {add && (
        <FolhaInferior titulo="Registrar vacina" onFechar={() => setAdd(false)}>
          <div className="flex flex-col gap-3">
            <label className="block"><span className={ROT}>Vacina</span><input className={`${CAMPO} mt-1`} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: V8, Antirrábica" autoFocus /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className={ROT}>Aplicada em</span><input type="date" className={`${CAMPO} mt-1`} value={data} onChange={(e) => setData(e.target.value)} /></label>
              <label className="block"><span className={ROT}>Próxima dose</span><input type="date" className={`${CAMPO} mt-1`} value={proxima} onChange={(e) => setProxima(e.target.value)} /></label>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className={ROT}>Veterinário</span><input className={`${CAMPO} mt-1`} value={vet} onChange={(e) => setVet(e.target.value)} placeholder="Opcional" /></label>
              <label className="block"><span className={ROT}>Lote</span><input className={`${CAMPO} mt-1`} value={lote} onChange={(e) => setLote(e.target.value)} placeholder="Opcional" /></label>
            </div>
            {proxima && <p className="text-[12px] text-muted">Um lembrete será criado na Agenda para a próxima dose.</p>}
            <button onClick={salvar} disabled={!nome.trim()} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">Salvar</button>
          </div>
        </FolhaInferior>
      )}
    </CartaoModulo>
  )
}
