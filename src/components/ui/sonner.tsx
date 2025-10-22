import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-gradient-to-br group-[.toaster]:from-card group-[.toaster]:to-card/95 group-[.toaster]:text-card-foreground group-[.toaster]:border-2 group-[.toaster]:border-border/50 group-[.toaster]:shadow-[0_8px_30px_rgb(0,0,0,0.12)] group-[.toaster]:rounded-2xl group-[.toaster]:p-4 group-[.toaster]:backdrop-blur-xl group-[.toaster]:transition-all group-[.toaster]:duration-300 group-[.toaster]:hover:shadow-[0_12px_40px_rgb(0,0,0,0.16)] group-[.toaster]:hover:scale-[1.02]",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm group-[.toast]:mt-1 group-[.toast]:leading-relaxed",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-xl group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:font-semibold group-[.toast]:shadow-lg group-[.toast]:transition-all group-[.toast]:hover:scale-105 group-[.toast]:hover:shadow-xl",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-xl group-[.toast]:px-4 group-[.toast]:py-2 group-[.toast]:font-medium group-[.toast]:transition-all group-[.toast]:hover:bg-muted/80",
          success: "group-[.toast]:border-emerald-500/40 group-[.toast]:bg-gradient-to-br group-[.toast]:from-emerald-500/15 group-[.toast]:to-emerald-500/5 group-[.toast]:shadow-[0_8px_30px_rgba(16,185,129,0.25)]",
          error: "group-[.toast]:border-red-500/40 group-[.toast]:bg-gradient-to-br group-[.toast]:from-red-500/15 group-[.toast]:to-red-500/5 group-[.toast]:shadow-[0_8px_30px_rgba(239,68,68,0.25)]",
          warning: "group-[.toast]:border-amber-500/40 group-[.toast]:bg-gradient-to-br group-[.toast]:from-amber-500/15 group-[.toast]:to-amber-500/5 group-[.toast]:shadow-[0_8px_30px_rgba(245,158,11,0.25)]",
          info: "group-[.toast]:border-blue-500/40 group-[.toast]:bg-gradient-to-br group-[.toast]:from-blue-500/15 group-[.toast]:to-blue-500/5 group-[.toast]:shadow-[0_8px_30px_rgba(59,130,246,0.25)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
