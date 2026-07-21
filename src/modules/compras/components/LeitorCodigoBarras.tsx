import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconSetaEsquerda } from '../../../core/components/Icons'
import { temLeitorNativo } from '../openfoodfacts'

// BarcodeDetector é nativo no Chromium; tipamos o mínimo necessário.
interface CodigoDetectado { rawValue: string }
interface DetectorBarras { detect(fonte: CanvasImageSource): Promise<CodigoDetectado[]> }
type ConstrutorDetector = new (opc?: { formats?: string[] }) => DetectorBarras

/** Lê um código de barras pela câmera (API nativa) com fallback de digitação. */
export function LeitorCodigoBarras({ onDetectado, onFechar }: { onDetectado: (ean: string) => void; onFechar: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [manual, setManual] = useState('')
  const [semCamera, setSemCamera] = useState(false)

  useEffect(() => {
    let stream: MediaStream | null = null
    let parar = false
    let raf = 0

    async function iniciar() {
      if (!temLeitorNativo() || !navigator.mediaDevices?.getUserMedia) {
        setSemCamera(true)
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (parar) return
        const v = videoRef.current
        if (!v) return
        v.srcObject = stream
        await v.play()
        const Detector = (window as unknown as { BarcodeDetector: ConstrutorDetector }).BarcodeDetector
        const detector = new Detector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] })
        const loop = async () => {
          if (parar || !videoRef.current) return
          try {
            const cods = await detector.detect(videoRef.current)
            if (cods.length > 0 && cods[0].rawValue) {
              onDetectado(cods[0].rawValue)
              return
            }
          } catch {
            /* frame ainda não pronto */
          }
          raf = requestAnimationFrame(loop)
        }
        raf = requestAnimationFrame(loop)
      } catch {
        setErro('Não foi possível acessar a câmera. Você pode digitar o código.')
        setSemCamera(true)
      }
    }
    iniciar()
    return () => {
      parar = true
      cancelAnimationFrame(raf)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [onDetectado])

  return createPortal(
    <div className="fixed inset-0 z-[75] flex flex-col bg-black">
      <header className="flex items-center gap-2 px-4 py-3">
        <button onClick={onFechar} className="flex size-9 items-center justify-center rounded-full text-white/80 hover:bg-white/10"><IconSetaEsquerda width={18} height={18} /></button>
        <h1 className="text-[15px] font-semibold text-white">Ler código de barras</h1>
      </header>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden">
        {!semCamera && <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />}
        {!semCamera && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-32 w-64 rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
          </div>
        )}
        {semCamera && (
          <div className="px-8 text-center text-[14px] text-white/80">{erro ?? 'Câmera indisponível neste dispositivo. Digite o código abaixo.'}</div>
        )}
      </div>

      <div className="bg-black/80 px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <p className="mb-2 text-center text-[12px] text-white/60">{semCamera ? 'Digite o código do produto' : 'Aponte para o código ou digite manualmente'}</p>
        <div className="flex gap-2">
          <input inputMode="numeric" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Ex.: 7891000100103" className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2.5 text-[15px] text-white placeholder:text-white/40 outline-none" />
          <button onClick={() => manual.replace(/\D/g, '').length >= 8 && onDetectado(manual)} disabled={manual.replace(/\D/g, '').length < 8} className="rounded-xl bg-white px-4 text-[14px] font-semibold text-black disabled:opacity-40">Buscar</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
