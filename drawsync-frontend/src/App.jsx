// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { OrganizationProvider } from "./contexts/OrganizationContext"
import UploadAndJsonView from "./components/UploadAndJsonView"
import Login from "./pages/Login"
import PrivateRoute from "./components/PrivateRoute"
import Projects from "./pages/Projects"

function App() {
  return (
    <Router>
      <OrganizationProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route
            path="/app"
            element={
              <PrivateRoute>
                <UploadAndJsonView />
              </PrivateRoute>
            }
          />
          <Route
            path="/projektit"
            element={
              <PrivateRoute>
                <Projects />
              </PrivateRoute>
            }
          />
        </Routes>
      </OrganizationProvider>
    </Router>
  )
}

export default App