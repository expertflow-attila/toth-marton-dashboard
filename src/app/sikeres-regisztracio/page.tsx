import Link from "next/link";
import { CheckCircle } from "lucide-react";

export default function SuccessPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="mb-8">
          <h1 className="font-serif text-3xl tracking-tight text-foreground">
            Expert Flow
          </h1>
        </div>

        {/* Card */}
        <div className="rounded-[var(--radius)] border border-border bg-card p-8 shadow-sm">
          <div className="flex justify-center">
            <CheckCircle className="h-16 w-16 text-success" />
          </div>

          <h2 className="mt-6 text-xl font-semibold text-card-foreground">
            Sikeres regisztráció!
          </h2>

          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Visszaigazoló e-mailt küldtünk a megadott e-mail címre. Kérjük,
            erősítsd meg a regisztrációdat az e-mailben található linkre
            kattintva.
          </p>

          <Link
            href="/"
            className="mt-8 inline-block w-full rounded-[var(--radius)] bg-primary py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Vissza a bejelentkezéshez
          </Link>
        </div>
      </div>
    </div>
  );
}
