import { Button } from "@/components/ui/button";
import { AlertTriangle, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function NotFoundPage() {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 space-y-6">
            <div className="bg-destructive/10 p-6 rounded-full">
                <AlertTriangle className="w-16 h-16 text-destructive" />
            </div>

            <div className="space-y-2">
                <h1 className="text-4xl font-bold tracking-tight">Página no encontrada</h1>
                <p className="text-muted-foreground text-lg max-w-md mx-auto">
                    La ruta a la que intentas acceder no existe o ha sido movida.
                </p>
            </div>

            <div className="flex gap-4">
                <Button
                    variant="outline"
                    onClick={() => window.history.back()}
                >
                    Volver atrás
                </Button>
                <Button
                    onClick={() => navigate("/dashboard")}
                    className="gap-2"
                >
                    <Home className="w-4 h-4" />
                    Ir al Inicio
                </Button>
            </div>
        </div>
    );
}
