/** Perfil pessoal do usuário — dados intimistas para deixar o app com a sua cara. */
export interface Perfil {
  id: string // sempre 'default' (documento único)
  nome?: string
  apelido?: string
  /** Data de nascimento em ISO yyyy-MM-dd. */
  nascimento?: string
  /** Foto de perfil em dataURL (quadrada, ~256px). */
  foto?: string
  bio?: string
  atualizadoEm?: number
}
