"use client";

import { createContext, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TabsContext = createContext();

export function Tabs({ children, defaultValue = "", className = "" }) {
  const [value, setValue] = useState(defaultValue);
  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={`w-full ${className}`}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({ children, className = "" }) {
  return (
    <div
      className={`flex items-center gap-2 overflow-x-auto pb-2 ${className}`}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  children,
  className = "",
  activeClassName = "",
  inactiveClassName = "",
}) {
  const { value: activeValue, setValue } = useContext(TabsContext);
  const isActive = activeValue === value;

  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setValue(value)}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500 ${
        isActive
          ? `bg-primary-600 text-white shadow-md ${activeClassName}`
          : `bg-gray-100 text-gray-700 hover:bg-gray-200 ${inactiveClassName}`
      } ${className}`}
    >
      {children}
      {isActive && (
        <motion.div
          layoutId="tabIndicator"
          className="h-0.5 bg-primary-400 mt-1"
          initial={false}
        />
      )}
    </button>
  );
}

export function TabsContent({
  value,
  children,
  className = "",
  unmountOnExit = true,
}) {
  const { value: activeValue } = useContext(TabsContext);
  const isActive = activeValue === value;

  if (unmountOnExit && !isActive) return null;

  return (
    <AnimatePresence mode="wait">
      {isActive && (
        <motion.div
          role="tabpanel"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className={`mt-4 ${className}`}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
