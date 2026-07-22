import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { colecoesParaZerar } from './exemplos'
import { NOMES_SYNC } from '../nuvem/sync/colecoes'

describe('recomeçar do zero — partição de coleções', () => {
  const zerar = colecoesParaZerar()

  it('PRESERVA tarefas e notas/cadernos (dados do usuário)', () => {
    for (const c of ['tasks', 'paginas', 'grupos']) {
      expect(zerar).not.toContain(c)
    }
  })

  it('PRESERVA os padrões funcionais dos seletores e o perfil', () => {
    for (const c of ['humorTipos', 'categorias', 'fatores', 'categoriasHabito', 'perfil']) {
      expect(zerar).not.toContain(c)
    }
  })

  it('APAGA o conteúdo de exemplo/teste dos demais módulos', () => {
    for (const c of ['movimentos', 'saude', 'registros', 'habitos', 'eventos', 'pets', 'livros', 'despensa', 'projetos']) {
      expect(zerar).toContain(c)
    }
  })

  it('só zera coleções que realmente sincronizam', () => {
    for (const c of zerar) expect(NOMES_SYNC).toContain(c)
  })
})
