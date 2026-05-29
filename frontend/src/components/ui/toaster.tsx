// Імпорти хука для доступу до черги сповіщень та UI-компонентів тостів
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

// Кореневий компонент для відображення всіх активних сповіщень
export function Toaster() {
  // Отримуємо масив тостів із глобального стану
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {/* Рендеринг кожного тосту з черги: заголовок, опис, дія, кнопка закриття */}
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      {/* Контейнер для позиціонування тостів у вікні (зазвичай правий нижній кут) */}
      <ToastViewport />
    </ToastProvider>
  )
}