import { useState, type ReactNode } from 'react'

/**
 * Capa de um livro. O `src` pode ser uma imagem embutida (data URL) OU um
 * link da web. Se o link falhar (fora do ar, sem internet e sem cache),
 * mostra o `fallback` (o mesmo placeholder de "sem capa") em vez do ícone
 * de imagem quebrada do navegador.
 */
export function CapaImg({
  src,
  className,
  fallback,
}: {
  src: string
  className?: string
  fallback: ReactNode
}) {
  const [erro, setErro] = useState(false)
  const [srcAnterior, setSrcAnterior] = useState(src)
  // ao trocar a capa, limpa o erro DURANTE o render (sem piscar o fallback 1 frame)
  if (src !== srcAnterior) {
    setSrcAnterior(src)
    setErro(false)
  }
  if (erro) return <>{fallback}</>
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className={className}
      onError={() => setErro(true)}
    />
  )
}
