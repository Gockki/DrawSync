import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import UploadAndJsonView from "./components/UploadAndJsonView"
import Login from "./pages/Login"
import PrivateRoute from "./components/PrivateRoute"

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
      </Routes>
    </Router>
  )
}

export default App
