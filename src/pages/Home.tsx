"use client"

import { motion } from "framer-motion"
import { Link } from "react-router-dom"

const Home = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center px-4">
      <motion.h1
        className="text-3xl md:text-5xl font-medium text-white mb-4 leading-tight"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        Створюйте та проходьте тести
      </motion.h1>

      <motion.p
        className="text-gray-400 max-w-xl mb-8 text-sm md:text-base leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Наша платформа дозволяє легко створювати інтерактивні тести та ділитися ними з іншими. Проходьте тести, створені
        спільнотою, або створюйте свої власні.
      </motion.p>

      <motion.div
        className="modern-card p-5 max-w-xl mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h3 className="text-lg font-medium text-white mb-2">✨ Потужність штучного інтелекту</h3>
        <p className="text-gray-400 text-sm leading-relaxed">
          Наша платформа автоматично використовує передові технології штучного інтелекту для генерації варіантів
          відповідей, що робить створення тестів швидким та ефективним. Просто введіть ваше питання, і система
          автоматично згенерує релевантні варіанти відповідей.
        </p>
      </motion.div>

      <div className="flex flex-col md:flex-row gap-3 w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex-1"
        >
          <Link to="/take-test">
            <motion.button
              className="modern-button w-full"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Пройти тест
            </motion.button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex-1"
        >
          <Link to="/create-test">
            <motion.button
              className="w-full px-6 py-2.5 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg text-sm font-medium transition-all duration-200 hover:border-indigo-500 hover:bg-white/10"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Створити тест
            </motion.button>
          </Link>
        </motion.div>
      </div>

      <motion.div
        className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
      >
        <div className="modern-card p-4">
          <h3 className="text-base font-medium text-white mb-2">Створюйте</h3>
          <p className="text-gray-400 text-sm">Легко создавайте тести з різними типами питань</p>
        </div>

        <div className="modern-card p-4">
          <h3 className="text-base font-medium text-white mb-2">Діліться</h3>
          <p className="text-gray-400 text-sm">Ділитесь своїми тестами з друзями або колегами</p>
        </div>

        <div className="modern-card p-4">
          <h3 className="text-base font-medium text-white mb-2">Аналізуйте</h3>
          <p className="text-gray-400 text-sm">Отримуйте статистику та результати проходження тестів</p>
        </div>
      </motion.div>
    </div>
  )
}

export default Home

