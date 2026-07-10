import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import Layout from './components/layout/Layout'
import { AuthGuard } from './components/guards/AuthGuard'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    element: <AuthGuard />,
    children: [
      {
        path: '/',
        element: <Layout />,
        children: [
          { index: true, element: <Dashboard /> },
        ],
      },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
