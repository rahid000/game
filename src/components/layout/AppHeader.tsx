
"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Gamepad2, LogOut } from 'lucide-react';
import type { FC } from 'react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";

const AppHeader: FC = () => {
  const router = useRouter();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({
        title: "লগআউট সফল হয়েছে",
        description: "শীঘ্রই আবার দেখা হবে!",
      });
      router.push('/login');
    } catch (error) {
      console.error("Logout error: ", error);
      toast({
        variant: "destructive",
        title: "লগআউট ব্যর্থ হয়েছে",
        description: "লগআউট করার সময় একটি সমস্যা হয়েছে।",
      });
    }
  };

  return (
    <header className="py-4 px-6 bg-card shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2 cursor-pointer" aria-label="Go to homepage">
          <Gamepad2 className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-headline font-bold text-primary-foreground">
            Gamer's Launchpad
          </h1>
        </Link>
        <Button variant="ghost" onClick={handleLogout} aria-label="Logout">
          <LogOut className="mr-2 h-5 w-5" />
          লগআউট
        </Button>
      </div>
    </header>
  );
};

export default AppHeader;
