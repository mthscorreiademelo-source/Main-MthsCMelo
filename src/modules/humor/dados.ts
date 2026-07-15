import type { Categoria, Fator, HumorTipo } from './types'

/** Os 5 humores padrão — paleta sóbria e sofisticada, funciona em claro/escuro. */
export const HUMORES_PADRAO: HumorTipo[] = [
  { nivel: 1, nome: 'Muito ruim', cor: '#c46a5e', icone: 'rosto1', descricao: 'Um dia difícil' },
  { nivel: 2, nome: 'Ruim', cor: '#d89b6c', icone: 'rosto2' },
  { nivel: 3, nome: 'Neutro', cor: '#c2b083', icone: 'rosto3' },
  { nivel: 4, nome: 'Bem', cor: '#8cae7b', icone: 'rosto4' },
  { nivel: 5, nome: 'Excelente', cor: '#5b9c86', icone: 'rosto5', descricao: 'Um ótimo dia' },
]

/** Categorias padrão — "Emoções" primeiro, depois atividades. */
export const CATEGORIAS_PADRAO: Categoria[] = [
  { id: 'cat-emocoes', nome: 'Emoções', icone: 'coracao', ordem: 0, sistema: true },
  { id: 'cat-sono', nome: 'Sono', icone: 'lua', ordem: 1 },
  { id: 'cat-alimentacao', nome: 'Alimentação', icone: 'garfo', ordem: 2 },
  { id: 'cat-exercicios', nome: 'Exercícios', icone: 'corrida', ordem: 3 },
  { id: 'cat-trabalho', nome: 'Trabalho', icone: 'maleta', ordem: 4 },
  { id: 'cat-estudos', nome: 'Estudos', icone: 'livro', ordem: 5 },
  { id: 'cat-social', nome: 'Social', icone: 'pessoas', ordem: 6 },
]

/** Fatores padrão por categoria. */
export const FATORES_PADRAO: Fator[] = [
  // Emoções
  f('cat-emocoes', 'Grato', 'coracao', 0),
  f('cat-emocoes', 'Feliz', 'sol', 1),
  f('cat-emocoes', 'Calmo', 'folha', 2),
  f('cat-emocoes', 'Motivado', 'raio', 3),
  f('cat-emocoes', 'Ansioso', 'onda', 4),
  f('cat-emocoes', 'Cansado', 'lua', 5),
  f('cat-emocoes', 'Triste', 'gota', 6),
  f('cat-emocoes', 'Irritado', 'chama', 7),
  // Sono
  f('cat-sono', 'Dormi bem', 'lua', 0),
  f('cat-sono', 'Dormi mal', 'onda', 1),
  f('cat-sono', 'Acordei cedo', 'sol', 2),
  f('cat-sono', 'Cochilo', 'folha', 3),
  // Alimentação
  f('cat-alimentacao', 'Comida saudável', 'folha', 0),
  f('cat-alimentacao', 'Fast food', 'garfo', 1),
  f('cat-alimentacao', 'Bastante água', 'gota', 2),
  f('cat-alimentacao', 'Café', 'chama', 3),
  // Exercícios
  f('cat-exercicios', 'Corrida', 'corrida', 0),
  f('cat-exercicios', 'Academia', 'raio', 1),
  f('cat-exercicios', 'Caminhada', 'folha', 2),
  f('cat-exercicios', 'Alongamento', 'onda', 3),
  // Trabalho
  f('cat-trabalho', 'Produtivo', 'raio', 0),
  f('cat-trabalho', 'Reuniões', 'pessoas', 1),
  f('cat-trabalho', 'Estressante', 'chama', 2),
  f('cat-trabalho', 'Home office', 'maleta', 3),
  // Estudos
  f('cat-estudos', 'Estudei', 'livro', 0),
  f('cat-estudos', 'Li um livro', 'livro', 1),
  f('cat-estudos', 'Curso', 'raio', 2),
  // Social
  f('cat-social', 'Amigos', 'pessoas', 0),
  f('cat-social', 'Família', 'coracao', 1),
  f('cat-social', 'Sozinho', 'folha', 2),
  f('cat-social', 'Encontro', 'sol', 3),
]

function f(categoriaId: string, nome: string, icone: string, ordem: number): Fator {
  const id = `fat-${categoriaId.slice(4)}-${ordem}`
  return { id, categoriaId, nome, icone, ordem }
}
