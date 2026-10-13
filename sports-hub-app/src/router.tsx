import { createBrowserRouter } from 'react-router'
import { RequireArea, RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Privacy, Terms } from './pages/Legal'
import { Medical } from './pages/Medical'
import { NotFound } from './pages/NotFound'
import { Pass } from './pages/Pass'
import { Settings } from './pages/Settings'
import { Soon } from './pages/Soon'
import { Standings } from './pages/Standings'
import { Vote } from './pages/Vote'

export const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/privacy', element: <Privacy /> },
  { path: '/terms', element: <Terms /> },
  {
    element: <RequireAuth><Layout /></RequireAuth>,
    children: [
      { index: true, element: <Home /> },
      { path: 'standings', element: <Standings /> },
      { path: 'vote', element: <Vote /> },
      { path: 'pass', element: <Pass /> },
      { path: 'settings', element: <Settings /> },
      { path: 'medical', element: <RequireArea area="medical"><Medical /></RequireArea> },
      { path: 'club', element: <RequireArea area="club"><Soon title="غرفة عمليات النادي" items={['العقود والرواتب', 'ميزانية الموسم بالدينار', 'تنبيهات انتهاء العقود']} /></RequireArea> },
      { path: 'bfa', element: <RequireArea area="bfa"><Soon title="غرفة تحكم الاتحاد" items={['مراقبة اللعب المالي النظيف للأندية', 'الكشاف الذكي لاستدعاءات المنتخب']} /></RequireArea> },
    ],
  },
  { path: '*', element: <NotFound /> },
])
