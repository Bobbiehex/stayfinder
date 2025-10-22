import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props} className="border-2 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_12px_40px_rgb(0,0,0,0.16)] hover:scale-[1.02]">
            <div className="grid gap-1">
              {title && <ToastTitle className="font-semibold text-base">{title}</ToastTitle>}
              {description && <ToastDescription className="mt-1 leading-relaxed">{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
