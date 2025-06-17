
"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import AppHeader from '@/components/layout/AppHeader';
import { Loader2 } from 'lucide-react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';

const ADMIN_EMAIL = "easywish000@gmail.com";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        if (currentUser.email === ADMIN_EMAIL) {
          setIsAdmin(true);
        } else {
          setIsAdmin(false);
        }
      } else {
        setUser(null);
        setIsAdmin(false);
        router.replace('/login');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">লোড হচ্ছে...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-12">
          <h2 className="text-6xl font-headline font-extrabold text-primary-foreground mb-2">
            Hello
          </h2>
        </div>

        <div className="flex flex-col items-center">
          <Link
            href="/submission"
            className="inline-block p-0 rounded-full shadow-lg hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-primary focus:ring-opacity-50 transition-all duration-300 ease-in-out transform hover:scale-105"
            aria-label="তথ্য জমা দিন"
          >
            <Image
              src="https://play-lh.googleusercontent.com/sKh_B4ZLfu0jzqx9z98b2APe2rxDb8dIW-QqFHyS3cpzDK2Qq8tAbRAz3rXzOFtdAw"
              alt="Free Fire Game Logo"
              width={150}
              height={150}
              className="rounded-full object-cover"
              priority
            />
          </Link>
          <p className="mt-8 text-sm text-muted-foreground max-w-md">
            আমাদের কাছে আপনি সুরক্ষিত এবং কোনো প্রতারণা হবেন না আমরা নিজ থেকে আপনার আইডি সুরক্ষা দিবো
          </p>
        </div>
        
        {isAdmin && (
          <div className="mt-12">
            <Button asChild variant="outline" size="lg">
              <Link href="/admin">অ্যাডমিন কন্ট্রোল প্যানেল</Link>
            </Button>
          </div>
        )}
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground">
        লগুর উপর টিপি দেন
      </footer>
    </div>
  );
}
