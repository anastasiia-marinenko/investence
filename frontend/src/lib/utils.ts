// Імпорти утиліт для умовного об'єднання та валідації Tailwind-класів
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Хелпер для безпечного компонування класів: поєднує аргументи через clsx
// та автоматично розв'язує конфлікти Tailwind (наприклад, p-4 p-2 → p-4)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}