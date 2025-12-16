"use client"

import { Link, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { useAuth } from "../context/AuthContext"

const Navbar = () => {
  const { isLoggedIn, logout, user } = useAuth()
  const navigate = useNavigate()

  return (
    <motion.nav
      className="fixed top-0 left-0 w-full glass-effect z-10"
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <motion.img
            src="/logo.png"
            alt="logo"
            className="w-8 h-8"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.7 }}
          />
          <span className="text-lg font-medium text-white">
            Generating Tests with AI
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link to="/" className="minimal-link">
            Головна
          </Link>
          <Link to="/take-test" className="minimal-link">
            Пройти тест
          </Link>
          <Link to="/my-tests" className="minimal-link">
            Мої тести
          </Link>

          {isLoggedIn ? (
            <div className="flex items-center gap-3">
              <span className="text-gray-300 text-sm">{user?.name}</span>
              <motion.button
                className="modern-button text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => logout()}
              >
                Вийти
              </motion.button>
            </div>
          ) : (
            <motion.button
              className="modern-button text-sm"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate("/login")}
            >
              Увійти
            </motion.button>
          )}
        </div>
      </div>
    </motion.nav>
  )
}

export default Navbar

