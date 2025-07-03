"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import Image from "next/image";

const fullWord = "CHALLENGE".split("");
const shortWord = "CHANGE".split("");

export default function AnimatedWordSequence() {
  const [phase, setPhase] = useState("wave");
  const [key, setKey] = useState(0);

  useEffect(() => {
    let timeout;
    if (phase === "wave") {
      timeout = setTimeout(() => setPhase("fadeOut"), 5000);
    } else if (phase === "fadeOut") {
      timeout = setTimeout(() => setPhase("cut"), 4000);
    } else if (phase === "cut") {
      timeout = setTimeout(() => {
        setPhase("wave");
        setKey((k) => k + 1);
      }, 4000);
    }
    return () => clearTimeout(timeout);
  }, [phase]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.4,
      },
    },
    exit: {
      opacity: 0,
      transition: { duration: 1.5, ease: "easeInOut" },
    },
  };

  const item = {
    hidden: { y: 50, opacity: 0 },
    show: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 80,
        damping: 12,
      },
    },
  };

  const shrink = {
    initial: { scale: 1, opacity: 1 },
    animate: { scale: 0.85, opacity: 0.7 },
    exit: {
      scale: 0.5,
      opacity: 0,
      y: -20,
      transition: { duration: 1 },
    },
  };

  const currentWord = phase === "cut" ? shortWord : fullWord;
  const isWave = phase === "wave";

  const testImage = ".../public/images/placeholder.svg";

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src={testImage} // Replace with your image path
          alt="Background"
          fill
          className="object-cover"
          priority
          quality={100}
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      </div>

      {/* Content Container */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full w-full px-4">
        <AnimatePresence mode="wait">
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
          >
            {/* Optional Subtitle */}
            <motion.p
              className="text-lg md:text-xl lg:text-2xl text-white/80 mb-8"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              Welcome to our creative space
            </motion.p>

            {/* Main Animated Word */}
            <motion.h1
              key={key + phase}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-tight mb-6 flex flex-wrap justify-center text-white"
              variants={container}
              initial="hidden"
              animate="show"
              exit="exit"
            >
              {currentWord.map((char, i) => (
                <motion.span
                  key={i + char}
                  variants={isWave ? item : undefined}
                  initial={phase === "cut" ? "initial" : undefined}
                  animate={phase === "cut" ? "animate" : undefined}
                  exit={phase === "cut" ? "exit" : undefined}
                  {...(phase === "cut" ? shrink : {})}
                  className="mx-1"
                >
                  {char}
                </motion.span>
              ))}
            </motion.h1>

            {/* Optional CTA Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
            >
              <button className="px-8 py-3 bg-white text-black rounded-full font-medium hover:bg-white/90 transition-colors mt-8">
                Explore More
              </button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
