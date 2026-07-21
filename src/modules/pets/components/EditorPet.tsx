import { useState } from 'react'
import { FolhaInferior } from '../../../core/components/FolhaInferior'
import { atualizarPet, criarPetComTemplate, ESPECIES, excluirPet } from '../db'
import type { Especie, Pet, SexoPet } from '../types'

const CAMPO =
  'w-full rounded-xl border border-line bg-surface px-3 py-2 text-[14px] outline-none focus:border-muted/50'
const ROT = 'text-[12px] font-medium text-muted'

const SEXOS: { valor: SexoPet; rotulo: string }[] = [
  { valor: 'macho', rotulo: 'Macho ♂' },
  { valor: 'femea', rotulo: 'Fêmea ♀' },
  { valor: 'indefinido', rotulo: '—' },
]

export function EditorPet({
  pet,
  onFechar,
  onCriado,
}: {
  pet?: Pet
  onFechar: () => void
  onCriado?: (id: string) => void
}) {
  const editando = !!pet
  const [nome, setNome] = useState(pet?.nome ?? '')
  const [especie, setEspecie] = useState<Especie>(pet?.especie ?? 'cachorro')
  const [raca, setRaca] = useState(pet?.raca ?? '')
  const [sexo, setSexo] = useState<SexoPet>(pet?.sexo ?? 'indefinido')
  const [nascimento, setNascimento] = useState(pet?.nascimento ?? '')
  const [pesoMin, setPesoMin] = useState(pet?.pesoIdealMin?.toString() ?? '')
  const [pesoMax, setPesoMax] = useState(pet?.pesoIdealMax?.toString() ?? '')
  const [obs, setObs] = useState(pet?.obs ?? '')

  async function salvar() {
    if (!nome.trim()) return
    const dados = {
      nome: nome.trim(),
      especie,
      raca: raca.trim() || undefined,
      sexo,
      nascimento: nascimento || undefined,
      pesoIdealMin: pesoMin ? Number(pesoMin) : undefined,
      pesoIdealMax: pesoMax ? Number(pesoMax) : undefined,
      obs: obs.trim() || undefined,
    }
    if (editando && pet) {
      await atualizarPet(pet.id, dados)
    } else {
      const id = await criarPetComTemplate(dados)
      onCriado?.(id)
    }
    onFechar()
  }

  async function apagar() {
    if (!pet) return
    if (!confirm(`Excluir ${pet.nome} e todos os seus registros? Esta ação não pode ser desfeita.`)) return
    await excluirPet(pet.id)
    onFechar()
  }

  return (
    <FolhaInferior titulo={editando ? 'Editar pet' : 'Novo pet'} onFechar={onFechar}>
      <div className="flex flex-col gap-3">
        {!editando && (
          <div>
            <span className={ROT}>Espécie / template</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {ESPECIES.map((e) => (
                <button
                  key={e.valor}
                  onClick={() => setEspecie(e.valor)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    especie === e.valor ? 'border-ink bg-ink text-surface' : 'border-line text-muted hover:text-ink'
                  }`}
                >
                  <span aria-hidden>{e.emoji}</span> {e.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="block">
          <span className={ROT}>Nome</span>
          <input className={`${CAMPO} mt-1`} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Oli" autoFocus />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={ROT}>Raça</span>
            <input className={`${CAMPO} mt-1`} value={raca} onChange={(e) => setRaca(e.target.value)} placeholder="Opcional" />
          </label>
          <label className="block">
            <span className={ROT}>Nascimento</span>
            <input type="date" className={`${CAMPO} mt-1`} value={nascimento} onChange={(e) => setNascimento(e.target.value)} />
          </label>
        </div>

        <div>
          <span className={ROT}>Sexo</span>
          <div className="mt-1.5 flex gap-1.5">
            {SEXOS.map((s) => (
              <button
                key={s.valor}
                onClick={() => setSexo(s.valor)}
                className={`flex-1 rounded-xl border px-2 py-2 text-[13px] font-medium transition-colors ${
                  sexo === s.valor ? 'border-ink bg-hover text-ink' : 'border-line text-muted hover:text-ink'
                }`}
              >
                {s.rotulo}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={ROT}>Peso ideal mín. (kg)</span>
            <input type="number" step="0.1" className={`${CAMPO} mt-1`} value={pesoMin} onChange={(e) => setPesoMin(e.target.value)} placeholder="—" />
          </label>
          <label className="block">
            <span className={ROT}>Peso ideal máx. (kg)</span>
            <input type="number" step="0.1" className={`${CAMPO} mt-1`} value={pesoMax} onChange={(e) => setPesoMax(e.target.value)} placeholder="—" />
          </label>
        </div>

        <label className="block">
          <span className={ROT}>Observações</span>
          <textarea className={`${CAMPO} mt-1 min-h-16 resize-y`} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Comportamento, preferências, cuidados especiais…" />
        </label>

        <button onClick={salvar} disabled={!nome.trim()} className="mt-1 min-h-11 rounded-xl bg-ink text-[14px] font-semibold text-surface disabled:opacity-40">
          {editando ? 'Salvar' : 'Criar pet'}
        </button>
        {editando && (
          <button onClick={apagar} className="min-h-10 rounded-xl text-[13px] font-medium text-danger hover:bg-danger/10">
            Excluir pet
          </button>
        )}
      </div>
    </FolhaInferior>
  )
}
