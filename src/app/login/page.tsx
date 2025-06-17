"use client";

import LoginForm from "@/components/auth/LoginForm";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        router.replace('/'); 
      }
      setIsLoading(false);
    });
    return () => unsubscribe(); 
  }, [router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-background to-slate-900">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg text-foreground">লোড হচ্ছে...</p>
      </main>
    );
  }

  // If user is defined (even after loading), it means they are logged in and redirect should occur.
  // Return null to prevent login form flashing.
  if (user) { 
      return null;
  }
  
  // If still loading or user is null (not logged in), show login form.
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-background to-slate-900">
      <title>লগইন - Gamer's Launchpad</title>
      <LoginForm />
    </main>
  );
}
