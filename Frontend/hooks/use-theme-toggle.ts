"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

export function useThemeToggle() {
    const { theme, setTheme, resolvedTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Avoid hydration mismatch by only showing theme after mount
    useEffect(() => {
        setMounted(true)
    }, [])

    const isDarkMode = mounted ? (resolvedTheme === "dark") : true

    const toggleTheme = () => {
        setTheme(isDarkMode ? "light" : "dark")
    }

    return {
        isDarkMode,
        toggleTheme,
        mounted,
        theme: mounted ? resolvedTheme : "dark",
        setTheme,
    }
}
