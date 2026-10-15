import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router'
import { RequireArea, RequireAuth } from './auth/RequireAuth'
import { Layout } from './components/Layout'
import { RouteError } from './components/RouteError'
import { FAN_ZONE } from './lib/features'
import { Home } from './pages/Home'
import { Landing } from './pages/Landing'
import { Login } from './pages/Login'
import { Privacy, Terms } from './pages/Legal'
import { NotFound } from './pages/NotFound'
import { Pass } from './pages/Pass'
import { Settings } from './pages/Settings'
import { Standings } from './pages/Standings'
import { Vote } from './pages/Vote'

/* The staff screens load on demand: the first screen stays small on a slow phone, and a club never downloads the federation room. */
const Club = lazy(() => import('./pages/Club').then((m) => ({ default: m.Club })))
const Federation = lazy(() => import('./pages/Federation').then((m) => ({ default: m.Federation })))
const DataCenter = lazy(() => import('./pages/DataCenter').then((m) => ({ default: m.DataCenter })))
const Development = lazy(() => import('./pages/Development').then((m) => ({ default: m.Development })))
const Lineup = lazy(() => import('./pages/Lineup').then((m) => ({ default: m.Lineup })))
const Attendance = lazy(() => import('./pages/Attendance').then((m) => ({ default: m.Attendance })))
const Player = lazy(() => import('./pages/Player').then((m) => ({ default: m.Player })))
const Report = lazy(() => import('./pages/Report').then((m) => ({ default: m.Report })))
const Analysis = lazy(() => import('./pages/Analysis').then((m) => ({ default: m.Analysis })))
const Rights = lazy(() => import('./pages/Rights').then((m) => ({ default: m.Rights })))
const Medical = lazy(() => import('./pages/Medical').then((m) => ({ default: m.Medical })))

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
      { path: 'development', handle: { title: 'غرفة التطوير' }, element: <RequireArea area="development"><Development /></RequireArea> },
      { path: 'lineup', handle: { title: 'تشكيلة المباراة' }, element: <RequireArea area="lineup"><Lineup /></RequireArea> },
      { path: 'attendance', handle: { title: 'الحضور والغياب' }, element: <RequireArea area="attendance"><Attendance /></RequireArea> },
      { path: 'analysis', handle: { title: 'تقرير المباراة' }, element: <RequireArea area="analysis"><Analysis /></RequireArea> },
      { path: 'player/:id', handle: { title: 'ملف اللاعب' }, element: <RequireArea area="playerfile"><Player /></RequireArea> },
      { path: 'report', handle: { title: 'التقرير الشهري' }, element: <RequireArea area="report"><Report /></RequireArea> },
      { path: 'rights', handle: { title: 'حقوق اللاعبين' }, element: <RequireArea area="rights"><Rights /></RequireArea> },
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
