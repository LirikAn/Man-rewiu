"use client"

import type React from "react"

import { MdAlternateEmail } from "react-icons/md"
import { FaFingerprint } from "react-icons/fa"
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa"
import { useState } from "react"
import { BsApple } from "react-icons/bs"
import { FaXTwitter } from "react-icons/fa6"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"

const Login = () => {
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [isLogin, setIsLogin] = useState<boolean>(true)
  const [username, setUsername] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [confirmPassword, setConfirmPassword] = useState<string>("")
  const [formError, setFormError] = useState<string>("")

  const togglePasswordView = () => setShowPassword(!showPassword)
  const toggleForm = () => {
    setIsLogin(!isLogin)
    setFormError("")
  }

  const navigate = useNavigate()
  const { login, register, loading, error } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError("")

    if (!username.trim() || !password.trim()) {
      setFormError("Будь ласка, заповніть всі поля")
      return
    }

    if (!isLogin && password !== confirmPassword) {
      setFormError("Паролі не співпадають")
      return
    }

    if (isLogin) {
      const success = await login(username, password)
      if (success) {
        navigate("/")
      }
    } else {
      const success = await register(username, password)
      if (success) {
        setIsLogin(true)
        setFormError("Реєстрація успішна! Тепер ви можете увійти.")
      }
    }
  }

  return (
    <div className="w-full min-h-[80vh] flex items-center justify-center overflow-hidden px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-[90%] max-w-sm md:max-w-md lg:max-w-md p-6 modern-card flex-col flex items-center gap-5 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-500 to-purple-500"></div>

        <motion.img
          src="/logo.png"
          alt="logo"
          className="w-12 md:w-14"
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: 360 }}
          transition={{ duration: 0.7, type: "spring" }}
        />

        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center gap-4"
              onSubmit={handleSubmit}
            >
              <h1 className="text-xl font-medium text-white">
                Ласкаво просимо
              </h1>
              <p className="text-sm text-gray-400 text-center">
                Немає акаунта?{" "}
                <span className="text-indigo-400 cursor-pointer hover:underline transition-colors duration-200" onClick={toggleForm}>
                  Реєстрація
                </span>
              </p>

              {(error || formError) && (
                <div className="w-full p-3 bg-red-500/5 border border-red-500/10 rounded-lg text-red-400 text-sm text-center">
                  {formError || error}
                </div>
              )}

              <div className="w-full flex flex-col gap-3">
                <motion.div
                  className="w-full flex items-center gap-2 bg-white/5 p-3 rounded-lg border border-white/10"
                  whileFocus={{ borderColor: "#4f46e5", scale: 1.01 }}
                  whileHover={{ borderColor: "#4f46e5" }}
                  transition={{ duration: 0.2 }}
                >
                  <MdAlternateEmail className="text-indigo-400" />
                  <input
                    type="text"
                    placeholder="Ім'я користувача"
                    className="bg-transparent border-0 w-full outline-none text-sm"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </motion.div>

                <motion.div
                  className="w-full flex items-center gap-2 bg-white/5 p-3 rounded-lg border border-white/10 relative"
                  whileFocus={{ borderColor: "#4f46e5", scale: 1.01 }}
                  whileHover={{ borderColor: "#4f46e5" }}
                  transition={{ duration: 0.2 }}
                >
                  <FaFingerprint className="text-indigo-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Пароль"
                    className="bg-transparent border-0 w-full outline-none text-sm"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute right-3 cursor-pointer"
                    onClick={togglePasswordView}
                  >
                    {showPassword ? (
                      <FaRegEyeSlash className="text-gray-400" />
                    ) : (
                      <FaRegEye className="text-gray-400" />
                    )}
                  </motion.div>
                </motion.div>
              </div>

              <div className="w-full flex justify-end">
                <span className="text-sm text-indigo-400 cursor-pointer hover:underline transition-colors duration-200">Забули пароль?</span>
              </div>

              <motion.button
                type="submit"
                className="modern-button w-full text-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span>Зачекайте...</span>
                  </div>
                ) : (
                  "Увійти"
                )}
              </motion.button>
            </motion.form>
          ) : (
            <motion.form
              key="register"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="w-full flex flex-col items-center"
              onSubmit={handleSubmit}
            >
              <h1 className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                Створити акаунт
              </h1>
              <p className="text-xs md:text-sm text-gray-400 text-center mt-1">
                Є акаунт?{" "}
                <span className="text-blue-400 cursor-pointer hover:underline" onClick={toggleForm}>
                  Увійти
                </span>
              </p>

              {(error || formError) && (
                <div className="w-full mt-4 p-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm text-center">
                  {formError || error}
                </div>
              )}

              <div className="w-full flex flex-col gap-4 mt-6">
                <motion.div
                  className="w-full flex items-center gap-2 bg-gray-800/80 p-3 rounded-xl border border-gray-700"
                  whileFocus={{ borderColor: "#3b82f6", scale: 1.01 }}
                  whileHover={{ borderColor: "#3b82f6" }}
                  transition={{ duration: 0.2 }}
                >
                  <MdAlternateEmail className="text-blue-400" />
                  <input
                    type="text"
                    placeholder="Ім'я користувача"
                    className="bg-transparent border-0 w-full outline-none text-sm md:text-base"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                  />
                </motion.div>

                <motion.div
                  className="w-full flex items-center gap-2 bg-gray-800/80 p-3 rounded-xl border border-gray-700 relative"
                  whileFocus={{ borderColor: "#3b82f6", scale: 1.01 }}
                  whileHover={{ borderColor: "#3b82f6" }}
                  transition={{ duration: 0.2 }}
                >
                  <FaFingerprint className="text-blue-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Пароль"
                    className="bg-transparent border-0 w-full outline-none text-sm md:text-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="absolute right-3 cursor-pointer"
                    onClick={togglePasswordView}
                  >
                    {showPassword ? (
                      <FaRegEyeSlash className="text-gray-400" />
                    ) : (
                      <FaRegEye className="text-gray-400" />
                    )}
                  </motion.div>
                </motion.div>

                <motion.div
                  className="w-full flex items-center gap-2 bg-gray-800/80 p-3 rounded-xl border border-gray-700 relative"
                  whileFocus={{ borderColor: "#3b82f6", scale: 1.01 }}
                  whileHover={{ borderColor: "#3b82f6" }}
                  transition={{ duration: 0.2 }}
                >
                  <FaFingerprint className="text-blue-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Підтвердіть пароль"
                    className="bg-transparent border-0 w-full outline-none text-sm md:text-base"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </motion.div>
              </div>

              <motion.button
                type="submit"
                className="w-full p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl mt-6 text-sm md:text-base font-medium"
                whileHover={{ scale: 1.02, boxShadow: "0 0 10px rgba(59,130,246,0.5)" }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span>Зачекайте...</span>
                  </div>
                ) : (
                  "Зареєструватися"
                )}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="relative w-full flex items-center justify-center py-3">
          <div className="w-2/5 h-[1px] bg-white/10"></div>
          <h3 className="text-sm px-4 text-gray-400">Або</h3>
          <div className="w-2/5 h-[1px] bg-white/10"></div>
        </div>

        <div className="w-full flex items-center justify-between gap-3">
          <motion.div
            className="flex-1 py-2.5 px-4 bg-white/5 cursor-pointer rounded-lg flex items-center justify-center border border-white/10"
            whileHover={{ scale: 1.02, borderColor: "#4f46e5" }}
            whileTap={{ scale: 0.98 }}
          >
            <BsApple className="text-xl" />
          </motion.div>
          <motion.div
            className="flex-1 py-2.5 px-4 bg-white/5 cursor-pointer rounded-lg flex items-center justify-center border border-white/10"
            whileHover={{ scale: 1.02, borderColor: "#4f46e5" }}
            whileTap={{ scale: 0.98 }}
          >
            <img src="/google-icon.png" alt="google-icon" className="w-5" />
          </motion.div>
          <motion.div
            className="flex-1 py-2.5 px-4 bg-white/5 cursor-pointer rounded-lg flex items-center justify-center border border-white/10"
            whileHover={{ scale: 1.02, borderColor: "#4f46e5" }}
            whileTap={{ scale: 0.98 }}
          >
            <FaXTwitter className="text-xl" />
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}

export default Login

