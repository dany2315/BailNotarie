"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Page d'inscription temporairement désactivée
export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger automatiquement vers la page d'accueil
    router.push("/");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center">
        <p className="text-muted-foreground">Redirection en cours...</p>
      </div>
    </div>
  );
}

/* 
// Code commenté - Page d'inscription temporairement désactivée

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { signUp, useSession } from "@/lib/auth-client";

const registerSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  confirmPassword: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  role: z.enum(["ADMINISTRATEUR", "NOTAIRE", "OPERATEUR", "REVIEWER"]).default("OPERATEUR"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<RegisterFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    role: "OPERATEUR",
  });

  // Rediriger vers l'interface si l'utilisateur est déjà connecté
  useEffect(() => {
    if (session && !isPending) {
      router.push("/interface");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return <div>Chargement...</div>;
  }

  if (session) {
    return null; // Retourner null pendant la redirection
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validation avec Zod
      const result = registerSchema.safeParse(formData);
      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        toast.error(errors.email?.[0] || errors.password?.[0] || errors.confirmPassword?.[0] || errors.name?.[0] || errors.role?.[0] || "Erreur de validation");
        setIsLoading(false);
        return;
      }

      // Utiliser Better Auth pour créer l'utilisateur
      const { data, error } = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      if (error) {
        toast.error("Erreur lors de l'inscription", {
          description: error.message || "Une erreur est survenue",
        });
        setIsLoading(false);
        return;
      }

      // Mettre à jour le rôle via l'API si nécessaire
      if (data?.user?.id && formData.role !== "OPERATEUR") {
        try {
          const roleResponse = await fetch("/api/auth/update-role", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId: data.user.id,
              role: formData.role,
            }),
          });

          if (!roleResponse.ok) {
            console.warn("Impossible de mettre à jour le rôle, mais l'utilisateur a été créé");
          }
        } catch (roleError) {
          console.warn("Erreur lors de la mise à jour du rôle:", roleError);
        }
      }

      toast.success("Compte créé avec succès!");
      router.push("/login");
    } catch (error: any) {
      toast.error("Une erreur est survenue", {
        description: error.message || "Erreur lors de l'inscription",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Créer un compte</CardTitle>
          <CardDescription>
            Créez un compte pour accéder à l'interface
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jean Dupont"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isLoading}
                required
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isLoading}
                required
                className="h-12 text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <Select
                value={formData.role}
                onValueChange={(value) => setFormData({ ...formData, role: value as any })}
                disabled={isLoading}
              >
                <SelectTrigger className="h-12 text-base">
                  <SelectValue placeholder="Sélectionner un rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMINISTRATEUR">Administrateur</SelectItem>
                  <SelectItem value="NOTAIRE">Notaire</SelectItem>
                  <SelectItem value="OPERATEUR">Opérateur</SelectItem>
                  <SelectItem value="REVIEWER">Reviseur</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  disabled={isLoading}
                  required
                  className="h-12 pr-10 text-base"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute right-0 top-0 h-12 w-12 px-0"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  disabled={isLoading}
                  required
                  className="h-12 pr-10 text-base"
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="absolute right-0 top-0 h-12 w-12 px-0"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full h-12" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Inscription...
                </>
              ) : (
                "Créer un compte"
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm">
            <span className="text-muted-foreground">Déjà un compte ? </span>
            <Link href="/login" className="text-primary hover:underline">
              Se connecter
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
*/


