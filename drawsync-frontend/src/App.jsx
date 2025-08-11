// src/App.jsx
import { BrowserRouter as Router } from "react-router-dom"
import { OrganizationProvider } from "./contexts/OrganizationContext"
import AppRouter from "./components/AppRouter"

function App() {
  return (
    <Router>
      <OrganizationProvider>
        <AppRouter />
      </OrganizationProvider>
    </Router>
  )
}

export default App