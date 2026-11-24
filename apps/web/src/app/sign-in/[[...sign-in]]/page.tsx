import AuthForm from '@/components/auth/auth-form'

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center gap-8 bg-background px-5 py-16 text-foreground md:p-20">
      <p className="text-sm leading-5 font-medium text-primary">
        LES COCOTTES DE DIANE
      </p>
      <AuthForm />
      <p className="w-full max-w-[440px] text-xs leading-[17px] text-muted-foreground">
        Espace réservé à l’équipe · connexion sécurisée
      </p>
    </main>
  )
}
