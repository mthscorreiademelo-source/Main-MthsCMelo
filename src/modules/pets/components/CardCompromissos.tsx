import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { IconMais } from '../../../core/components/Icons'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { hojeISO } from '../../../core/dates'
import { criarEvento, excluirEvento } from '../../agenda/db'
import { CartaoModulo, Vazio, type ControleCartao } from './CartaoModulo'
import { useEventosPet } from '../hooks'
import type { Pet } from '../types'

const CAMPO = 'w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50'
const ROT = 'text-[12px] font-medium text-muted'

const TIPOS = [
  { rotulo: 'Consulta', emoji: '🩺', categoria: 'saude' },
  { rotulo: 'Vacina', emoji: '💉', categoria: 'saude' },
  { rotulo: 'Banho e tosa', emoji: '🛁', categoria: 'pessoal' },
  { rotulo: 'Passeio', emoji: '🦮', categoria: 'pessoal' },
  { rotulo: 'Aniversário', emoji: '🎂', categoria: 'familia' },
]

export function CardCompromissos({ pet, controle }: { pet: Pet; controle: ControleCartao }) {
  const eventos = useEventosPet(pet.id)
  const [add, setAdd] = useState(false)
  const [tipo, setTipo] = useState(TIPOS[0])
  const [titulo, setTitulo] = useState('')
  const [data, setData] = useState(hojeISO())
  const [hora, setHora] = useState('')

  const hoje = hojeISO()
  const futuros = [...(eventos ?? [])]
    .filter((e) => (e.dataFim ?? e.data) >= hoje)
    .sort((a, b) => a.data.localeCompare(b.data) || a.inicio.localeCompare(b.inicio))

  async function salvar() {
    const nome = titulo.trim() || `${pet.nome} · ${tipo.rotulo}`
    let fim: string | undefined
    if (hora) {
      const [h, m] = hora.split(':').map(Number)
      fim = `${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
    }
    await criarEvento({
      titulo: nome,
      data,
      inicio: hora || '09:00',
      fim,
      diaInteiro: !hora,
      categoria: tipo.categoria,
      petId: pet.id,
    })
    setTitulo(''); setHora(''); setData(hojeISO()); setAdd(false)
  }

  return (
    <CartaoModulo
      titulo="Próximos compromissos"
      emoji="📅"
      acao={
        <button onClick={() => setAdd(true)} className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-hover hover:text-ink" title="Agendar">
          <IconMais width={16} height={16} />
        </button>
      }
      {...controle}
    >
      {futuros.length === 0 ? (
        <Vazio>Nada agendado. Compromissos aparecem também na Agenda principal.</Vazio>
      ) : (
        <ul className="divide-y divide-line">
          {futuros.slice(0, 6).map((e) => {
            const d = parseISO(e.data)
            return (
              <li key={e.id} className="group flex items-center gap-3 py-2">
                <div className="flex w-10 shrink-0 flex-col items-center leading-none">
                  <span className="text-[15px] font-bold">{format(d, 'd')}</span>
                  <span className="text-[10px] uppercase text-muted">{format(d, 'MMM', { locale: ptBR })}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13.5px] font-medium">{e.titulo}</div>
                  <div className="text-[11.5px] text-muted">{e.diaInteiro ? 'Dia inteiro' : e.inicio}{e.local ? ` · ${e.local}` : ''}</div>
                </div>
                <button onClick={() => excluirEvento(e.id)} className="text-[16px] leading-none text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100" title="Remover">×</button>
              </li>
            )
          })}
        </ul>
      )}

      {add && (
        <FolhaInferior titulo="Agendar compromisso" onFechar={() => setAdd(false)}>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1.5">
              {TIPOS.map((t) => (
                <button
                  key={t.rotulo}
                  onClick={() => setTipo(t)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    tipo.rotulo === t.rotulo ? 'border-ink bg-ink text-surface' : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  <span aria-hidden>{t.emoji}</span> {t.rotulo}
                </button>
              ))}
            </div>
            <label className="block"><span className={ROT}>Título (opcional)</span><input className={`${CAMPO} mt-1`} value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder={`${pet.nome} · ${tipo.rotulo}`} /></label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block"><span className={ROT}>Data</span><input type="date" className={`${CAMPO} mt-1`} value={data} onChange={(e) => setData(e.target.value)} /></label>
              <label className="block"><span className={ROT}>Hora (opcional)</span><input type="time" className={`${CAMPO} mt-1`} value={hora} onChange={(e) => setHora(e.target.value)} /></label>
            </div>
            <p className="text-[12px] text-muted">Também aparece na Agenda principal do Lume.</p>
            <button onClick={salvar} className="min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface">Agendar</button>
          </div>
        </FolhaInferior>
      )}
    </CartaoModulo>
  )
}
