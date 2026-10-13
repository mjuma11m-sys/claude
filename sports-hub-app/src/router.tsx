import { createBrowserRouter } from 'react-router'
import { RequireArea, RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { RouteError } from './components/RouteError'
import { Home } from './pages/Home'
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
      { index: true, handle: { title: 'الرئيسية' }, element: <Home /> },
      { path: 'standings', handle: { title: 'الترتيب' }, element: <Standings /> },
      { path: 'vote', handle: { title: 'رجل المباراة' }, element: <Vote /> },
      { path: 'pass', handle: { title: 'تذكرتي' }, element: <Pass /> },
      { path: 'settings', handle: { title: 'الإعدادات' }, element: <Settings /> },
      { path: 'medical', handle: { title: 'الأحمال' }, element: <RequireArea area="medical"><Medical /></RequireArea> },
    ],
  },
  { path: '*', element: <NotFound /> },
] },
])
