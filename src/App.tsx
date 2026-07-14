import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './core/layout/AppShell'
import { MODULOS } from './core/modules'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          {MODULOS.map((m) => [
            m.rota === '/' ? (
              <Route key={m.id} index element={<m.Pagina />} />
            ) : (
              <Route key={m.id} path={m.rota} element={<m.Pagina />} />
            ),
            ...(m.subRotas?.map((s) => (
              <Route key={s.caminho} path={s.caminho} element={<s.Pagina />} />
            )) ?? []),
          ])}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
