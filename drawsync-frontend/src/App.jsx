import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import UploadAndJsonView from "./components/UploadAndJsonView"
import Login from "./pages/Login"
import PrivateRoute from "./components/PrivateRoute"
import Projects from "./pages/Projects" // ⬅️ lisää tämä

function App() {
  return (
    <Router>
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
    </Router>
  )
}

export default App
