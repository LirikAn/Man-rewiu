"use client"

import { lazy, Suspense } from "react"
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import { motion } from "framer-motion"
import { AuthProvider } from "./context/AuthContext"
import React from "react"

const Home = lazy(() => import("./pages/Home"))
const Login = lazy(() => import("./components/Login"))
const MyTests = lazy(() => import("./pages/MyTests"))
const CreateTest = lazy(() => import("./pages/CreateTest"))
const TakeTest = lazy(() => import("./pages/TakeTest"))
const TestResults = lazy(() => import("./pages/TestResults"))

const PageLoader = React.memo(() => (
  <div className="flex items-center justify-center min-h-[80vh]">
    <motion.div
      className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
    />
  </div>
))

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="w-full min-h-screen">
          <motion.div
            className="fixed top-0 left-0 w-full h-full pointer-events-none z-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-blue-500/20 blur-3xl"></div>
            <div className="absolute bottom-1/3 right-1/3 w-40 h-40 rounded-full bg-purple-500/20 blur-3xl"></div>
            <div className="absolute top-2/3 right-1/4 w-36 h-36 rounded-full bg-pink-500/20 blur-3xl"></div>
          </motion.div>

          <Navbar />

          <div className="container mx-auto pt-20 px-4">
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/my-tests" element={<MyTests />} />
                <Route path="/create-test" element={<CreateTest />} />
                <Route path="/take-test" element={<TakeTest />} />
                <Route path="/take-test/:testId" element={<TakeTest />} />
                <Route path="/test-results/:testId" element={<TestResults />} />
              </Routes>
            </Suspense>
          </div>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

