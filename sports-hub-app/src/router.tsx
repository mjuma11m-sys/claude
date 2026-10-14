import { createBrowserRouter, Navigate } from 'react-router'
import { RequireArea, RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { RouteError } from './components/RouteError'
import { FAN_ZONE } from './lib/features'
import { Club } from './pages/Club'
import { DataCenter } from './pages/DataCenter'
import { Federation } from './pages/Federation'
import { Home } from './pages/Home'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Privacy, Terms } from './pages/Legal'
import { Medical } from './pages/Medical'
import { NotFound } from './pages/NotFound'
import { Pass } from './pages/Pass'
import { Settings } from './pages/Settings'
import { Standings } from './pages/Standings'
import { Vote } from './pages/Vote'

export const router = createBrowserRouter([
  { errorElement: <RouteError />, children: [
  { path: '/login', element: <Login /> },
  { path: '/privacy', handle: { title: 'الخصوصية' }, element: <Privacy /> },
  { path: '/terms', handle: { title: 'الشروط' }, element: <Terms /> },
  {
    element: <RequireAuth><Layout /></RequireAuth>,
    children: [
      { index: true, handle: { title: 'الرئيسية' }, element: <Landing /> },
      ...(FAN_ZONE ? [{ path: 'zone', handle: { title: 'الجمهور' }, element: <Home /> }] : []),
      { path: 'club', handle: { title: 'غرفة النادي' }, element: <RequireArea area="club"><Club /></RequireArea> },
      { path: 'data', handle: { title: 'مركز البيانات' }, element: <RequireArea area="club"><DataCenter /></RequireArea> },
      { path: 'federation', handle: { title: 'غرفة الاتحاد' }, element: <RequireArea area="federation"><Federation /></RequireArea> },
      { path: 'standings', handle: { title: 'الترتيب' }, element: <Standings /> },
      ...(FAN_ZONE
        ? [{ path: 'vote', handle: { title: 'رجل المباراة' }, element: <Vote /> }, { path: 'pass', handle: { title: 'تذكرتي' }, element: <Pass /> }]
        : ['zone', 'vote', 'pass'].map((path) => ({ path, element: <Navigate to="/" replace /> }))),
      { path: 'settings', handle: { title: 'الإعدادات' }, element: <Settings /> },
      { path: 'medical', handle: { title: 'الأحمال' }, element: <RequireArea area="medical"><Medical /></RequireArea> },
    ],
  },
  { path: '*', element: <NotFound /> },
] },
])
